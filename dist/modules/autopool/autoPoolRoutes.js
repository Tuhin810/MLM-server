import { Router } from "express";
import { AutoPoolController } from "./AutoPoolController.js";
import { authMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const autoPoolController = new AutoPoolController();
router.post("/join", authMiddleware, autoPoolController.join);
router.get("/tree", authMiddleware, autoPoolController.getTree);
router.get("/income", authMiddleware, autoPoolController.getIncome);
export default router;
