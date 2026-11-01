import { Router } from "express";
import {
  handleWebhook,
  getWebhookConfig,
  testSignWebhook,
} from "../controllers/webhook.controller";

export const webhookRouter = Router();

// Mount at both root /webhook and /api/webhook for flexibility
webhookRouter.post("/webhook", handleWebhook);
webhookRouter.post("/api/webhook", handleWebhook);

// Test tools helpers
webhookRouter.get("/api/webhook/config", getWebhookConfig);
webhookRouter.post("/api/webhook/test-sign", testSignWebhook);
