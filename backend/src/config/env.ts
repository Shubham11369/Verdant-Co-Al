import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    typeof value === "string" && value.trim() === "" ? undefined : value,
  ]),
);

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  WEBHOOK_SECRET: z.string().default("verdant_webhook_secret_dev_2026_key"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.parse(rawEnv);

export const env = {
  port: 3000,
  nodeEnv: parsed.NODE_ENV,
  frontendUrl: parsed.FRONTEND_URL,
  hasExplicitFrontendUrl: Boolean(rawEnv.FRONTEND_URL),
  webhookSecret: parsed.WEBHOOK_SECRET,
  geminiApiKey: parsed.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  geminiModel: parsed.GEMINI_MODEL,
  supabaseUrl: parsed.SUPABASE_URL,
  supabaseAnonKey: parsed.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey,
  );
}
