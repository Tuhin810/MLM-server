import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_mlm_ecom";

export const generateToken = (payload: { id: string; role: "USER" | "ADMIN" }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: "USER" | "ADMIN" };
};
