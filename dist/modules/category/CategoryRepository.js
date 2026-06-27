import { prisma } from "../../config/db.js";
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
    async findById(id) {
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
    async findByName(name) {
        return prisma.category.findUnique({ where: { name } });
    }
    async create(data) {
        return prisma.category.create({ data });
    }
    async update(id, data) {
        return prisma.category.update({ where: { id }, data });
    }
    async delete(id) {
        return prisma.category.delete({ where: { id } });
    }
}
