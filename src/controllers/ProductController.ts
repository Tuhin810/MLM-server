import { Response, NextFunction } from "express";
import { ProductService } from "../services/ProductService.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { productSchema } from "../utils/validation.js";

const productService = new ProductService();

export class ProductController {
  async getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search, sort } = req.query as { category?: string; search?: string; sort?: string };
      const products = await productService.getProducts({ category, search, sort });
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.getProductById(req.params.id as string);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = productSchema.parse(req.body);
      const product = await productService.createProduct(parsedData);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.updateProduct(req.params.id as string, req.body);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await productService.deleteProduct(req.params.id as string);
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
