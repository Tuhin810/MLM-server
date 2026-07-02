import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
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
import enquiryRoutes from "./modules/enquiry/enquiryRoutes.js";
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
app.use("/api/enquiries", enquiryRoutes);
// Base Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
// Error handling middleware
app.use(errorMiddleware);
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}
function padLine(text, length = 60) {
    const cleanText = text.replace(/\x1b\[[0-9;]*m/g, "");
    const paddingNeeded = length - cleanText.length;
    return text + " ".repeat(Math.max(0, paddingNeeded));
}
async function startServer() {
    try {
        console.log("[MLM Server] Connecting to Neon PostgreSQL database...");
        await prisma.$connect();
        console.log("[MLM Server] Database connection established successfully via Prisma Client.");
        app.listen(PORT, () => {
            const localIp = getLocalIP();
            const cyan = '\x1b[36m';
            const orange = '\x1b[38;5;208m';
            const green = '\x1b[32m';
            const yellow = '\x1b[33m';
            const gray = '\x1b[90m';
            const reset = '\x1b[0m';
            const bold = '\x1b[1m';
            const white = '\x1b[37m';
            const r1 = `${green}${bold}  █████╗       ██╗███╗   ███╗  █████╗ ██╗   ██╗  █████╗ ${reset}`;
            const r2 = `${green}${bold} ██╔══██╗      ██║████╗ ████║ ██╔══██╗╚██╗ ██╔╝ ██╔══██╗${reset}`;
            const r3 = `${green}${bold} ███████║      ██║██╔████╔██║ ███████║ ╚████╔╝  ███████║${reset}`;
            const r4 = `${green}${bold} ██╔══██║██   ██║██║╚██╔╝██║ ██╔══██║  ╚██╔╝   ██╔══██║${reset}`;
            const r5 = `${green}${bold} ██║  ██║╚█████╔╝██║ ╚═╝ ██║ ██║  ██║   ██║    ██║  ██║${reset}`;
            const r6 = `${green}${bold} ╚═╝  ╚═╝ ╚════╝ ╚═╝     ╚═╝ ╚═╝  ╚═╝   ╚═╝    ╚═╝  ╚═╝${reset}`;
            console.log(`\n${cyan}  ┌────────────────────────────────────────────────────────────┐${reset}`);
            console.log(`${cyan}  │${reset}${padLine(' '.repeat(60))}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r1)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r2)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r3)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r4)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r5)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine('  ' + r6)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(' '.repeat(60))}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${white}${bold}Ajmaya - MLM Backend System${reset} ${gray}v1.0.0${reset}`)}${cyan}│${reset}`);
            console.log(`${cyan}  ├────────────────────────────────────────────────────────────┤${reset}`);
            console.log(`${cyan}  │${reset}${padLine(' '.repeat(60))}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${gray}Status:${reset}      ${green}${bold}⚡ API SERVER INITIALIZED SUCCESSFULLY${reset}`)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${gray}Mode:${reset}        ${yellow}${process.env.NODE_ENV || 'development'}${reset}`)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${gray}Port:${reset}        ${green}${PORT}${reset}`)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${gray}Database:${reset}    ${green}🟢 Connected (PostgreSQL)${reset}`)}${cyan}│${reset}`);
            console.log(`${cyan}  │${reset}${padLine(`  ${gray}Local URL:${reset}   ${white}${bold}http://localhost:${PORT}/api${reset}`)}${cyan}│${reset}`);
            if (localIp !== 'localhost') {
                console.log(`${cyan}  │${reset}${padLine(`  ${gray}Network URL:${reset} ${white}${bold}http://${localIp}:${PORT}/api${reset}`)}${cyan}│${reset}`);
            }
            console.log(`${cyan}  │${reset}${padLine(' '.repeat(60))}${cyan}│${reset}`);
            console.log(`${cyan}  └────────────────────────────────────────────────────────────┘${reset}\n`);
        });
    }
    catch (error) {
        console.error("[MLM Server] Failed to connect to database or start server:", error);
        process.exit(1);
    }
}
startServer();
