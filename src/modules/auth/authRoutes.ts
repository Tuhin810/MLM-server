import { Router } from "express";
import { AuthController } from "./AuthController.js";
import { authMiddleware } from "./authMiddleware.js";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/send-otp", authController.sendOtp);
router.post("/forgot-password/reset", authController.forgotPasswordReset);
router.get("/profile", authMiddleware as any, authController.getProfile);
router.put("/profile", authMiddleware as any, authController.updateProfile);
router.post("/profile/kyc", authMiddleware as any, authController.updateKyc);
router.post("/profile/bank", authMiddleware as any, authController.updateBankDetails);
router.post("/profile/addresses", authMiddleware as any, authController.addAddress);
router.delete("/profile/addresses/:id", authMiddleware as any, authController.deleteAddress);
router.put("/profile/addresses/:id/default", authMiddleware as any, authController.setDefaultAddress);
router.get("/profile/referral-tree", authMiddleware as any, authController.getReferralTree);

export default router;
