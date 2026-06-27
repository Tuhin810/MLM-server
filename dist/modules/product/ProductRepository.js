import { prisma } from "../../config/db.js";
const productInclude = {
    categoryRef: { select: { id: true, name: true } },
    subCategory: { select: { id: true, name: true } },
    sellingDetails: true,
};
export class ProductRepository {
    async findById(id) {
        return prisma.product.findUnique({
            where: { id },
            include: productInclude,
        });
    }
    async findAll(where = {}, orderBy = { createdAt: "desc" }) {
        return prisma.product.findMany({
            where,
            orderBy,
            include: productInclude,
        });
    }
    async create(data) {
        return prisma.product.create({
            data,
            include: productInclude,
        });
    }
    async update(id, data) {
        return prisma.product.update({
            where: { id },
            data,
            include: productInclude,
        });
    }
    async delete(id) {
        // Delete selling details first (cascade should handle, but be explicit)
        await prisma.productSellingDetails.deleteMany({ where: { productId: id } });
        return prisma.product.delete({
            where: { id },
        });
    }
    async countAll() {
        return prisma.product.count();
    }
}
