import { prisma } from "../config/db.js";
export class AdminRepository {
    async findById(id) {
        return prisma.admin.findUnique({
            where: { id },
        });
    }
    async findByUsername(username) {
        return prisma.admin.findUnique({
            where: { username },
        });
    }
    async findByEmail(email) {
        return prisma.admin.findUnique({
            where: { email },
        });
    }
    async create(data) {
        return prisma.admin.create({
            data,
        });
    }
    async countAll() {
        return prisma.admin.count();
    }
}
