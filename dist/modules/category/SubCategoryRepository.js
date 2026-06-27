import { prisma } from "../../config/db.js";
export class SubCategoryRepository {
    async findAll(categoryId) {
        const where = {};
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
    async findById(id) {
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
    async findByNameAndCategory(name, categoryId) {
        return prisma.subCategory.findUnique({
            where: {
                categoryId_name: { categoryId, name },
            },
        });
    }
    async create(data) {
        return prisma.subCategory.create({
            data,
            include: {
                category: { select: { id: true, name: true } },
            },
        });
    }
    async update(id, data) {
        return prisma.subCategory.update({
            where: { id },
            data,
            include: {
                category: { select: { id: true, name: true } },
            },
        });
    }
    async delete(id) {
        return prisma.subCategory.delete({ where: { id } });
    }
}
