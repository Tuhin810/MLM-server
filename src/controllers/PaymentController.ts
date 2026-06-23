import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { TransactionType } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

export class PaymentController {
  // 1. Create Razorpay Order
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: "Invalid deposit amount" });
        return;
      }

      const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.status(201).json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Verify Payment & Credit Wallet
  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: "Missing verification parameters" });
        return;
      }

      // Check signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
        .update(body.toString())
        .digest("hex");

      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
        res.status(400).json({ error: "Invalid payment signature" });
        return;
      }

      const creditAmount = parseFloat(amount);
      const userId = req.user.id;

      // Update wallet balance & create transaction logs
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: creditAmount } }
        });

        await tx.user.update({
          where: { id: userId },
          data: { walletBalance: { increment: creditAmount } }
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            amount: creditAmount,
            type: TransactionType.CREDIT,
            description: `Deposited funds via Razorpay (Payment ID: ${razorpay_payment_id})`,
          }
        });
      });

      res.status(200).json({ status: "SUCCESS", message: "Payment verified and wallet credited" });
    } catch (error) {
      next(error);
    }
  }
}
