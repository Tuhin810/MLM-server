import { Router } from "express";
import { AutoPoolController } from "./AutoPoolController.js";
import { authMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const autoPoolController = new AutoPoolController();

router.post("/join", authMiddleware as any, autoPoolController.join);
router.get("/tree", authMiddleware as any, autoPoolController.getTree);
router.get("/income", authMiddleware as any, autoPoolController.getIncome);

export default router;
