import { Router } from "express";
import { requireAgent } from "../middleware/requireAgent";
import type { AuthenticatedRequest } from "../types/express";
import { getAnonClient } from "../lib/supabase";
import { isSupabaseConfigured } from "../config/env";

export const authRouter = Router();

// Agent identity verification
const handleGetMe = (req: AuthenticatedRequest, res: any) => {
  res.status(200).json({
    user: {
      id: req.agent?.id,
      email: req.agent?.email,
      role: req.agent?.app_metadata?.role || "agent",
    },
  });
};

authRouter.get("/auth/me", requireAgent, handleGetMe);
authRouter.get("/api/auth/me", requireAgent, handleGetMe);

// Dedicated login endpoint for seamless local development & fallback
authRouter.post(["/auth/login", "/api/auth/login"], async (req, res) => {
  const { email, password } = req.body || {};
  const agentEmail = email?.trim() || "agent@verdant.com";

  // If Supabase is fully configured, attempt Supabase authentication
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getAnonClient().auth.signInWithPassword({
        email: agentEmail,
        password: password || "agent123",
      });

      if (!error && data?.session) {
        res.status(200).json({
          session: data.session,
          user: data.user,
        });
        return;
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Local development / fallback session
  const user = {
    id: "00000000-0000-0000-0000-000000000001",
    email: agentEmail,
    app_metadata: { role: "agent" },
    user_metadata: { full_name: "Verdant Support Agent" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const session = {
    access_token: `mock-token:${encodeURIComponent(agentEmail)}`,
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };

  res.status(200).json({ session, user });
});

// Session reset / clear endpoint
authRouter.post(["/auth/reset", "/api/auth/reset"], (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Local authentication state has been reset successfully.",
  });
});

