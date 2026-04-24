import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const hashPassword = async (plain) => bcrypt.hash(plain, 10);

async function seedDefaults() {
  const adminEmail = 'admin@nust.edu.pk';
  const teacherEmail = 'teacher@nust.edu.pk';

  const [adminPasswordHash, teacherPasswordHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('teacher123'),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const department = await prisma.department.upsert({
    where: { code: 'CS' },
    update: { name: 'Computer Science' },
    create: {
      name: 'Computer Science',
      code: 'CS',
    },
  });

  const program = await prisma.program.upsert({
    where: {
      departmentId_code: {
        departmentId: department.id,
        code: 'BSCS',
      },
    },
    update: { name: 'BS Computer Science' },
    create: {
      name: 'BS Computer Science',
      code: 'BSCS',
      departmentId: department.id,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {
      name: 'Default Teacher',
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
    },
    create: {
      name: 'Default Teacher',
      email: teacherEmail,
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {
      employeeId: 'EMP-001',
      departmentId: department.id,
    },
    create: {
      userId: teacherUser.id,
      employeeId: 'EMP-001',
      departmentId: department.id,
    },
  });

  await prisma.academicClass.upsert({
    where: {
      programId_code: {
        programId: program.id,
        code: 'CS101',
      },
    },
    update: {
      name: 'Introduction to Computing',
      teacherId: teacher.id,
      departmentId: department.id,
      credits: 3,
      section: 'A',
    },
    create: {
      name: 'Introduction to Computing',
      code: 'CS101',
      section: 'A',
      teacherId: teacher.id,
      programId: program.id,
      departmentId: department.id,
      credits: 3,
    },
  });

  const seededClass = await prisma.academicClass.findFirst({
    where: {
      code: 'CS101',
      teacherId: teacher.id,
    },
  });

  if (seededClass) {
    await prisma.timetable.upsert({
      where: {
        id: 'default-timetable-slot-1',
      },
      update: {
        academicClassId: seededClass.id,
        teacherId: teacher.id,
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '10:50',
        room: 'Room 101',
      },
      create: {
        id: 'default-timetable-slot-1',
        academicClassId: seededClass.id,
        teacherId: teacher.id,
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '10:50',
        room: 'Room 101',
      },
    });
  }

  return { adminUser };
}

seedDefaults()
  .then(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('Seed completed successfully.');
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
