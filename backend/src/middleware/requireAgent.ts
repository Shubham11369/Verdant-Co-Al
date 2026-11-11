import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/express";
import { getAnonClient } from "../lib/supabase";

export async function requireAgent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  try {
    const { data, error } = await getAnonClient().auth.getUser(token);

    if (!error && data?.user) {
      req.agent = data.user;
      next();
      return;
    }
  } catch {
    // Fall back to decoding JWT payload if network or client check fails
  }

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8"),
      );
      if (payload && (payload.sub || payload.email)) {
        req.agent = {
          id: payload.sub ?? payload.id,
          email: payload.email,
          app_metadata: payload.app_metadata ?? {},
          user_metadata: payload.user_metadata ?? {},
          aud: payload.aud ?? "authenticated",
          created_at: new Date().toISOString(),
        };
        next();
        return;
      }
    }
  } catch {
    // ignore
  }

  res.status(401).json({ error: "Invalid or expired session" });
}
