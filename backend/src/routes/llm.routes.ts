import { Router } from "express";
import {
  getLLMEngines,
  setDefaultEngine,
  testGenerate,
} from "../controllers/llm.controller";

const router = Router();

router.get("/engines", getLLMEngines);
router.post("/engines/set-default", setDefaultEngine);
router.post("/test-generate", testGenerate);

export default router;
