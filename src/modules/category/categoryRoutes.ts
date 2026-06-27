import { Router } from "express";
import { CategoryController } from "./CategoryController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const categoryController = new CategoryController();

// Public
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);

// Admin-only
router.post("/", authMiddleware as any, adminMiddleware as any, categoryController.createCategory);
router.put("/:id", authMiddleware as any, adminMiddleware as any, categoryController.updateCategory);
router.delete("/:id", authMiddleware as any, adminMiddleware as any, categoryController.deleteCategory);

export default router;
