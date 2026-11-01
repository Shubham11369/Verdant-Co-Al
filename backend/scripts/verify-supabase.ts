import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../src/config/env";

const EXPECTED_TABLES = [
  "profiles",
  "customers",
  "conversations",
  "messages",
  "ai_drafts",
  "webhook_events",
] as const;

export async function verifySupabaseDatabase(): Promise<{
  connected: boolean;
  projectUrl: string;
  missingTables: string[];
  existingTables: string[];
  details: Record<string, string>;
}> {
  if (!isSupabaseConfigured() || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return {
      connected: false,
      projectUrl: env.supabaseUrl || "Not configured",
      missingTables: [...EXPECTED_TABLES],
      existingTables: [],
      details: { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing." },
    };
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingTables: string[] = [];
  const missingTables: string[] = [];
  const details: Record<string, string> = {};

  for (const table of EXPECTED_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("count").limit(1);
      if (error) {
        missingTables.push(table);
        details[table] = error.message;
      } else {
        existingTables.push(table);
        details[table] = `Ready (Rows: ${data?.length ?? 0})`;
      }
    } catch (err) {
      missingTables.push(table);
      details[table] = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    connected: true,
    projectUrl: env.supabaseUrl,
    existingTables,
    missingTables,
    details,
  };
}

async function run() {
  console.log("=== SUPABASE DATABASE TABLE VERIFICATION ===");
  const result = await verifySupabaseDatabase();
  console.log(`Project URL: ${result.projectUrl}`);
  console.log(`Connected: ${result.connected}`);
  console.log(`Existing Tables (${result.existingTables.length}):`, result.existingTables);
  console.log(`Missing Tables (${result.missingTables.length}):`, result.missingTables);
  console.log("\nDetails by table:");
  for (const [table, status] of Object.entries(result.details)) {
    console.log(` - ${table}: ${status}`);
  }

  if (result.missingTables.length === 0) {
    console.log("\n✅ ALL 6 TABLES ARE CREATED AND VERIFIED IN SUPABASE!");
  } else {
    console.log(`\n⚠️  ${result.missingTables.length} tables need to be created in Supabase.`);
  }
}

if (require.main === module) {
  void run();
}
