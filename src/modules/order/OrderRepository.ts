import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

export class OrderRepository {
  async create(data: Prisma.OrderUncheckedCreateInput) {
    return prisma.order.create({
      data,
      include: {
        product: true,
      },
    });
  }

  async findById(id: string) {
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

  async findByUserId(userId: string) {
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
