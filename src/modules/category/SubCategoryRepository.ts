import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

export class SubCategoryRepository {
  async findAll(categoryId?: string) {
    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    return prisma.subCategory.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findByNameAndCategory(name: string, categoryId: string) {
    return prisma.subCategory.findUnique({
      where: {
        categoryId_name: { categoryId, name },
      },
    });
  }

  async create(data: Prisma.SubCategoryCreateInput) {
    return prisma.subCategory.create({
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, data: Prisma.SubCategoryUpdateInput) {
    return prisma.subCategory.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.subCategory.delete({ where: { id } });
  }
}
