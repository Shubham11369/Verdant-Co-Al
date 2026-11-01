import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function createMockSupabaseClient(): SupabaseClient {
  console.warn(
    "Supabase env vars are missing. Using in-memory mock auth session.",
  );

  let currentSession: Session | null = null;
  const listeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();

  const notify = (event: AuthChangeEvent, session: Session | null) => {
    for (const listener of listeners) {
      listener(event, session);
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
        password,
      }: {
        email: string;
        password: string;
      }) => {
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: "Email and password are required." },
          };
        }

        const user: User = {
          id: "00000000-0000-0000-0000-000000000001",
          email,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };

        const session: Session = {
          access_token: `mock-token:${encodeURIComponent(email)}`,
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user,
        };

        currentSession = session;
        notify("SIGNED_IN", currentSession);

        return {
          data: { user, session },
          error: null,
        };
      },
      signOut: async () => {
        currentSession = null;
        notify("SIGNED_OUT", null);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockSupabaseClient();
