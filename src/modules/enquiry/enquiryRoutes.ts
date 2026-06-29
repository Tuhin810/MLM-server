import { Router } from "express";
import { EnquiryController } from "./EnquiryController.js";

const router = Router();
const enquiryController = new EnquiryController();

router.post("/", enquiryController.createEnquiry);

export default router;
