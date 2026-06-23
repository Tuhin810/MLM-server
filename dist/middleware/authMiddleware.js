import { verifyToken } from "../utils/jwt.js";
import { prisma } from "../config/db.js";
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Access denied. No token provided." });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);
        if (decoded.role === "ADMIN") {
            const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
            if (!admin) {
                res.status(401).json({ error: "Invalid token. Admin not found." });
                return;
            }
            req.user = {
                id: admin.id,
                role: "ADMIN",
                name: admin.username,
                email: admin.email,
            };
        }
        else {
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) {
                res.status(401).json({ error: "Invalid token. User not found." });
                return;
            }
            if (user.status !== "ACTIVE") {
                res.status(403).json({ error: "Account is inactive." });
                return;
            }
            req.user = {
                id: user.id,
                role: "USER",
                name: user.name,
                email: user.email,
            };
        }
        next();
    }
    catch (error) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
};
export const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Access denied. Admins only." });
        return;
    }
    next();
};
