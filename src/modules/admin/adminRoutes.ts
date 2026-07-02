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

// KYC management
router.get("/kyc", authMiddleware as any, adminMiddleware as any, adminController.getKycRequests);
router.patch("/kyc/:userId", authMiddleware as any, adminMiddleware as any, adminController.updateKycStatus);

// Package management
router.get("/packages", authMiddleware as any, adminMiddleware as any, adminController.getPackages);
router.post("/packages", authMiddleware as any, adminMiddleware as any, adminController.createPackage);
router.put("/packages/:id", authMiddleware as any, adminMiddleware as any, adminController.updatePackage);
router.delete("/packages/:id", authMiddleware as any, adminMiddleware as any, adminController.deletePackage);

// Referral system management
router.get("/referrals/stats", authMiddleware as any, adminMiddleware as any, adminController.getReferralStats);
router.get("/referrals/users", authMiddleware as any, adminMiddleware as any, adminController.getReferralUsers);
router.get("/referrals/tree/:userId", authMiddleware as any, adminMiddleware as any, adminController.getReferralTree);

// Enquiry management
router.get("/enquiries", authMiddleware as any, adminMiddleware as any, adminController.getEnquiries);
router.post("/enquiries/:id/messages", authMiddleware as any, adminMiddleware as any, adminController.sendAdminMessage);
router.patch("/enquiries/:id/status", authMiddleware as any, adminMiddleware as any, adminController.updateEnquiryStatus);

// Franchise management
router.post("/franchises", authMiddleware as any, adminMiddleware as any, adminController.createFranchise);
router.get("/franchises", authMiddleware as any, adminMiddleware as any, adminController.getFranchises);
router.get("/franchises/:id", authMiddleware as any, adminMiddleware as any, adminController.getFranchiseById);
router.put("/franchises/:id", authMiddleware as any, adminMiddleware as any, adminController.updateFranchise);
router.delete("/franchises/:id", authMiddleware as any, adminMiddleware as any, adminController.deleteFranchise);

export default router;
