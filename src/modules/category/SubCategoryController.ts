import { Response, NextFunction } from "express";
import { SubCategoryService } from "./SubCategoryService.js";
import { AuthenticatedRequest } from "../auth/authMiddleware.js";

const subCategoryService = new SubCategoryService();

export class SubCategoryController {
  async getSubCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId } = req.query as { categoryId?: string };
      const subCategories = await subCategoryService.getAllSubCategories(categoryId);
      res.status(200).json(subCategories);
    } catch (error) {
      next(error);
    }
  }

  async getSubCategoryById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subCategory = await subCategoryService.getSubCategoryById(req.params.id as string);
      res.status(200).json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async createSubCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, categoryId, image } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ error: "SubCategory name must be at least 2 characters" });
        return;
      }
      if (!categoryId) {
        res.status(400).json({ error: "categoryId is required" });
        return;
      }
      const subCategory = await subCategoryService.createSubCategory({ name: name.trim(), categoryId, image });
      res.status(201).json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async updateSubCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, categoryId, image } = req.body;
      const subCategory = await subCategoryService.updateSubCategory(req.params.id as string, {
        name: name?.trim(),
        categoryId,
        image,
      });
      res.status(200).json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async deleteSubCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await subCategoryService.deleteSubCategory(req.params.id as string);
      res.status(200).json({ message: "SubCategory deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
