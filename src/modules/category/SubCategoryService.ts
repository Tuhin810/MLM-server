import { SubCategoryRepository } from "./SubCategoryRepository.js";

const subCategoryRepository = new SubCategoryRepository();

export class SubCategoryService {
  async getAllSubCategories(categoryId?: string) {
    return subCategoryRepository.findAll(categoryId);
  }

  async getSubCategoryById(id: string) {
    const subCategory = await subCategoryRepository.findById(id);
    if (!subCategory) {
      throw new Error("SubCategory not found");
    }
    return subCategory;
  }

  async createSubCategory(data: { name: string; categoryId: string; image?: string }) {
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

  async updateSubCategory(id: string, data: { name?: string; categoryId?: string; image?: string }) {
    const subCategory = await subCategoryRepository.findById(id);
    if (!subCategory) {
      throw new Error("SubCategory not found");
    }
    
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.categoryId) {
      updateData.category = { connect: { id: data.categoryId } };
    }

    return subCategoryRepository.update(id, updateData);
  }

  async deleteSubCategory(id: string) {
    const subCategory = await subCategoryRepository.findById(id);
    if (!subCategory) {
      throw new Error("SubCategory not found");
    }
    return subCategoryRepository.delete(id);
  }
}
