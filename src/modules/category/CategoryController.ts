import { Response, NextFunction } from "express";
import { CategoryService } from "./CategoryService.js";
import { AuthenticatedRequest } from "../auth/authMiddleware.js";

const categoryService = new CategoryService();

export class CategoryController {
  async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.getAllCategories();
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.getCategoryById(req.params.id as string);
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, image } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ error: "Category name must be at least 2 characters" });
        return;
      }
      const category = await categoryService.createCategory({ name: name.trim(), image });
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, image } = req.body;
      const category = await categoryService.updateCategory(req.params.id as string, { name: name?.trim(), image });
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await categoryService.deleteCategory(req.params.id as string);
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
