import { z } from "zod";
export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    referredBy: z.string().optional().nullable(),
    otp: z.string().length(6, "OTP must be 6 digits"),
});
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});
export const productSchema = z.object({
    name: z.string().min(2, "Product name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    image: z.string().url("Product image must be a valid URL"),
    price: z.preprocess((val) => parseFloat(val), z.number().positive("Price must be positive")),
    pointValue: z.preprocess((val) => parseInt(val), z.number().nonnegative("Point value must be non-negative")),
    stock: z.preprocess((val) => parseInt(val), z.number().nonnegative("Stock must be non-negative")),
});
export const orderSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.preprocess((val) => parseInt(val), z.number().int().positive("Quantity must be a positive integer")),
});
