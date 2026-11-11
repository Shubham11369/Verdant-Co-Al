import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const STORAGE_KEY = "verdant_agent_auth_session";

function getStoredMockSession(): Session | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.access_token) {
      return parsed as Session;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveStoredMockSession(session: Session | null): void {
  try {
    if (typeof window === "undefined") return;
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function resetLocalAuth(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
    }
  } catch {
    // Ignore
  }
}

function createMockSupabaseClient(): SupabaseClient {
  console.info(
    "[Auth] Running in local mock auth mode with persistent localStorage session.",
  );

  let currentSession: Session | null = getStoredMockSession();
  const listeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();

  const notify = (event: AuthChangeEvent, session: Session | null) => {
    for (const listener of listeners) {
      try {
        listener(event, session);
      } catch (e) {
        console.warn("[Auth Listener Error]", e);
      }
    }
  };

  return {
    auth: {
      getSession: async () => ({
        data: { session: currentSession },
        error: null,
      }),
      onAuthStateChange: (
        callback: (event: AuthChangeEvent, session: Session | null) => void,
      ) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      signInWithPassword: async ({
        email,
        password: _password,
      }: {
        email: string;
        password: string;
      }) => {
        const agentEmail = email?.trim() || "agent@verdant.com";

        const user: User = {
          id: "00000000-0000-0000-0000-000000000001",
          email: agentEmail,
          app_metadata: { role: "agent" },
          user_metadata: { full_name: "Verdant Support Agent" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };

        const session: Session = {
          access_token: `mock-token:${encodeURIComponent(agentEmail)}`,
          refresh_token: "mock-refresh-token",
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: "bearer",
          user,
        };

        currentSession = session;
        saveStoredMockSession(currentSession);
        notify("SIGNED_IN", currentSession);

        return {
          data: { user, session },
          error: null,
        };
      },
      signUp: async ({
        email,
        password: _password,
      }: {
        email: string;
        password: string;
      }) => {
        const agentEmail = email?.trim() || "agent@verdant.com";

        const user: User = {
          id: "00000000-0000-0000-0000-000000000001",
          email: agentEmail,
          app_metadata: { role: "agent" },
          user_metadata: { full_name: "Verdant Support Agent" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };

        const session: Session = {
          access_token: `mock-token:${encodeURIComponent(agentEmail)}`,
          refresh_token: "mock-refresh-token",
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: "bearer",
          user,
        };

        currentSession = session;
        saveStoredMockSession(currentSession);
        notify("SIGNED_IN", currentSession);

        return {
          data: { user, session },
          error: null,
        };
      },
      signOut: async () => {
        currentSession = null;
        saveStoredMockSession(null);
        notify("SIGNED_OUT", null);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
}

export const isMockAuth = !supabaseUrl || !supabaseAnonKey;

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockSupabaseClient();

