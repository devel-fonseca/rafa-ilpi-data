import { PrismaClient } from '@prisma/client';
import { seedShiftTemplates } from './shift-templates.seed';

const prisma = new PrismaClient();

async function main() {
  await seedShiftTemplates(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
