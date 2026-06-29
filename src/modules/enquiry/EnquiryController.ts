import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/db.js";
import { verifyToken } from "../auth/jwt.js";

export class EnquiryController {
  async createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      let name = req.body.name;
      let email = req.body.email;
      let mobile = req.body.mobile;
      const { message } = req.body;

      if (!message || message.trim() === "") {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = verifyToken(token);
          const user = await prisma.user.findUnique({ where: { id: decoded.id } });
          if (user) {
            userId = user.id;
            name = user.name;
            email = user.email;
            mobile = user.mobile;
          }
        } catch (err) {
          console.warn("Invalid token in enquiry, falling back to guest details", err);
        }
      }

      if (!userId) {
        if (!name || !email || !mobile) {
          res.status(400).json({ error: "Name, email, and mobile number are required." });
          return;
        }
      }

      const enquiry = await prisma.enquiry.create({
        data: {
          name,
          email,
          mobile,
          message,
          userId,
        },
      });

      res.status(201).json({ message: "Enquiry submitted successfully.", enquiry });
    } catch (error) {
      next(error);
    }
  }
}
