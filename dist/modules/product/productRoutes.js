import { Router } from "express";
import { ProductController } from "./ProductController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const productController = new ProductController();
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);
// Admin-only endpoints
router.post("/", authMiddleware, adminMiddleware, productController.createProduct);
router.put("/:id", authMiddleware, adminMiddleware, productController.updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, productController.deleteProduct);
export default router;
