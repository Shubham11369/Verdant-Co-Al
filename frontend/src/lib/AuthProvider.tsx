import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase, resetLocalAuth, isMockAuth } from "./supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isMockAuth: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; message?: string | null }>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isMockAuth,
      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            return { error: error.message };
          }
          if (data?.session) {
            setSession(data.session);
          }
          return { error: null };
        } catch (err: any) {
          return { error: err?.message || "Failed to sign in" };
        }
      },
      signUp: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                typeof window !== "undefined" ? window.location.origin : undefined,
            },
          });
          if (error) {
            return { error: error.message };
          }
          if (data?.session) {
            setSession(data.session);
          }
          if (!data.session) {
            return {
              error: null,
              message:
                "Account created! Please check your email to confirm, or auto-confirm in Supabase dashboard.",
            };
          }
          return { error: null };
        } catch (err: any) {
          return { error: err?.message || "Failed to create account" };
        }
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          setSession(null);
        }
      },
      resetAuth: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore
        }
        resetLocalAuth();
        setSession(null);
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
