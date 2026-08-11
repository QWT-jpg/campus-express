const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default configs...');

  // Seed stations
  const stations = ['校内驿站', '校外驿站'];
  await prisma.config.upsert({
    where: { key: 'stations' },
    update: { value: stations },
    create: { key: 'stations', value: stations },
  });
  console.log('Stations seeded:', stations);

  // Seed buildings
  const buildings = [
  '西区1号楼', '西区2号楼', '西区3号楼', '西区4号楼', '西区5号楼', '西区6号楼', '西区7号楼',
  '东区1号楼', '东区2号楼', '东区3号楼', '东区4号楼', '东区5号楼', '东区6号楼', '东区7号楼', '东区8号楼', '东区9号楼',
];
  await prisma.config.upsert({
    where: { key: 'buildings' },
    update: { value: buildings },
    create: { key: 'buildings', value: buildings },
  });
  console.log('Buildings seeded:', buildings);

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
