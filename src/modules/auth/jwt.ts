import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_mlm_ecom";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_super_refresh_secret_key_mlm_ecom_refresh";

export interface TokenPayload {
  id: string;
  role: "USER" | "ADMIN";
  sessionId: string;
}

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

// Keep verifyToken matching verifyAccessToken for compatibility
export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
