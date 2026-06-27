import { CategoryRepository } from "./CategoryRepository.js";
const categoryRepository = new CategoryRepository();
export class CategoryService {
    async getAllCategories() {
        return categoryRepository.findAll();
    }
    async getCategoryById(id) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }
        return category;
    }
    async createCategory(data) {
        const existing = await categoryRepository.findByName(data.name);
        if (existing) {
            throw new Error("Category with this name already exists");
        }
        return categoryRepository.create({
            name: data.name,
            image: data.image || null,
        });
    }
    async updateCategory(id, data) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }
        if (data.name && data.name !== category.name) {
            const existing = await categoryRepository.findByName(data.name);
            if (existing) {
                throw new Error("Another category with this name already exists");
            }
        }
        return categoryRepository.update(id, {
            name: data.name,
            image: data.image,
        });
    }
    async deleteCategory(id) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }
        return categoryRepository.delete(id);
    }
}
