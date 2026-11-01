import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/env";

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

const mockServiceClient = {
  from: () => ({
    select: () => ({
      limit: async () => ({ data: [], error: null }),
    }),
  }),
} as unknown as SupabaseClient;

const mockAnonClient = {
  auth: {
    getUser: async (token?: string) => {
      if (token && token.startsWith("mock-token:")) {
        const email = decodeURIComponent(token.slice("mock-token:".length));
        return {
          data: {
            user: {
              id: "00000000-0000-0000-0000-000000000001",
              email,
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
            },
          },
          error: null,
        };
      }
      return {
        data: { user: null },
        error: new Error("Invalid or expired session"),
      };
    },
  },
} as unknown as SupabaseClient;

export function getServiceClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    console.warn("[AI Studio] Supabase not configured — using mock service client");
    return mockServiceClient;
  }

  serviceClient ??= createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return serviceClient;
}

export function getAnonClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.warn("[AI Studio] Supabase not configured — using mock anon client");
    return mockAnonClient;
  }

  anonClient ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return anonClient;
}
