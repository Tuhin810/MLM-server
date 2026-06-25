import { AuthService } from "./AuthService.js";
import { registerSchema, loginSchema } from "./authValidation.js";
import { verifyToken } from "./jwt.js";
import { prisma } from "../../config/db.js";
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader)
        return list;
    cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        const key = parts.shift();
        if (key) {
            list[key.trim()] = decodeURI(parts.join("="));
        }
    });
    return list;
}
const authService = new AuthService();
export class AuthController {
    async register(req, res, next) {
        try {
            const parsedData = registerSchema.parse(req.body);
            const deviceInfo = req.headers["user-agent"] || "Unknown Device";
            const ipAddress = req.ip || req.socket.remoteAddress || "Unknown IP";
            const result = await authService.register(parsedData, deviceInfo, ipAddress);
            // Set refresh token in httpOnly secure cookie
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(201).json({
                user: result.user,
                token: result.accessToken,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const parsedData = loginSchema.parse(req.body);
            const deviceInfo = req.headers["user-agent"] || "Unknown Device";
            const ipAddress = req.ip || req.socket.remoteAddress || "Unknown IP";
            const result = await authService.login(parsedData, deviceInfo, ipAddress);
            // Set refresh token in httpOnly secure cookie
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(200).json({
                user: result.user,
                token: result.accessToken,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            // Parse cookies manually to get refresh token
            const cookies = parseCookies(req.headers.cookie);
            const refreshToken = cookies.refreshToken || "";
            if (refreshToken) {
                await authService.logout(refreshToken);
            }
            // Also invalidate session by access token sessionId if present
            const authHeader = req.headers.authorization;
            const accessToken = authHeader?.split(" ")[1];
            if (accessToken) {
                try {
                    const decoded = verifyToken(accessToken);
                    await prisma.session.updateMany({
                        where: { id: decoded.sessionId },
                        data: { isActive: false },
                    });
                }
                catch (e) {
                    // Ignore token verification errors during logout
                }
            }
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            });
            res.status(200).json({ message: "Logged out successfully" });
        }
        catch (error) {
            next(error);
        }
    }
    async sendOtp(req, res, next) {
        try {
            const { email, purpose } = req.body;
            if (!email || !purpose) {
                res.status(400).json({ error: "Email and purpose are required" });
                return;
            }
            if (purpose !== "register" && purpose !== "forgot_password") {
                res.status(400).json({ error: "Invalid purpose" });
                return;
            }
            const result = await authService.sendOtp(email, purpose);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPasswordReset(req, res, next) {
        try {
            const { email, otp, newPassword } = req.body;
            if (!email || !otp || !newPassword) {
                res.status(400).json({ error: "Email, OTP, and newPassword are required" });
                return;
            }
            const result = await authService.forgotPasswordReset(email, otp, newPassword);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async getProfile(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const profile = await authService.getProfile(req.user.id);
            res.status(200).json(profile);
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.updateProfile(req.user.id, req.body);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async updateKyc(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.updateKyc(req.user.id, req.body);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async updateBankDetails(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.updateBankDetails(req.user.id, req.body);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async addAddress(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.addAddress(req.user.id, req.body);
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAddress(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.deleteAddress(req.user.id, req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async setDefaultAddress(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.setDefaultAddress(req.user.id, req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async getReferralTree(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const result = await authService.getReferralTree(req.user.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async refresh(req, res, next) {
        try {
            const cookies = parseCookies(req.headers.cookie);
            const refreshToken = cookies.refreshToken || "";
            if (!refreshToken) {
                res.status(401).json({ error: "Refresh token is missing" });
                return;
            }
            const result = await authService.refresh(refreshToken);
            res.status(200).json({
                token: result.accessToken,
            });
        }
        catch (error) {
            res.status(401).json({ error: error.message || "Invalid refresh token" });
        }
    }
}
