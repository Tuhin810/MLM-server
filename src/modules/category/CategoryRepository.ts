import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

export class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: {
            subCategories: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
        _count: {
          select: {
            subCategories: true,
            products: true,
          },
        },
      },
    });
  }

  async findByName(name: string) {
    return prisma.category.findUnique({ where: { name } });
  }

  async create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  }
}
