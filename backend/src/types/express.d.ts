import type { User } from "@supabase/supabase-js";
import type { Request } from "express";

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

declare module "express-serve-static-core" {
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

declare module "express" {
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

export interface AuthenticatedRequest extends Request {
  agent?: User;
  profile?: {
    id: string;
    role: "admin" | "agent";
    full_name?: string | null;
  };
  rawBody?: Buffer;
}

export {};
