import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Settings (Global)
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      llmProvider: 'openai',
      llmModel: 'gpt-5.2', // Default model
      emailEnabled: true,
    },
  });
  console.log('Created Settings:', settings);

  // 2. Create Users
  const usersData = [
    { name: 'Admin User', email: 'admin@company.com', role: 'Admin', avatar: 'A' },
    { name: 'Kim Chul-soo', email: 'kim@company.com', role: 'Frontend', avatar: 'K' },
    { name: 'Lee Young-hee', email: 'lee@company.com', role: 'Backend', avatar: 'L' },
    { name: 'Park Min-su', email: 'park@company.com', role: 'Designer', avatar: 'P' },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    console.log(`Created User: ${user.name}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
