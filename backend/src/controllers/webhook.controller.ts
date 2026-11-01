import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/express";
import { env } from "../config/env";
import { verifyWebhookSignature, generateWebhookSignature } from "../utils/signature";
import { WebhookPayloadSchema } from "../utils/validators";
import { dbService } from "../services/db.service";
import { aiService } from "../services/ai/aiService";

/**
 * POST /webhook & POST /api/webhook
 * Receives external customer messages with HMAC-SHA256 signature verification.
 */
export async function handleWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const signatureHeader =
    (req.headers["x-signature"] as string | undefined) ||
    (req.headers["X-Signature"] as string | undefined);

  // 1. Verify HMAC-SHA256 signature against exact raw bytes
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");
  const signatureResult = verifyWebhookSignature(
    rawBody,
    signatureHeader,
    env.webhookSecret,
  );

  if (!signatureResult.valid) {
    console.log(`[Webhook] Signature verification rejected: ${signatureResult.reason}`);
    res.status(401).json({
      error: "Unauthorized",
      message: signatureResult.reason || "Invalid or missing X-Signature header",
    });
    return;
  }

  // 2. Validate payload using Zod schema
  const parseResult = WebhookPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");

    console.warn(`[Webhook] Invalid payload format: ${errorDetails}`);

    if (req.body?.event_id && typeof req.body.event_id === "string") {
      await dbService.recordWebhookEvent(req.body.event_id, "failed", errorDetails);
    }

    res.status(400).json({
      error: "Bad Request",
      message: "Malformed webhook payload",
      details: errorDetails,
    });
    return;
  }

  const payload = parseResult.data;

  try {
    // 3. Idempotency Check on event_id
    const existingEvent = await dbService.findWebhookEvent(payload.event_id);
    if (existingEvent && existingEvent.processing_status === "processed") {
      console.log(`[Webhook] Duplicate event received: ${payload.event_id}`);
      res.status(200).json({
        status: "duplicate",
        message: "Event already processed",
        event_id: payload.event_id,
      });
      return;
    }

    // Record initial event state
    await dbService.recordWebhookEvent(payload.event_id, "received");

    // 4. Idempotency Check on message.id
    const existingMessage = await dbService.findMessageByExternalId(payload.message.id);
    if (existingMessage) {
      console.log(`[Webhook] Duplicate message ID received: ${payload.message.id}`);
      await dbService.recordWebhookEvent(
        payload.event_id,
        "duplicate",
        "Duplicate message ID",
      );
      res.status(200).json({
        status: "duplicate",
        message: "Message already exists in conversation",
        message_id: existingMessage.id,
        event_id: payload.event_id,
      });
      return;
    }

    // 5. Upsert Customer details
    const customer = await dbService.upsertCustomer(
      payload.customer.id,
      payload.customer.name,
      payload.customer.phone,
    );

    // 6. Find or create single open conversation for customer
    const conversation = await dbService.findOrCreateOpenConversation(customer.id);

    // 7. Persist customer message
    const message = await dbService.insertMessage(
      conversation.id,
      "customer",
      payload.message.text,
      payload.message.id,
    );

    // 8. Generate policy-compliant AI draft (saved as 'pending', strictly for human review)
    let draftId: string;
    try {
      const draft = await aiService.generateDraftForMessage(message.id);
      draftId = draft.id;
    } catch (aiErr) {
      console.warn(`[Webhook] AI draft generation fallback for message ${message.id}:`, aiErr);
      const fallbackDraft = await dbService.insertAIDraft(message.id, null);
      draftId = fallbackDraft.id;
    }

    // 9. Mark webhook event as processed
    await dbService.recordWebhookEvent(payload.event_id, "processed");

    console.log(
      `[Webhook] Successfully processed event ${payload.event_id} for customer ${customer.name} (conv: ${conversation.id})`,
    );

    res.status(200).json({
      status: "success",
      event_id: payload.event_id,
      conversation_id: conversation.id,
      message_id: message.id,
      draft_id: draftId,
      customer: {
        id: customer.id,
        external_id: customer.external_customer_id,
        name: customer.name,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Internal database processing error";
    console.error(`[Webhook] Processing error for event ${payload.event_id}:`, error);

    await dbService.recordWebhookEvent(payload.event_id, "failed", errorMsg);

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to persist incoming webhook message",
      event_id: payload.event_id,
    });
  }
}

/**
 * GET /api/webhook/config
 * Returns current webhook configuration for testing tools.
 */
export function getWebhookConfig(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    configured_secret: env.webhookSecret,
  });
}

/**
 * POST /api/webhook/test-sign
 * Computes a valid HMAC-SHA256 signature for test tooling.
 */
export function testSignWebhook(req: Request, res: Response): void {
  const body = (req.body as Record<string, any>) || {};
  const { payload, secret } = body;
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  const signingSecret = secret || env.webhookSecret;
  const signature = generateWebhookSignature(raw, signingSecret);
  res.json({
    status: "ok",
    signature,
  });
}
