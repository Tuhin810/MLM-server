import { Router } from "express";
import { EnquiryController } from "./EnquiryController.js";
import { authMiddleware } from "../auth/authMiddleware.js";

const router = Router();
const enquiryController = new EnquiryController();

// Public: anyone can start a new enquiry thread
router.post("/", enquiryController.createEnquiry);

// Protected: logged-in users
router.get("/my", authMiddleware as any, enquiryController.getMyEnquiries);
router.post("/:id/messages", authMiddleware as any, enquiryController.sendMessage);

export default router;
