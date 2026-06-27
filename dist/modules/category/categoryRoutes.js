import { Router } from "express";
import { CategoryController } from "./CategoryController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const categoryController = new CategoryController();
// Public
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
// Admin-only
router.post("/", authMiddleware, adminMiddleware, categoryController.createCategory);
router.put("/:id", authMiddleware, adminMiddleware, categoryController.updateCategory);
router.delete("/:id", authMiddleware, adminMiddleware, categoryController.deleteCategory);
export default router;
