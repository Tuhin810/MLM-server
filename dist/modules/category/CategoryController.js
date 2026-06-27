import { CategoryService } from "./CategoryService.js";
const categoryService = new CategoryService();
export class CategoryController {
    async getCategories(req, res, next) {
        try {
            const categories = await categoryService.getAllCategories();
            res.status(200).json(categories);
        }
        catch (error) {
            next(error);
        }
    }
    async getCategoryById(req, res, next) {
        try {
            const category = await categoryService.getCategoryById(req.params.id);
            res.status(200).json(category);
        }
        catch (error) {
            next(error);
        }
    }
    async createCategory(req, res, next) {
        try {
            const { name, image } = req.body;
            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.status(400).json({ error: "Category name must be at least 2 characters" });
                return;
            }
            const category = await categoryService.createCategory({ name: name.trim(), image });
            res.status(201).json(category);
        }
        catch (error) {
            next(error);
        }
    }
    async updateCategory(req, res, next) {
        try {
            const { name, image } = req.body;
            const category = await categoryService.updateCategory(req.params.id, { name: name?.trim(), image });
            res.status(200).json(category);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCategory(req, res, next) {
        try {
            await categoryService.deleteCategory(req.params.id);
            res.status(200).json({ message: "Category deleted successfully" });
        }
        catch (error) {
            next(error);
        }
    }
}
