import { Router } from "express";
import { handleWebhook } from "../controllers/webhook.controller";

export const webhookRouter = Router();

// Mount at both root /webhook and /api/webhook for flexibility
webhookRouter.post("/webhook", handleWebhook);
webhookRouter.post("/api/webhook", handleWebhook);
