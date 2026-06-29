import { Router } from "express";
import { AdminController } from "./AdminController.js";
import { authMiddleware, adminMiddleware } from "../auth/authMiddleware.js";
const router = Router();
const adminController = new AdminController();
// All routes here are admin protected
router.get("/dashboard", authMiddleware, adminMiddleware, adminController.getDashboard);
router.get("/users", authMiddleware, adminMiddleware, adminController.getUsers);
router.get("/users/:userId/details", authMiddleware, adminMiddleware, adminController.getUserDetails);
router.put("/users/:userId/status", authMiddleware, adminMiddleware, adminController.updateUserStatus);
router.get("/income-logs", authMiddleware, adminMiddleware, adminController.getIncomeLogs);
router.get("/transactions", authMiddleware, adminMiddleware, adminController.getTransactions);
// Withdrawal management
router.get("/withdrawals", authMiddleware, adminMiddleware, adminController.getWithdrawals);
router.patch("/withdrawals/:id", authMiddleware, adminMiddleware, adminController.updateWithdrawal);
// KYC management
router.get("/kyc", authMiddleware, adminMiddleware, adminController.getKycRequests);
router.patch("/kyc/:userId", authMiddleware, adminMiddleware, adminController.updateKycStatus);
// Package management
router.get("/packages", authMiddleware, adminMiddleware, adminController.getPackages);
router.post("/packages", authMiddleware, adminMiddleware, adminController.createPackage);
router.put("/packages/:id", authMiddleware, adminMiddleware, adminController.updatePackage);
router.delete("/packages/:id", authMiddleware, adminMiddleware, adminController.deletePackage);
// Referral system management
router.get("/referrals/stats", authMiddleware, adminMiddleware, adminController.getReferralStats);
router.get("/referrals/users", authMiddleware, adminMiddleware, adminController.getReferralUsers);
router.get("/referrals/tree/:userId", authMiddleware, adminMiddleware, adminController.getReferralTree);
// Enquiry management
router.get("/enquiries", authMiddleware, adminMiddleware, adminController.getEnquiries);
router.post("/enquiries/:id/messages", authMiddleware, adminMiddleware, adminController.sendAdminMessage);
router.patch("/enquiries/:id/status", authMiddleware, adminMiddleware, adminController.updateEnquiryStatus);
export default router;
