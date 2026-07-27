import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const bas = await prisma.beforeAfter.findMany({ include: { collection: true } });
  console.log(JSON.stringify(bas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
