import { Router } from "express";
import { SubCategoryController } from "./SubCategoryController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const subCategoryController = new SubCategoryController();
// Public
router.get("/", subCategoryController.getSubCategories);
router.get("/:id", subCategoryController.getSubCategoryById);
// Admin-only
router.post("/", authMiddleware, adminMiddleware, subCategoryController.createSubCategory);
router.put("/:id", authMiddleware, adminMiddleware, subCategoryController.updateSubCategory);
router.delete("/:id", authMiddleware, adminMiddleware, subCategoryController.deleteSubCategory);
export default router;
