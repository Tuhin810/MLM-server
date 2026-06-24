import { Router } from "express";
import { WalletController } from "./WalletController.js";
import { authMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const walletController = new WalletController();

router.get("/", authMiddleware as any, walletController.getWallet);
router.get("/transactions", authMiddleware as any, walletController.getTransactions);
router.post("/deposit", authMiddleware as any, walletController.deposit);
router.get("/income-logs", authMiddleware as any, walletController.getIncomeLogs);
router.post("/withdraw", authMiddleware as any, walletController.requestWithdrawal);
router.get("/withdrawals", authMiddleware as any, walletController.getWithdrawals);

export default router;
