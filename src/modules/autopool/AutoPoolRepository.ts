import { prisma } from "../../config/db.js";
import { AutoPoolMember, Prisma } from "@prisma/client";

export class AutoPoolRepository {
  async findByUserId(userId: string) {
    return prisma.autoPoolMember.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            mobile: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.autoPoolMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findFirstAvailableParent() {
    const members = await prisma.autoPoolMember.findMany({
      orderBy: [
        { level: "asc" },
        { position: "asc" },
      ],
      include: {
        _count: {
          select: { children: true },
        },
      },
    });

    return members.find((m) => m._count.children < 2) || null;
  }

  async createMember(data: Prisma.AutoPoolMemberUncheckedCreateInput) {
    return prisma.autoPoolMember.create({
      data,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async countAll() {
    return prisma.autoPoolMember.count();
  }

  async findAll() {
    return prisma.autoPoolMember.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { level: "asc" },
        { position: "asc" },
      ],
    });
  }

  async getAncestors(memberId: string, maxLevels: number = 7): Promise<AutoPoolMember[]> {
    const ancestors: AutoPoolMember[] = [];
    let currentId = memberId;

    for (let i = 0; i < maxLevels; i++) {
      const member = await prisma.autoPoolMember.findUnique({
        where: { id: currentId },
      });
      if (!member || !member.parentId) break;
      
      const parent = await prisma.autoPoolMember.findUnique({
        where: { id: member.parentId },
      });
      if (!parent) break;

      ancestors.push(parent);
      currentId = parent.id;
    }

    return ancestors;
  }

  async countDescendantsAtLevel(ancestor: AutoPoolMember, targetLevel: number): Promise<number> {
    const h = targetLevel - ancestor.level;
    if (h <= 0) return 0;

    const minPos = ancestor.position * Math.pow(2, h);
    const maxPos = (ancestor.position + 1) * Math.pow(2, h) - 1;

    return prisma.autoPoolMember.count({
      where: {
        level: targetLevel,
        position: {
          gte: minPos,
          lte: maxPos,
        },
      },
    });
  }

  async findChildren(memberId: string) {
    return prisma.autoPoolMember.findMany({
      where: { parentId: memberId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { position: "asc" },
    });
  }
}
