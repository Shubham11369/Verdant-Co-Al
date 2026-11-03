import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../backend/src/app";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // If Vercel rewrote the URL to /api, restore the original request path from headers
  const headers = req.headers || {};
  const originalUrl =
    (headers["x-matched-path"] as string) ||
    (headers["x-forwarded-uri"] as string) ||
    (headers["x-real-path"] as string) ||
    req.url;

  if (originalUrl && req.url === "/api" && originalUrl !== "/api") {
    req.url = originalUrl;
  }

  return app(req as any, res as any);
}
