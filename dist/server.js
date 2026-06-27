import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/authRoutes.js";
import productRoutes from "./modules/product/productRoutes.js";
import orderRoutes from "./modules/order/orderRoutes.js";
import walletRoutes from "./modules/wallet/walletRoutes.js";
import autoPoolRoutes from "./modules/autopool/autoPoolRoutes.js";
import adminRoutes from "./modules/admin/adminRoutes.js";
import packageRoutes from "./modules/package/packageRoutes.js";
import paymentRoutes from "./modules/payment/paymentRoutes.js";
import categoryRoutes from "./modules/category/categoryRoutes.js";
import subCategoryRoutes from "./modules/category/subCategoryRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { prisma } from "./config/db.js";
import "./config/workers.js"; // Initialize BullMQ background workers
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Enable CORS for frontend development server
app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
}));
app.use(express.json());
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/autopool", autoPoolRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subCategoryRoutes);
// Base Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
// Error handling middleware
app.use(errorMiddleware);
async function startServer() {
    try {
        console.log("[MLM Server] Connecting to Neon PostgreSQL database...");
        await prisma.$connect();
        console.log("[MLM Server] Database connection established successfully via Prisma Client.");
        app.listen(PORT, () => {
            console.log(`[MLM Server] Running on http://localhost:${PORT}`);
            console.log(`[MLM Server] Health check available at http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error("[MLM Server] Failed to connect to database or start server:", error);
        process.exit(1);
    }
}
startServer();
