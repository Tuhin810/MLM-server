import { prisma } from "./src/config/db.js";

async function count() {
  const c = await prisma.autoPoolMember.count();
  console.log("Total AutoPoolMembers:", c);
  process.exit(0);
}
count();
