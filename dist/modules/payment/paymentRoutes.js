import { Router } from "express";
import { PaymentController } from "./PaymentController.js";
import { authMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const paymentController = new PaymentController();
router.post("/orders", authMiddleware, paymentController.createOrder);
router.post("/verify", authMiddleware, paymentController.verifyPayment);
export default router;
