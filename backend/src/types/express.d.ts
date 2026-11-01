import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      agent?: User;
      profile?: {
        id: string;
        role: "admin" | "agent";
        full_name?: string | null;
      };
      rawBody?: Buffer;
    }
  }
}

export {};
