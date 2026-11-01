import { Router } from "express";
import { requireAgent } from "../middleware/requireAgent";

export const authRouter = Router();

authRouter.get("/auth/me", requireAgent, (req, res) => {
  res.status(200).json({
    user: {
      id: req.agent?.id,
      email: req.agent?.email,
    },
  });
});
