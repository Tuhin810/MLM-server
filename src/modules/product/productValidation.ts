import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  image: z.string().url("Product image must be a valid URL"),
  price: z.preprocess((val) => parseFloat(val as string), z.number().positive("Price must be positive")),
  pointValue: z.preprocess((val) => parseInt(val as string), z.number().nonnegative("Point value must be non-negative")),
  stock: z.preprocess((val) => parseInt(val as string), z.number().nonnegative("Stock must be non-negative")),
});
