import type { Request, Response } from "express";
import { z } from "zod";
import { geminiProvider, AVAILABLE_LLM_ENGINES } from "../services/ai/geminiProvider";

const SetDefaultEngineSchema = z.object({
  engine: z.string().min(1, "Engine ID is required"),
});

const TestPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  engine: z.string().optional(),
  customer_name: z.string().optional(),
});

/**
 * GET /api/llm/engines
 * Lists all available LLM engines, latency expectations, and currently active engine.
 */
export async function getLLMEngines(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      status: "success",
      active_engine: geminiProvider.getActiveEngine(),
      engines: AVAILABLE_LLM_ENGINES,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list LLM engines", message: err.message });
  }
}

/**
 * POST /api/llm/engines/set-default
 * Updates the active default LLM engine used for incoming customer inquiries.
 */
export async function setDefaultEngine(req: Request, res: Response): Promise<void> {
  const parseResult = SetDefaultEngineSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Bad Request",
      message: "Invalid engine selection",
      details: parseResult.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  const { engine } = parseResult.data;
  const match = AVAILABLE_LLM_ENGINES.find((e) => e.id === engine);

  if (!match) {
    res.status(400).json({
      error: "Invalid Engine",
      message: `Engine "${engine}" is not in the list of supported LLM engines.`,
      available_engines: AVAILABLE_LLM_ENGINES.map((e) => e.id),
    });
    return;
  }

  geminiProvider.setActiveEngine(engine);

  res.status(200).json({
    status: "success",
    message: `Default LLM engine updated to ${match.name}`,
    active_engine: geminiProvider.getActiveEngine(),
  });
}

/**
 * POST /api/llm/test-generate
 * Direct sandbox endpoint to test any engine with custom customer prompts.
 */
export async function testGenerate(req: Request, res: Response): Promise<void> {
  const parseResult = TestPromptSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Bad Request",
      details: parseResult.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  const { prompt, engine, customer_name } = parseResult.data;
  const startTime = Date.now();

  try {
    const result = await geminiProvider.generateDraft(
      {
        customerName: customer_name || "Customer",
        messageText: prompt,
      },
      engine,
    );

    const latencyMs = Date.now() - startTime;

    res.status(200).json({
      status: "success",
      engine: result.model,
      policy_category: result.policyCategory,
      is_escalated: result.isEscalated,
      latency_ms: latencyMs,
      draft_text: result.draftText,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Generation Failed",
      message: err.message,
    });
  }
}
