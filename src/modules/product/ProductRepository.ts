import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

export class ProductRepository {
  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  async findAll(where: any = {}, orderBy: any = { createdAt: "desc" }) {
    return prisma.product.findMany({ where, orderBy });
  }

  async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({
      data,
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }

  async countAll() {
    return prisma.product.count();
  }
}
