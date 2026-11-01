import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { conversationRouter } from "./routes/conversation.routes";
import draftRouter from "./routes/draft.routes";
import customerRouter from "./routes/customer.routes";
import llmRouter from "./routes/llm.routes";

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
  }),
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

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

// API & Webhook Routes
app.use(webhookRouter);
app.use(conversationRouter);
app.use(healthRouter);
app.use(authRouter);
app.use("/api/drafts", draftRouter);
app.use("/api/customer", customerRouter);
app.use("/api/llm", llmRouter);

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
      req.path.startsWith("/auth")
    ) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}
