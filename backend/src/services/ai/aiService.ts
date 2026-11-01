import { dbService } from "../db.service";
import { geminiProvider } from "./geminiProvider";
import type { AIDraft, Message } from "../../types/database";

export class AIService {
  /**
   * Generates a pending AI draft for a received customer message.
   * Supports configurable multi-LLM engine selection.
   * AI draft status MUST always be saved as 'pending'.
   * AI MUST NEVER APPROVE OR SEND A REPLY AUTOMATICALLY.
   */
  async generateDraftForMessage(
    messageId: string,
    existingDraftId?: string,
    engineId?: string,
  ): Promise<AIDraft> {
    const message = await dbService.findMessageById(messageId);
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    if (message.sender_type !== "customer") {
      throw new Error("Cannot generate AI reply for agent-sent messages");
    }

    // Fetch conversation and customer for contextual grounding
    const conversation = await dbService.getConversationById(message.conversation_id);
    const customer = conversation?.customer;

    // Build conversation history (previous messages excluding current)
    const priorMessages = (conversation?.messages || [])
      .filter((m) => m.id !== messageId)
      .map((m) => ({
        sender: m.sender_type,
        text: m.message_text,
      }));

    console.log(
      `[AIService] Generating draft for message ${messageId} with engine ${
        engineId || geminiProvider.getActiveEngine()
      } (customer: ${customer?.name || "Unknown"})`,
    );

    // Call Multi-Engine LLM Provider
    const result = await geminiProvider.generateDraft(
      {
        customerName: customer?.name,
        customerPhone: customer?.phone || undefined,
        messageText: message.message_text,
        conversationHistory: priorMessages,
      },
      engineId,
    );

    // Check if a draft record already exists
    let draft = existingDraftId
      ? await dbService.getAIDraftById(existingDraftId)
      : await dbService.getAIDraftByMessageId(messageId);

    if (draft) {
      const updated = await dbService.updateAIDraft(draft.id, {
        draft_text: result.draftText,
        status: "pending", // ALWAYS PENDING - REQUIRES HUMAN AGENT APPROVAL
        error_message: null,
      });
      return updated || draft;
    }

    // Otherwise insert new pending draft
    return await dbService.insertAIDraft(messageId, result.draftText);
  }

  /**
   * Retry generating an AI draft for an existing draft ID with optional engine selection.
   */
  async retryDraft(draftId: string, engineId?: string): Promise<AIDraft> {
    const draft = await dbService.getAIDraftById(draftId);
    if (!draft) {
      throw new Error(`Draft with ID ${draftId} not found`);
    }

    return await this.generateDraftForMessage(draft.message_id, draft.id, engineId);
  }

  /**
   * Edit a draft's text before approving.
   */
  async updateDraftText(draftId: string, text: string): Promise<AIDraft> {
    const draft = await dbService.getAIDraftById(draftId);
    if (!draft) {
      throw new Error(`Draft with ID ${draftId} not found`);
    }

    const updated = await dbService.updateAIDraft(draftId, {
      draft_text: text,
    });

    if (!updated) {
      throw new Error("Failed to update draft text");
    }

    return updated;
  }

  /**
   * Human Agent approves the draft -> creates official agent reply message.
   */
  async approveDraft(
    draftId: string,
    agentUserId?: string,
    finalText?: string,
  ): Promise<{ draft: AIDraft; message: Message }> {
    return await dbService.approveDraft(draftId, agentUserId, finalText);
  }

  /**
   * Human Agent rejects the draft.
   */
  async rejectDraft(draftId: string): Promise<AIDraft> {
    return await dbService.rejectDraft(draftId);
  }
}

export const aiService = new AIService();
