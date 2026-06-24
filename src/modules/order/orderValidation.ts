import { z } from "zod";

export const orderSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.preprocess((val) => parseInt(val as string), z.number().int().positive("Quantity must be a positive integer")),
});
