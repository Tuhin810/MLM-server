import { Router } from "express";
import { ProductController } from "./ProductController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const productController = new ProductController();

router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// Admin-only endpoints
router.post("/", authMiddleware as any, adminMiddleware as any, productController.createProduct);
router.put("/:id", authMiddleware as any, adminMiddleware as any, productController.updateProduct);
router.delete("/:id", authMiddleware as any, adminMiddleware as any, productController.deleteProduct);

export default router;
