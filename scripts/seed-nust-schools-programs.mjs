import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Role } from '@prisma/client';
import {
  buildCatalogDefinitions,
  buildOutputDataset,
  inferLabMetadata,
  levelCode,
} from './lib/nustAcademicDataset.mjs';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toCourseCode = ({ programCode, semester, courseIndex }) =>
  `${programCode}-S${semester}C${String(courseIndex + 1).padStart(2, '0')}`;

const toCredits = (courseName) => {
  const normalized = String(courseName || '').toLowerCase();

  if (normalized.includes('thesis') || normalized.includes('dissertation')) {
    return 6;
  }

  if (
    normalized.includes('project') ||
    normalized.includes('capstone') ||
    normalized.includes('studio') ||
    normalized.includes('internship')
  ) {
    return 4;
  }

  if (normalized.includes('laboratory') || normalized.includes('lab')) {
    return 2;
  }

  return 3;
};

const ensureCatalogTeacher = async ({ department, passwordHash }) => {
  const teacherEmail = `catalog-${department.code.toLowerCase()}@nust.edu.pk`;
  const user = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {
      name: `${department.name} Catalog Instructor`,
      passwordHash,
      role: Role.TEACHER,
    },
    create: {
      name: `${department.name} Catalog Instructor`,
      email: teacherEmail,
      passwordHash,
      role: Role.TEACHER,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {
      departmentId: department.id,
      employeeId: `CAT-${department.code}`,
    },
    create: {
      userId: user.id,
      departmentId: department.id,
      employeeId: `CAT-${department.code}`,
    },
  });

  return teacher.id;
};

async function main() {
  const catalog = buildCatalogDefinitions();
  const outputDataset = buildOutputDataset();
  const catalogTeacherPasswordHash = await bcrypt.hash('teacher123', 10);

  let schoolCount = 0;
  let programCount = 0;
  let courseCount = 0;

  for (const school of catalog) {
    const department = await prisma.department.upsert({
      where: { code: school.schoolCode },
      update: { name: school.schoolName },
      create: { name: school.schoolName, code: school.schoolCode },
    });

    const catalogTeacherId = await ensureCatalogTeacher({
      department,
      passwordHash: catalogTeacherPasswordHash,
    });

    schoolCount += 1;

    for (const program of school.programs) {
      const programCode = `${school.schoolCode}-${program.programKey}-${levelCode(program.level)}`;
      const programName = `${program.programName} (${program.level})`;

      const programRow = await prisma.program.upsert({
        where: {
          departmentId_code: {
            departmentId: department.id,
            code: programCode,
          },
        },
        update: {
          name: programName,
        },
        create: {
          name: programName,
          code: programCode,
          departmentId: department.id,
        },
      });

      programCount += 1;

      const seededCourseCodes = [];
      for (const semester of program.semesters) {
        for (let index = 0; index < semester.courses.length; index += 1) {
          const course = semester.courses[index];
          const labMeta = inferLabMetadata(course.courseName);
          const classCode = toCourseCode({
            programCode,
            semester: semester.semester,
            courseIndex: index,
          });

          seededCourseCodes.push(classCode);

          await prisma.academicClass.upsert({
            where: {
              programId_code: {
                programId: programRow.id,
                code: classCode,
              },
            },
            update: {
              name: course.courseName,
              teacherId: catalogTeacherId,
              departmentId: department.id,
              section: 'A',
              credits: toCredits(course.courseName),
              hasLab: labMeta.hasLab,
              labName: labMeta.labName,
              labAttendanceRequired: labMeta.hasLab,
            },
            create: {
              name: course.courseName,
              code: classCode,
              section: 'A',
              teacherId: catalogTeacherId,
              programId: programRow.id,
              departmentId: department.id,
              credits: toCredits(course.courseName),
              hasLab: labMeta.hasLab,
              labName: labMeta.labName,
              labAttendanceRequired: labMeta.hasLab,
            },
          });

          courseCount += 1;
        }
      }

      await prisma.academicClass.deleteMany({
        where: {
          programId: programRow.id,
          code: {
            startsWith: `${programCode}-S`,
            notIn: seededCourseCodes,
          },
        },
      });
    }
  }

  const generatedDir = path.join(__dirname, 'generated');
  const outputPath = path.join(generatedDir, 'nust-academic-dataset.json');
  await mkdir(generatedDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(outputDataset, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        insertedOrUpdatedSchools: schoolCount,
        insertedOrUpdatedPrograms: programCount,
        insertedOrUpdatedCourses: courseCount,
        exportedDatasetFile: outputPath,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
