import { prisma } from "../../config/db.js";
export class OrderRepository {
    async create(data) {
        return prisma.order.create({
            data,
            include: {
                product: true,
            },
        });
    }
    async findById(id) {
        return prisma.order.findUnique({
            where: { id },
            include: {
                product: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findByUserId(userId) {
        return prisma.order.findMany({
            where: { userId },
            include: {
                product: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findAll() {
        return prisma.order.findMany({
            include: {
                product: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async countAll() {
        return prisma.order.count();
    }
}
