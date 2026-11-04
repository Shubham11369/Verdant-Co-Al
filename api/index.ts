import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../backend/src/app";

// Export Express app directly for Vercel's native serverless adapter
export default app;

// Compatibility handler
export function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
