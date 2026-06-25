import { Response, NextFunction } from "express";
import { AdminService } from "./AdminService.js";
import { AuthenticatedRequest } from "../auth/authMiddleware.js";
import { prisma } from "../../config/db.js";
import { z } from "zod";

const adminService = new AdminService();

export class AdminController {
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await adminService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async getUserDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const details = await adminService.getUserDetails(req.params.userId as string);
      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const updatedUser = await adminService.updateUserStatus(req.params.userId as string, status);
      res.status(200).json({
        message: `User status updated to ${status}`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getIncomeLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await adminService.getAllIncomeLogs();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const txs = await adminService.getAllTransactions();
      res.status(200).json(txs);
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const withdrawals = await prisma.withdrawal.findMany({
        include: { user: { select: { name: true, email: true, mobile: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json(withdrawals);
    } catch (error) {
      next(error);
    }
  }

  async updateWithdrawal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({ status: z.enum(["APPROVED", "REJECTED", "SETTLED"]) });
      const { status } = schema.parse(req.body);
      const withdrawal = await prisma.withdrawal.update({
        where: { id: req.params.id as string },
        data: { status },
      });
      // If rejected, refund the wallet
      if (status === "REJECTED") {
        const { WalletRepository } = await import("../wallet/WalletRepository.js");
        const walletRepo = new WalletRepository();
        await walletRepo.updateBalanceAndPoints(
          withdrawal.userId, withdrawal.amount, 0, "CREDIT" as any, `Withdrawal #${withdrawal.id.slice(-6)} rejected — refunded`
        );
      }
      res.status(200).json({ message: `Withdrawal ${status.toLowerCase()}`, withdrawal });
    } catch (error) {
      next(error);
    }
  }

  async getPackages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const packages = await prisma.package.findMany({ orderBy: { price: "asc" } });
      res.status(200).json(packages);
    } catch (error) {
      next(error);
    }
  }

  async createPackage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        name: z.string(),
        price: z.number(),
        pointValue: z.number(),
        benefits: z.array(z.string()),
      });
      const data = schema.parse(req.body);
      const pkg = await prisma.package.create({ data });
      res.status(201).json(pkg);
    } catch (error) {
      next(error);
    }
  }

  async updatePackage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        name: z.string().optional(),
        price: z.number().optional(),
        pointValue: z.number().optional(),
        benefits: z.array(z.string()).optional(),
        status: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const pkg = await prisma.package.update({
        where: { id: req.params.id as string },
        data,
      });
      res.status(200).json(pkg);
    } catch (error) {
      next(error);
    }
  }

  async deletePackage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await prisma.userPackage.deleteMany({ where: { packageId: id } });
      await prisma.package.delete({ where: { id } });
      res.status(200).json({ message: "Package deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getReferralStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getReferralStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getReferralUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await adminService.getReferralUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async getReferralTree(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const tree = await adminService.getReferralTree(userId as string);
      res.status(200).json(tree);
    } catch (error) {
      next(error);
    }
  }
}
