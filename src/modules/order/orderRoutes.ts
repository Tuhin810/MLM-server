import { Router } from "express";
import { OrderController } from "./OrderController.js";
import { authMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const orderController = new OrderController();

router.post("/", authMiddleware as any, orderController.createOrder);
router.get("/", authMiddleware as any, orderController.getOrderHistory);

export default router;
