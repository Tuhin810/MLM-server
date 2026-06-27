import { SubCategoryRepository } from "./SubCategoryRepository.js";
const subCategoryRepository = new SubCategoryRepository();
export class SubCategoryService {
    async getAllSubCategories(categoryId) {
        return subCategoryRepository.findAll(categoryId);
    }
    async getSubCategoryById(id) {
        const subCategory = await subCategoryRepository.findById(id);
        if (!subCategory) {
            throw new Error("SubCategory not found");
        }
        return subCategory;
    }
    async createSubCategory(data) {
        const existing = await subCategoryRepository.findByNameAndCategory(data.name, data.categoryId);
        if (existing) {
            throw new Error("SubCategory with this name already exists in this category");
        }
        return subCategoryRepository.create({
            name: data.name,
            image: data.image || null,
            category: { connect: { id: data.categoryId } },
        });
    }
    async updateSubCategory(id, data) {
        const subCategory = await subCategoryRepository.findById(id);
        if (!subCategory) {
            throw new Error("SubCategory not found");
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.image !== undefined)
            updateData.image = data.image;
        if (data.categoryId) {
            updateData.category = { connect: { id: data.categoryId } };
        }
        return subCategoryRepository.update(id, updateData);
    }
    async deleteSubCategory(id) {
        const subCategory = await subCategoryRepository.findById(id);
        if (!subCategory) {
            throw new Error("SubCategory not found");
        }
        return subCategoryRepository.delete(id);
    }
}
