import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { conversationRouter } from "./routes/conversation.routes";
import draftRouter from "./routes/draft.routes";
import customerRouter from "./routes/customer.routes";
import llmRouter from "./routes/llm.routes";

export const app = express();

// Security headers with full cross-origin and embedding permissions
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
  }),
);

// Comprehensive CORS & Preflight handling for Vercel separated deployments
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Signature, x-signature, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Vercel serverless rewrite path normalization
app.use((req, _res, next) => {
  const candidate =
    req.headers["x-matched-path"] ||
    req.headers["x-forwarded-url"] ||
    req.headers["x-forwarded-uri"] ||
    req.headers["x-real-path"];

  if (typeof candidate === "string" && candidate) {
    if (
      !candidate.endsWith("/api/index") &&
      candidate !== "/api" &&
      !candidate.includes(":path")
    ) {
      req.url = candidate;
    }
  }
  next();
});

// Capture raw body Buffer for HMAC-SHA256 signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Graceful malformed JSON handler
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: "Bad Request",
      message: "Malformed JSON payload in request body",
    });
    return;
  }
  next(err);
});

// Frontend static serving with dynamic path resolution
function getFrontendDistPath(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(__dirname, "../../frontend/dist"),
    path.resolve(__dirname, "../../../frontend/dist"),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      return p;
    }
  }
  return null;
}

// Serve static assets from React frontend build
app.use((req, res, next) => {
  const dist = getFrontendDistPath();
  if (dist) {
    return express.static(dist)(req, res, next);
  }
  next();
});

// API & Webhook Routes
app.use(webhookRouter);
app.use(conversationRouter);
app.use(healthRouter);
app.use(authRouter);
app.use("/api/drafts", draftRouter);
app.use("/api/customer", customerRouter);
app.use("/api/llm", llmRouter);

// SPA fallback: Serve React UI index.html for all page routes
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  // Pass unmatched API routes to standard 404
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/health") ||
    req.path.startsWith("/auth") ||
    req.path === "/webhook"
  ) {
    next();
    return;
  }

  const dist = getFrontendDistPath();
  if (dist && fs.existsSync(path.join(dist, "index.html"))) {
    res.sendFile(path.join(dist, "index.html"));
    return;
  }

  // If dist is compiling or not yet present
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verdant &amp; Co. Support</title>
  <meta http-equiv="refresh" content="3">
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafaf9; }
    .box { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="box">
    <h2>Initializing Verdant &amp; Co. Support...</h2>
    <p>Compiling frontend assets. This page will automatically refresh in 3 seconds.</p>
  </div>
</body>
</html>`);
});

// 404 handler for unmatched API & webhook routes
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/health") ||
    req.path === "/webhook"
  ) {
    res.status(404).json({
      error: "Not Found",
      message: `Endpoint ${req.method} ${req.originalUrl || req.url} not found`,
    });
    return;
  }
  next();
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Express Server Error]", err);
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err?.name || "Internal Server Error",
    message: err?.message || "An unexpected error occurred",
    path: req.originalUrl || req.url,
  });
});

