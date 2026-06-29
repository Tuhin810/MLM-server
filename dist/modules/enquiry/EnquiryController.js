import { prisma } from "../../config/db.js";
import { verifyToken } from "../auth/jwt.js";
export class EnquiryController {
    // Create a new enquiry thread with the first message
    async createEnquiry(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            let userId = null;
            let name = req.body.name;
            let email = req.body.email;
            let mobile = req.body.mobile;
            const { subject, message } = req.body;
            if (!message || message.trim() === "") {
                res.status(400).json({ error: "Message is required." });
                return;
            }
            if (!subject || subject.trim() === "") {
                res.status(400).json({ error: "Subject is required." });
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
                }
                catch (err) {
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
                    subject,
                    name,
                    email,
                    mobile,
                    userId,
                    messages: {
                        create: {
                            content: message,
                            sender: "USER",
                        },
                    },
                },
                include: { messages: true },
            });
            res.status(201).json({ message: "Enquiry submitted successfully.", enquiry });
        }
        catch (error) {
            next(error);
        }
    }
    // Logged-in user fetches their own enquiry threads with messages
    async getMyEnquiries(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Authentication required." });
                return;
            }
            const enquiries = await prisma.enquiry.findMany({
                where: { userId: req.user.id },
                include: {
                    messages: { orderBy: { createdAt: "asc" } },
                },
                orderBy: { updatedAt: "desc" },
            });
            res.status(200).json(enquiries);
        }
        catch (error) {
            next(error);
        }
    }
    // Logged-in user sends a follow-up message in their enquiry thread
    async sendMessage(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Authentication required." });
                return;
            }
            const enquiryId = req.params.id;
            const { message } = req.body;
            if (!message || message.trim() === "") {
                res.status(400).json({ error: "Message is required." });
                return;
            }
            const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
            if (!enquiry) {
                res.status(404).json({ error: "Enquiry not found." });
                return;
            }
            if (enquiry.userId !== req.user.id) {
                res.status(403).json({ error: "You can only reply to your own enquiries." });
                return;
            }
            if (enquiry.status === "CLOSED") {
                res.status(400).json({ error: "This enquiry has been closed. You cannot send more messages." });
                return;
            }
            const newMessage = await prisma.enquiryMessage.create({
                data: {
                    content: message,
                    sender: "USER",
                    enquiryId,
                },
            });
            // Touch updatedAt
            await prisma.enquiry.update({ where: { id: enquiryId }, data: { updatedAt: new Date() } });
            res.status(201).json({ message: "Message sent.", enquiryMessage: newMessage });
        }
        catch (error) {
            next(error);
        }
    }
}
