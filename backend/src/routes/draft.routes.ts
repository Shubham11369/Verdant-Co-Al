import { Router } from "express";
import { requireAgent } from "../middleware/requireAgent";
import {
  getDraftById,
  updateDraft,
  approveDraft,
  rejectDraft,
  retryDraft,
  generateDraftForMessage,
} from "../controllers/draft.controller";

const router = Router();

// All draft review actions require authenticated Agent or Admin credentials
router.use(requireAgent);

router.get("/:id", getDraftById);
router.put("/:id", updateDraft);
router.post("/:id/approve", approveDraft);
router.post("/:id/reject", rejectDraft);
router.post("/:id/retry", retryDraft);
router.post("/generate/:messageId", generateDraftForMessage);

export default router;
