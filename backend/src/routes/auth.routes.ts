import { Router } from "express";
import { requireAgent } from "../middleware/requireAgent";
import type { AuthenticatedRequest } from "../types/express";

export const authRouter = Router();

authRouter.get("/auth/me", requireAgent, (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    user: {
      id: req.agent?.id,
      email: req.agent?.email,
    },
  });
});
