import { PrismaClient, DayOfWeek } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayKey = dayNames[new Date().getDay()];
  const dayEnum = DayOfWeek[todayKey];

  if (!dayEnum) {
    throw new Error('Unable to resolve today day enum.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const teacherUser = await tx.user.findUnique({
      where: { email: 'teacher@nust.edu.pk' },
      include: { teacher: true },
    });

    if (!teacherUser?.teacher) {
      throw new Error('Default teacher not found: teacher@nust.edu.pk');
    }

    const program = await tx.program.findFirst({
      where: { code: 'BSCS' },
      orderBy: { createdAt: 'asc' },
    });

    if (!program) {
      throw new Error('Default BSCS program not found.');
    }

    const department = await tx.department.findUnique({ where: { id: program.departmentId } });
    if (!department) {
      throw new Error('Department for BSCS program not found.');
    }

    const demoClass = await tx.academicClass.upsert({
      where: {
        programId_code: {
          programId: program.id,
          code: 'DEMO500',
        },
      },
      update: {
        name: 'Demo Attendance Lab',
        teacherId: teacherUser.teacher.id,
        departmentId: department.id,
        section: 'A',
        credits: 1,
      },
      create: {
        name: 'Demo Attendance Lab',
        code: 'DEMO500',
        section: 'A',
        credits: 1,
        teacherId: teacherUser.teacher.id,
        programId: program.id,
        departmentId: department.id,
      },
    });

    // Keep exactly one slot today for this demo class at 17:00-18:00.
    await tx.timetable.deleteMany({
      where: {
        academicClassId: demoClass.id,
        day: dayEnum,
      },
    });

    await tx.timetable.create({
      data: {
        academicClassId: demoClass.id,
        teacherId: teacherUser.teacher.id,
        day: dayEnum,
        startTime: '17:00',
        endTime: '18:00',
        room: 'Demo Room 1',
      },
    });

    const students = [];
    for (let i = 1; i <= 40; i += 1) {
      const n = String(i).padStart(3, '0');
      const roll = `DMY-2026-${n}`;
      const student = await tx.student.upsert({
        where: { rollNumber: roll },
        update: {
          name: `Dummy Student ${n}`,
          email: `dummy${n}@nust.local`,
          programId: program.id,
          departmentId: department.id,
          // Empty encodings guarantee no AI match.
          faceEncoding: [],
          faceImages: [],
        },
        create: {
          name: `Dummy Student ${n}`,
          rollNumber: roll,
          email: `dummy${n}@nust.local`,
          programId: program.id,
          departmentId: department.id,
          faceEncoding: [],
          faceImages: [],
        },
      });
      students.push(student);
    }

    // Keep enrollment list deterministic for this class.
    await tx.enrollment.deleteMany({ where: { academicClassId: demoClass.id } });
    for (const student of students) {
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          academicClassId: demoClass.id,
        },
      });
    }

    return {
      classId: demoClass.id,
      classCode: demoClass.code,
      className: demoClass.name,
      day: todayKey,
      startTime: '17:00',
      endTime: '18:00',
      room: 'Demo Room 1',
      teacherEmail: teacherUser.email,
      enrolledStudents: students.length,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
