import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_mlm_ecom";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_super_refresh_secret_key_mlm_ecom_refresh";
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};
// Keep verifyToken matching verifyAccessToken for compatibility
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
