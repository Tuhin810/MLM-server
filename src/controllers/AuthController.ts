import { Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { registerSchema, loginSchema } from "../utils/validation.js";

const authService = new AuthService();

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = registerSchema.parse(req.body);
      const result = await authService.register(parsedData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = loginSchema.parse(req.body);
      const result = await authService.login(parsedData);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async sendOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
    } catch (error) {
      next(error);
    }
  }

  async forgotPasswordReset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({ error: "Email, OTP, and newPassword are required" });
        return;
      }
      const result = await authService.forgotPasswordReset(email, otp, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const profile = await authService.getProfile(req.user.id);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.updateProfile(req.user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateKyc(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.updateKyc(req.user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateBankDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.updateBankDetails(req.user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.addAddress(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.deleteAddress(req.user.id, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.setDefaultAddress(req.user.id, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getReferralTree(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.getReferralTree(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

