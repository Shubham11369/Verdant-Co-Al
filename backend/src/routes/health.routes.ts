import { Router } from "express";
import { isSupabaseConfigured } from "../config/env";
import { getServiceClient } from "../lib/supabase";

export const healthRouter = Router();

const healthHandler = async (_req: any, res: any) => {
  let database: "connected" | "not_configured" | "error" = "not_configured";
  let databaseError: string | undefined;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await getServiceClient()
        .from("conversations")
        .select("id")
        .limit(1);

      if (error) {
        database = "error";
        databaseError = error.message;
      } else {
        database = "connected";
      }
    } catch (err) {
      database = "error";
      databaseError = err instanceof Error ? err.message : "Database fetch failed";
    }
  }

  res.status(200).json({
    status: "ok",
    service: "verdant-ai-support-backend",
    timestamp: new Date().toISOString(),
    database,
    ...(databaseError ? { databaseError } : {}),
  });
};

healthRouter.get("/health", healthHandler);
healthRouter.get("/api/health", healthHandler);

healthRouter.get("/api/database/status", async (_req: any, res: any) => {
  const tables = ["profiles", "customers", "conversations", "messages", "ai_drafts", "webhook_events"];
  const status: Record<string, { exists: boolean; detail: string }> = {};

  if (!isSupabaseConfigured()) {
    res.status(200).json({
      configured: false,
      message: "Supabase credentials are not configured",
    });
    return;
  }

  const client = getServiceClient();
  let existingCount = 0;

  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).select("count").limit(1);
      if (error) {
        status[table] = { exists: false, detail: error.message };
      } else {
        existingCount++;
        status[table] = { exists: true, detail: `Ready (${data?.length ?? 0} rows cached)` };
      }
    } catch (e) {
      status[table] = { exists: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  res.status(200).json({
    configured: true,
    allTablesCreated: existingCount === tables.length,
    existingCount,
    totalExpected: tables.length,
    tables: status,
  });
});
