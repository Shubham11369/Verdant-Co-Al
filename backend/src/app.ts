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

// Frontend static serving (if frontend is built alongside backend)
const candidatePaths = [
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist"),
  path.resolve(__dirname, "../../frontend/dist"),
  path.resolve(__dirname, "../../../frontend/dist"),
];
const frontendDistPath = candidatePaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
}

// API & Webhook Routes
app.use(webhookRouter);
app.use(conversationRouter);
app.use(healthRouter);
app.use(authRouter);
app.use("/api/drafts", draftRouter);
app.use("/api/customer", customerRouter);
app.use("/api/llm", llmRouter);

// Root & SPA fallback routing (Express 5 compatible)
app.use((req, res, next) => {
  // Only handle GET requests for SPA/HTML fallback
  if (req.method !== "GET") {
    next();
    return;
  }
  // If it's an API route or webhook that wasn't matched above, proceed to 404
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/health") ||
    req.path.startsWith("/auth") ||
    req.path === "/webhook"
  ) {
    next();
    return;
  }

  // 1. If the compiled React frontend exists, serve index.html (SPA UI)
  if (frontendDistPath && fs.existsSync(path.join(frontendDistPath, "index.html"))) {
    res.sendFile(path.join(frontendDistPath, "index.html"));
    return;
  }

  // 2. If client requests JSON, return structured API status
  if (!req.accepts("html") || req.query.format === "json") {
    res.status(200).json({
      status: "ok",
      service: "verdant-ai-support-backend",
      version: "1.0.0",
      message: "Verdant AI Support Backend API is operational.",
      endpoints: {
        health: "/api/health",
        webhook: "/webhook",
        conversations: "/api/conversations",
      },
    });
    return;
  }

  // 3. For browsers visiting backend URL directly, render a clear status portal
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verdant AI Support - Backend API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fafaf9;
      color: #1c1917;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 16px;
      padding: 36px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }
    .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
    h1 { margin: 16px 0 8px 0; font-size: 22px; font-weight: 700; color: #064e3b; }
    p { margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #57534e; }
    .box {
      background: #f5f5f4;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
      border-left: 4px solid #10b981;
    }
    .links { display: flex; flex-direction: column; gap: 8px; }
    a.btn {
      display: block;
      text-align: center;
      background: #059669;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.15s;
    }
    a.btn:hover { background: #047857; }
    a.link {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      color: #1c1917;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    a.link:hover { background: #f5f5f4; }
    .status-ok { color: #059669; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> Backend API Operational</div>
    <h1>Verdant &amp; Co. AI Support Backend</h1>
    <p>This Vercel service is the <strong>Backend REST API</strong>. It handles webhook ingestion, database queries, and Google Gemini AI draft generation.</p>
    
    <div class="box">
      <strong>Where is the User Interface?</strong><br>
      The UI (Agent Review Dashboard &amp; Customer Chat) runs on your <strong>Frontend Vercel Project</strong>.<br>
      Open your Frontend project deployment in Vercel to use the UI!
    </div>

    <div class="links">
      <a class="link" href="/api/health">
        <span>Test Server Health Check</span>
        <span class="status-ok">/api/health &rarr;</span>
      </a>
      <a class="link" href="/api/webhook/config">
        <span>View Webhook Test Config</span>
        <span class="status-ok">/api/webhook/config &rarr;</span>
      </a>
      <a class="link" href="/?format=json">
        <span>View Raw JSON Response</span>
        <span class="status-ok">/?format=json &rarr;</span>
      </a>
    </div>
  </div>
</body>
</html>`);
});
