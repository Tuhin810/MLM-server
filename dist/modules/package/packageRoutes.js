import { Router } from "express";
import { prisma } from "../../config/db.js";
import { authMiddleware } from "../auth/authMiddleware.js";
const router = Router();
// Public: list all active packages
router.get("/", async (req, res, next) => {
    try {
        const packages = await prisma.package.findMany({
            where: { status: "ACTIVE" },
            orderBy: { price: "asc" },
        });
        res.json(packages);
    }
    catch (e) {
        next(e);
    }
});
// Authenticated: subscribe to a package (debit wallet, create UserPackage)
router.post("/:id/subscribe", authMiddleware, async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
        if (!pkg) {
            res.status(404).json({ error: "Package not found" });
            return;
        }
        // Check already subscribed
        const existing = await prisma.userPackage.findFirst({ where: { userId: req.user.id, packageId: pkg.id } });
        if (existing) {
            res.status(400).json({ error: "Already subscribed to this package" });
            return;
        }
        // Debit wallet
        const { WalletRepository } = await import("../wallet/WalletRepository.js");
        const walletRepo = new WalletRepository();
        const wallet = await walletRepo.findByUserId(req.user.id);
        if (!wallet || wallet.balance < pkg.price) {
            res.status(400).json({ error: "Insufficient wallet balance" });
            return;
        }
        await walletRepo.updateBalanceAndPoints(req.user.id, -pkg.price, pkg.pointValue, "DEBIT", `Package subscription: ${pkg.name}`);
        const userPkg = await prisma.userPackage.create({ data: { userId: req.user.id, packageId: pkg.id } });
        res.status(201).json({ message: "Subscription successful", userPackage: userPkg });
    }
    catch (e) {
        next(e);
    }
});
// Authenticated: get my subscribed packages
router.get("/my", authMiddleware, async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const mine = await prisma.userPackage.findMany({
            where: { userId: req.user.id },
            include: { package: true },
            orderBy: { createdAt: "desc" },
        });
        res.json(mine);
    }
    catch (e) {
        next(e);
    }
});
export default router;
