/*
  Warnings:

  - Added the required column `room` to the `Timetable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AcademicClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'A',
    "credits" INTEGER NOT NULL DEFAULT 3,
    "teacherId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcademicClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AcademicClass" ("code", "createdAt", "credits", "departmentId", "id", "name", "programId", "teacherId", "updatedAt") SELECT "code", "createdAt", "credits", "departmentId", "id", "name", "programId", "teacherId", "updatedAt" FROM "AcademicClass";
DROP TABLE "AcademicClass";
ALTER TABLE "new_AcademicClass" RENAME TO "AcademicClass";
CREATE UNIQUE INDEX "AcademicClass_programId_code_key" ON "AcademicClass"("programId", "code");
CREATE TABLE "new_Timetable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicClassId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timetable_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Timetable" ("academicClassId", "createdAt", "day", "endTime", "id", "startTime", "teacherId", "updatedAt") SELECT "academicClassId", "createdAt", "day", "endTime", "id", "startTime", "teacherId", "updatedAt" FROM "Timetable";
DROP TABLE "Timetable";
ALTER TABLE "new_Timetable" RENAME TO "Timetable";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
