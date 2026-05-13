import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Plumbing', description: 'Pipe repairs, installations, and water systems' },
    { name: 'Electrical', description: 'Wiring, outlets, lighting, and electrical repairs' },
    { name: 'Carpentry', description: 'Wood work, furniture assembly, and structural repairs' },
    { name: 'Painting', description: 'Interior and exterior painting and finishing' },
    { name: 'Cleaning', description: 'Deep cleaning, regular maintenance, and specialized cleaning' },
    { name: 'HVAC', description: 'Heating, ventilation, and air conditioning services' },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Seeded 6 service categories');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
