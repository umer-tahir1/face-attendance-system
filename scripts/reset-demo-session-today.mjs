import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoClass = await prisma.academicClass.findFirst({
    where: { code: 'DEMO500' },
    orderBy: { createdAt: 'asc' },
  });

  if (!demoClass) {
    throw new Error('DEMO500 class not found.');
  }

  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nextDay = new Date(dayStart);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  await prisma.attendance.deleteMany({
    where: {
      academicClassId: demoClass.id,
      date: {
        gte: dayStart,
        lt: nextDay,
      },
    },
  });

  await prisma.attendanceSession.deleteMany({
    where: {
      academicClassId: demoClass.id,
      date: {
        gte: dayStart,
        lt: nextDay,
      },
    },
  });

  console.log(JSON.stringify({ classId: demoClass.id, dayStart: dayStart.toISOString().slice(0, 10) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
