import { Response, NextFunction } from "express";
import { WalletRepository } from "./WalletRepository.js";
import { AuthenticatedRequest } from "../auth/authMiddleware.js";
import { TransactionType } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { z } from "zod";

const walletRepository = new WalletRepository();

export class WalletController {
  async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const wallet = await walletRepository.findByUserId(req.user.id);
      if (!wallet) {
        res.status(404).json({ error: "Wallet not found" });
        return;
      }
      res.status(200).json(wallet);
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const transactions = await walletRepository.findTransactionsByUserId(req.user.id);
      res.status(200).json(transactions);
    } catch (error) {
      next(error);
    }
  }

  async deposit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const depositSchema = z.object({
        amount: z.preprocess((val) => parseFloat(val as string), z.number().positive("Deposit amount must be positive")),
      });

      const { amount } = depositSchema.parse(req.body);

      const updatedWallet = await walletRepository.updateBalanceAndPoints(
        req.user.id,
        amount,
        0,
        TransactionType.CREDIT,
        "Wallet deposit (Simulated Payment)"
      );

      res.status(200).json({
        message: "Deposit successful",
        wallet: updatedWallet,
      });
    } catch (error) {
      next(error);
    }
  }

  async getIncomeLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const logs = await prisma.incomeLog.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async requestWithdrawal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const schema = z.object({
        amount: z.preprocess((v) => parseFloat(v as string), z.number().positive()),
      });
      const { amount } = schema.parse(req.body);

      // Check sufficient balance. Funds are NOT debited until an admin
      // approves the request, so we must also reserve any amounts that are
      // already locked up in other PENDING withdrawal requests to prevent
      // the user from requesting more than they actually have.
      const wallet = await walletRepository.findByUserId(req.user.id);
      if (!wallet) {
        res.status(400).json({ error: "Wallet not found" });
        return;
      }
      const pendingAgg = await prisma.withdrawal.aggregate({
        where: { userId: req.user.id, status: "PENDING" },
        _sum: { amount: true },
      });
      const pendingTotal = pendingAgg._sum.amount || 0;
      if (wallet.balance - pendingTotal < amount) {
        res.status(400).json({ error: "Insufficient wallet balance" });
        return;
      }

      // Fetch bank details + KYC status
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { holderName: true, bankName: true, accountNumber: true, ifscCode: true, kycStatus: true },
      });
      if (user?.kycStatus !== "APPROVED") {
        res.status(403).json({ error: "Your KYC must be approved before you can request a withdrawal." });
        return;
      }
      if (!user?.accountNumber) {
        res.status(400).json({ error: "Please add your bank details in Profile before requesting a withdrawal." });
        return;
      }

      // NOTE: the wallet is intentionally NOT debited here. The balance is
      // only deducted once an admin approves the request (see
      // AdminController.updateWithdrawal). Until then the funds remain in the
      // wallet but are reserved by the pending-balance check above.

      // Create withdrawal record
      const withdrawal = await prisma.withdrawal.create({
        data: {
          userId: req.user.id,
          amount,
          bankDetails: {
            holderName: user.holderName,
            bankName: user.bankName,
            accountNumber: user.accountNumber,
            ifscCode: user.ifscCode,
          },
          status: "PENDING",
        },
      });

      res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const withdrawals = await prisma.withdrawal.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json(withdrawals);
    } catch (error) {
      next(error);
    }
  }
}
