-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AcademicClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'A',
    "credits" INTEGER NOT NULL DEFAULT 3,
    "hasLab" BOOLEAN NOT NULL DEFAULT false,
    "labName" TEXT,
    "labAttendanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "teacherId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcademicClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AcademicClass" ("code", "createdAt", "credits", "departmentId", "id", "name", "programId", "section", "teacherId", "updatedAt") SELECT "code", "createdAt", "credits", "departmentId", "id", "name", "programId", "section", "teacherId", "updatedAt" FROM "AcademicClass";
DROP TABLE "AcademicClass";
ALTER TABLE "new_AcademicClass" RENAME TO "AcademicClass";
CREATE UNIQUE INDEX "AcademicClass_programId_code_key" ON "AcademicClass"("programId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
