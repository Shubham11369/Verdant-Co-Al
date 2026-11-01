import type { Request, Response } from "express";
import { z } from "zod";
import { aiService } from "../services/ai/aiService";
import { dbService } from "../services/db.service";

const UpdateDraftSchema = z.object({
  draft_text: z.string().min(1, "Draft text cannot be empty"),
});

const ApproveDraftSchema = z.object({
  draft_text: z.string().optional(),
});

/**
 * PUT /api/drafts/:id
 * Allows an agent to edit the AI-generated draft before approval.
 */
export async function updateDraft(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  const parseResult = UpdateDraftSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Bad Request",
      message: "Invalid draft update payload",
      details: parseResult.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const updated = await aiService.updateDraftText(id, parseResult.data.draft_text);
    res.status(200).json({
      status: "success",
      message: "Draft updated successfully",
      draft: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update draft";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: "Draft Update Failed", message });
  }
}

/**
 * POST /api/drafts/:id/approve
 * Human Agent approves the draft -> changes status to 'approved' and publishes agent message.
 * AI MUST NEVER APPROVE OR SEND AUTOMATICALLY.
 */
export async function approveDraft(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const agentUserId = (req as any).user?.id;

  const parseResult = ApproveDraftSchema.safeParse(req.body);
  const customText = parseResult.success ? parseResult.data.draft_text : undefined;

  try {
    const { draft, message } = await aiService.approveDraft(id, agentUserId, customText);

    res.status(200).json({
      status: "success",
      message: "Draft approved and message sent to customer",
      draft,
      published_message: message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve draft";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: "Approval Failed", message });
  }
}

/**
 * POST /api/drafts/:id/reject
 * Human Agent rejects the AI draft.
 */
export async function rejectDraft(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const draft = await aiService.rejectDraft(id);
    res.status(200).json({
      status: "success",
      message: "Draft rejected",
      draft,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject draft";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: "Rejection Failed", message });
  }
}

/**
 * POST /api/drafts/:id/retry
 * Re-triggers AI generation with Gemini using knowledge base policies.
 */
export async function retryDraft(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const requestedEngine =
    (typeof req.body?.engine === "string" ? req.body.engine : undefined) ||
    (typeof req.query?.engine === "string" ? String(req.query.engine) : undefined);

  try {
    const draft = await aiService.retryDraft(id, requestedEngine);
    res.status(200).json({
      status: "success",
      message: "AI draft regenerated successfully",
      draft,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to regenerate AI draft";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: "Retry Failed", message });
  }
}

/**
 * GET /api/drafts/:id
 * Fetches single draft details.
 */
export async function getDraftById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const draft = await dbService.getAIDraftById(id);
    if (!draft) {
      res.status(404).json({ error: "Not Found", message: `Draft with ID ${id} not found` });
      return;
    }

    res.status(200).json({
      status: "success",
      draft,
    });
  } catch (err) {
    res.status(500).json({ error: "Server Error", message: "Failed to fetch draft" });
  }
}
