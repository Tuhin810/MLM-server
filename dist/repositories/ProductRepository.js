import { prisma } from "../config/db.js";
export class ProductRepository {
    async findById(id) {
        return prisma.product.findUnique({
            where: { id },
        });
    }
    async findAll(where = {}, orderBy = { createdAt: "desc" }) {
        return prisma.product.findMany({ where, orderBy });
    }
    async create(data) {
        return prisma.product.create({
            data,
        });
    }
    async update(id, data) {
        return prisma.product.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return prisma.product.delete({
            where: { id },
        });
    }
    async countAll() {
        return prisma.product.count();
    }
}
