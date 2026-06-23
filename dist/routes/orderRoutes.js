import { Router } from "express";
import { OrderController } from "../controllers/OrderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = Router();
const orderController = new OrderController();
router.post("/", authMiddleware, orderController.createOrder);
router.get("/", authMiddleware, orderController.getOrderHistory);
export default router;
