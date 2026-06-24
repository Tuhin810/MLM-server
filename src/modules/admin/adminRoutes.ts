import { Router } from "express";
import { AdminController } from "./AdminController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const adminController = new AdminController();

// All routes here are admin protected
router.get("/dashboard", authMiddleware as any, adminMiddleware as any, adminController.getDashboard);
router.get("/users", authMiddleware as any, adminMiddleware as any, adminController.getUsers);
router.get("/users/:userId/details", authMiddleware as any, adminMiddleware as any, adminController.getUserDetails);
router.put("/users/:userId/status", authMiddleware as any, adminMiddleware as any, adminController.updateUserStatus);
router.get("/income-logs", authMiddleware as any, adminMiddleware as any, adminController.getIncomeLogs);
router.get("/transactions", authMiddleware as any, adminMiddleware as any, adminController.getTransactions);

// Withdrawal management
router.get("/withdrawals", authMiddleware as any, adminMiddleware as any, adminController.getWithdrawals);
router.patch("/withdrawals/:id", authMiddleware as any, adminMiddleware as any, adminController.updateWithdrawal);

// Package management
router.get("/packages", authMiddleware as any, adminMiddleware as any, adminController.getPackages);
router.post("/packages", authMiddleware as any, adminMiddleware as any, adminController.createPackage);
router.put("/packages/:id", authMiddleware as any, adminMiddleware as any, adminController.updatePackage);
router.delete("/packages/:id", authMiddleware as any, adminMiddleware as any, adminController.deletePackage);

export default router;
