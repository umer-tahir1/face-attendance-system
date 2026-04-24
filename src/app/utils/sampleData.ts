import { db, Department, Program, Course, Teacher, Student } from '../services/database';

export async function initializeSampleData() {
  // Check if data already exists
  const existingDepts = await db.getAll('departments');
  if (existingDepts.length > 0) {
    return; // Sample data already loaded
  }

  // Create Departments
  const departments: Department[] = [
    { id: 'dept_1', name: 'Computer Science', code: 'CS', createdAt: new Date().toISOString() },
    { id: 'dept_2', name: 'Electrical Engineering', code: 'EE', createdAt: new Date().toISOString() },
    { id: 'dept_3', name: 'Business Administration', code: 'BBA', createdAt: new Date().toISOString() },
  ];

  for (const dept of departments) {
    await db.add('departments', dept);
  }

  // Create Programs
  const programs: Program[] = [
    { id: 'prog_1', name: 'Bachelor of Computer Science', code: 'BCS', departmentId: 'dept_1', createdAt: new Date().toISOString() },
    { id: 'prog_2', name: 'Master of Computer Science', code: 'MCS', departmentId: 'dept_1', createdAt: new Date().toISOString() },
    { id: 'prog_3', name: 'Bachelor of Electrical Engineering', code: 'BEE', departmentId: 'dept_2', createdAt: new Date().toISOString() },
    { id: 'prog_4', name: 'Bachelor of Business Administration', code: 'BBA', departmentId: 'dept_3', createdAt: new Date().toISOString() },
  ];

  for (const prog of programs) {
    await db.add('programs', prog);
  }

  // Create Courses
  const courses: Course[] = [
    { id: 'course_1', name: 'Data Structures', code: 'CS201', departmentId: 'dept_1', programId: 'prog_1', credits: 3, createdAt: new Date().toISOString() },
    { id: 'course_2', name: 'Algorithms', code: 'CS301', departmentId: 'dept_1', programId: 'prog_1', credits: 3, createdAt: new Date().toISOString() },
    { id: 'course_3', name: 'Database Systems', code: 'CS202', departmentId: 'dept_1', programId: 'prog_1', credits: 4, createdAt: new Date().toISOString() },
    { id: 'course_4', name: 'Artificial Intelligence', code: 'CS401', departmentId: 'dept_1', programId: 'prog_2', credits: 3, createdAt: new Date().toISOString() },
    { id: 'course_5', name: 'Digital Logic Design', code: 'EE101', departmentId: 'dept_2', programId: 'prog_3', credits: 4, createdAt: new Date().toISOString() },
  ];

  for (const course of courses) {
    await db.add('courses', course);
  }

  // Create Teachers
  const teachers: Teacher[] = [
    { id: 'teacher_1', name: 'Dr. Ahmed Khan', email: 'ahmed@nust.edu.pk', employeeId: 'EMP-001', departmentId: 'dept_1', assignedCourses: ['course_1', 'course_2'], createdAt: new Date().toISOString() },
    { id: 'teacher_2', name: 'Dr. Sarah Ali', email: 'sarah@nust.edu.pk', employeeId: 'EMP-002', departmentId: 'dept_1', assignedCourses: ['course_3'], createdAt: new Date().toISOString() },
    { id: 'teacher_3', name: 'Prof. Muhammad Hassan', email: 'hassan@nust.edu.pk', employeeId: 'EMP-003', departmentId: 'dept_2', assignedCourses: ['course_5'], createdAt: new Date().toISOString() },
  ];

  for (const teacher of teachers) {
    await db.add('teachers', teacher);
  }

  console.log('Sample data initialized successfully!');
}
