import { prisma } from "../config/db.js";
import { Prisma } from "@prisma/client";

export class AdminRepository {
  async findById(id: string) {
    return prisma.admin.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string) {
    return prisma.admin.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string) {
    return prisma.admin.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.AdminCreateInput) {
    return prisma.admin.create({
      data,
    });
  }

  async countAll() {
    return prisma.admin.count();
  }
}
