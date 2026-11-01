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
  const matched = req.headers["x-matched-path"];
  if (typeof matched === "string" && matched && !matched.endsWith("/api/index") && !matched.endsWith("/api")) {
    req.url = matched;
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

// Root welcome & status endpoint (ensures testing https://<backend-url>/ in browser confirms backend is up)
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "verdant-ai-support-backend",
    version: "1.0.0",
    message: "Verdant AI Support Backend API is operational.",
    health: "/api/health",
    webhook: "/webhook",
  });
});

// API & Webhook Routes
app.use(webhookRouter);
app.use(conversationRouter);
app.use(healthRouter);
app.use(authRouter);
app.use("/api/drafts", draftRouter);
app.use("/api/customer", customerRouter);
app.use("/api/llm", llmRouter);

// Frontend static fallback for single-project or container hosting
const candidatePaths = [
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist"),
  path.resolve(__dirname, "../../frontend/dist"),
  path.resolve(__dirname, "../../../frontend/dist"),
];
const frontendDistPath = candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0];

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/auth") ||
      req.path === "/webhook"
    ) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}
