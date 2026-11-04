import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/env";

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

function createChainableQuery(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: any) => resolve({ data: [], error: null, count: 0 });
      }
      return (..._args: any[]) => new Proxy(() => {}, handler);
    },
    apply() {
      return new Proxy(() => {}, handler);
    },
  };
  return new Proxy(() => {}, handler);
}

const mockServiceClient = {
  from: () => createChainableQuery(),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
  },
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
    return mockServiceClient;
  }

  try {
    serviceClient ??= createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return serviceClient;
  } catch (err) {
    console.warn("[Supabase] Failed to initialize service client, using fallback:", err);
    return mockServiceClient;
  }
}

export function getAnonClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return mockAnonClient;
  }

  try {
    anonClient ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return anonClient;
  } catch (err) {
    console.warn("[Supabase] Failed to initialize anon client, using fallback:", err);
    return mockAnonClient;
  }
}
