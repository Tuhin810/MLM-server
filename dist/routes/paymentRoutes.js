import { Router } from "express";
import { PaymentController } from "../controllers/PaymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = Router();
const paymentController = new PaymentController();
router.post("/orders", authMiddleware, paymentController.createOrder);
router.post("/verify", authMiddleware, paymentController.verifyPayment);
export default router;
