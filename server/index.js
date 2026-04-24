import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import {
  Prisma,
  PrismaClient,
  Role,
  DayOfWeek,
  AttendanceStatus,
  SessionStatus,
  MessagingRole,
  ConversationType,
  ConversationStatus,
  ConversationPriority,
  AttendanceIssueType,
  NotificationType,
} from '@prisma/client';
import { signAuthToken, verifyAuthToken } from './lib/auth.js';
import { matchFaces } from './lib/faceMatcher.js';

const prisma = new PrismaClient();
const app = express();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

const toRole = (role) => (role === Role.ADMIN ? 'admin' : 'teacher');

const toMessagingRole = (role) => (role === 'admin' ? MessagingRole.ADMIN : MessagingRole.TEACHER);

const toConversationType = (value) => {
  const normalized = String(value || '').toUpperCase();
  const map = {
    ATTENDANCE_ISSUE: ConversationType.ATTENDANCE_ISSUE,
    GENERAL: ConversationType.GENERAL,
    LAB_ISSUE: ConversationType.LAB_ISSUE,
  };
  return map[normalized] || ConversationType.GENERAL;
};

const toConversationStatus = (value) => {
  const normalized = String(value || '').toUpperCase();
  const map = {
    OPEN: ConversationStatus.OPEN,
    IN_REVIEW: ConversationStatus.IN_REVIEW,
    RESOLVED: ConversationStatus.RESOLVED,
    REJECTED: ConversationStatus.REJECTED,
  };
  return map[normalized];
};

const toConversationPriority = (value) => {
  const normalized = String(value || '').toUpperCase();
  const map = {
    LOW: ConversationPriority.LOW,
    MEDIUM: ConversationPriority.MEDIUM,
    HIGH: ConversationPriority.HIGH,
  };
  return map[normalized] || ConversationPriority.MEDIUM;
};

const toAttendanceIssueType = (value) => {
  const normalized = String(value || '').toUpperCase();
  const map = {
    ABSENT_MARKED_WRONG: AttendanceIssueType.ABSENT_MARKED_WRONG,
    LAB_MISSING: AttendanceIssueType.LAB_MISSING,
    ATTENDANCE_NOT_UPDATED: AttendanceIssueType.ATTENDANCE_NOT_UPDATED,
  };
  return map[normalized];
};

const toClientEnum = (value) => String(value || '').toLowerCase();

const toUserPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl || null,
  role: toRole(user.role),
  teacherId: user.teacher?.id || null,
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const parseDateOnly = (value) => {
  if (!value) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const dt = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error('Invalid date format. Use YYYY-MM-DD.'), { status: 400 });
  }
  return dt;
};

const resolveStudentForClass = async ({ tx, academicClassId, studentIdentifier }) => {
  const normalized = String(studentIdentifier || '').trim();
  if (!normalized) {
    const err = new Error('Student ID or roll number is required.');
    err.status = 400;
    throw err;
  }

  const student = await tx.student.findFirst({
    where: {
      OR: [{ id: normalized }, { rollNumber: normalized }],
    },
  });

  if (!student) {
    const err = new Error(`Student not found for '${normalized}'.`);
    err.status = 404;
    throw err;
  }

  const enrollment = await tx.enrollment.findUnique({
    where: {
      studentId_academicClassId: {
        studentId: student.id,
        academicClassId,
      },
    },
  });

  if (!enrollment) {
    const err = new Error(`Student ${student.rollNumber} is not enrolled in this class.`);
    err.status = 400;
    throw err;
  }

  return student;
};

const parseTimeToMinutes = (value) => {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return Number.NaN;
  }
  return hour * 60 + minute;
};

const rangesOverlap = (firstStart, firstEnd, secondStart, secondEnd) => {
  const startA = parseTimeToMinutes(firstStart);
  const endA = parseTimeToMinutes(firstEnd);
  const startB = parseTimeToMinutes(secondStart);
  const endB = parseTimeToMinutes(secondEnd);

  if ([startA, endA, startB, endB].some((v) => Number.isNaN(v))) {
    return false;
  }

  return startA < endB && startB < endA;
};

const getCurrentDayKey = () => {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return dayNames[new Date().getDay()];
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const authRequired = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid authorization header.');
    err.status = 401;
    throw err;
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    const err = new Error('Invalid or expired token.');
    err.status = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { teacher: true },
  });

  if (!user) {
    const err = new Error('User not found for this token.');
    err.status = 401;
    throw err;
  }

  req.user = {
    id: user.id,
    role: toRole(user.role),
    teacherId: user.teacher?.id || null,
  };

  next();
});

const requireRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    const err = new Error('Insufficient privileges.');
    err.status = 403;
    throw err;
  }
  next();
};

const mustAccessClass = async ({ user, classId }) => {
  const academicClass = await prisma.academicClass.findUnique({
    where: { id: classId },
  });

  if (!academicClass) {
    const err = new Error('Class not found.');
    err.status = 404;
    throw err;
  }

  if (user.role === 'teacher' && academicClass.teacherId !== user.teacherId) {
    const err = new Error('You can only access your assigned classes.');
    err.status = 403;
    throw err;
  }

  return academicClass;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
});

const programSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  departmentId: z.string().min(1),
});

const teacherCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  departmentId: z.string().min(1),
  employeeId: z.string().min(2),
});

const classCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  section: z.string().min(1).optional(),
  programId: z.string().min(1),
  teacherId: z.string().min(1),
  credits: z.number().int().min(1).max(6).optional(),
  hasLab: z.boolean().optional(),
  labName: z.string().min(2).optional().nullable(),
  labAttendanceRequired: z.boolean().optional(),
});

const conversationCreateSchema = z.object({
  type: z.enum(['attendance_issue', 'general', 'lab_issue']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  subject: z.string().min(3).max(180).optional(),
  relatedCourseId: z.string().min(1).optional(),
  relatedLab: z.string().min(2).optional(),
  messageText: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  attendanceIssue: z
    .object({
      studentId: z.string().optional(),
      courseName: z.string().optional(),
      labName: z.string().optional(),
      issueType: z.enum(['absent_marked_wrong', 'lab_missing', 'attendance_not_updated']).optional(),
      requestedChange: z.string().optional(),
      evidence: z.array(z.string()).optional(),
    })
    .optional(),
});

const conversationMessageCreateSchema = z.object({
  messageText: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
});

const conversationStatusUpdateSchema = z.object({
  status: z.enum(['open', 'in_review', 'resolved', 'rejected']),
  note: z.string().optional(),
});

const attendanceResolutionSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().optional(),
  status: z.enum(['present', 'absent']),
  note: z.string().optional(),
});

const studentRegisterSchema = z.object({
  name: z.string().min(2),
  rollNumber: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  programId: z.string().min(1),
  faceEncoding: z.array(z.array(z.number())).min(1),
  faceImages: z.array(z.string()).optional(),
  enrollmentClassIds: z.array(z.string()).optional(),
});

const timetableSchema = z.object({
  classId: z.string().min(1),
  day: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  room: z.string().min(1),
});

const attendanceSessionSchema = z.object({
  classId: z.string().min(1),
  date: z.string().optional(),
});

const attendanceMarkSchema = z.object({
  sessionId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  class_id: z.string().min(1).optional(),
  capturedImage: z.string().optional(),
  captured_image: z.string().optional(),
  detectedEmbeddings: z.array(z.array(z.number())).optional(),
  detected_embeddings: z.array(z.array(z.number())).optional(),
  threshold: z.number().optional(),
});

const teacherProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z
    .union([
      z.string().url(),
      z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, 'Invalid image format'),
      z.literal(''),
      z.null(),
    ])
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const manualAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(['present', 'absent']),
});

const systemDataPayloadSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  data: z.object({
    departments: z.array(z.any()).default([]),
    programs: z.array(z.any()).default([]),
    teachers: z.array(z.any()).default([]),
    classes: z.array(z.any()).default([]),
    students: z.array(z.any()).default([]),
    enrollments: z.array(z.any()).default([]),
    timetable: z.array(z.any()).default([]),
    attendanceSessions: z.array(z.any()).default([]),
    attendance: z.array(z.any()).default([]),
    conversations: z.array(z.any()).default([]),
    conversationMessages: z.array(z.any()).default([]),
    conversationAuditLogs: z.array(z.any()).default([]),
    notifications: z.array(z.any()).default([]),
  }),
});

const toValidDate = (value, fallback) => {
  const parsed = value ? new Date(value) : fallback ? new Date(fallback) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};

const toEnumValue = (enumType, value, fallback) => {
  const key = String(value || '').toUpperCase();
  if (Object.prototype.hasOwnProperty.call(enumType, key)) {
    return enumType[key];
  }
  return fallback;
};

const serializeClass = (item) => ({
  id: item.id,
  name: item.name,
  code: item.code,
  section: item.section,
  credits: item.credits,
  hasLab: item.hasLab,
  labName: item.labName,
  labAttendanceRequired: item.labAttendanceRequired,
  teacherId: item.teacherId,
  programId: item.programId,
  departmentId: item.departmentId,
  createdAt: item.createdAt,
  teacherName: item.teacher?.user?.name,
  programName: item.program?.name,
  departmentName: item.department?.name,
});

const serializeConversation = (item) => ({
  id: item.id,
  createdByUserId: item.createdByUserId,
  createdByTeacherId: item.createdByTeacherId,
  createdByName: item.createdByTeacher?.user?.name || item.createdByUser?.name || null,
  createdByEmail: item.createdByTeacher?.user?.email || item.createdByUser?.email || null,
  type: toClientEnum(item.type),
  status: toClientEnum(item.status),
  priority: toClientEnum(item.priority),
  subject: item.subject,
  relatedCourseId: item.relatedCourseId,
  relatedCourseCode: item.relatedCourse?.code || null,
  relatedCourseName: item.relatedCourse?.name || null,
  relatedLab: item.relatedLab,
  attendanceIssueType: item.attendanceIssueType ? toClientEnum(item.attendanceIssueType) : null,
  attendanceIssuePayload: item.attendanceIssuePayload || null,
  unreadCount: item._count?.messages || 0,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const serializeConversationMessage = (item) => ({
  id: item.id,
  conversationId: item.conversationId,
  senderId: item.senderId,
  senderName: item.sender?.name || null,
  senderRole: toClientEnum(item.senderRole),
  receiverRole: toClientEnum(item.receiverRole),
  messageText: item.messageText,
  attachments: Array.isArray(item.attachments) ? item.attachments : [],
  parentMessageId: item.parentMessageId,
  readStatus: item.readStatus,
  readAt: item.readAt,
  timestamp: item.createdAt,
});

const mustAccessConversation = async ({ user, conversationId }) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      createdByTeacher: {
        include: {
          user: true,
        },
      },
      createdByUser: true,
      relatedCourse: true,
    },
  });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.status = 404;
    throw err;
  }

  if (user.role === 'teacher' && conversation.createdByTeacherId !== user.teacherId) {
    const err = new Error('You can only access your own conversations.');
    err.status = 403;
    throw err;
  }

  return conversation;
};

const createNotificationsForUsers = async ({
  tx,
  userIds,
  type,
  title,
  body,
  conversationId,
  messageId,
}) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueUserIds.length === 0) {
    return;
  }

  await tx.appNotification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      conversationId,
      messageId,
    })),
  });
};

const getAdminUserIds = async (tx) => {
  const rows = await tx.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  return rows.map((row) => row.id);
};

const generateTempPassword = () => crypto.randomBytes(5).toString('base64url');

const seedDefaults = async () => {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);

  const department = await prisma.department.upsert({
    where: { code: 'CS' },
    update: { name: 'Computer Science' },
    create: { name: 'Computer Science', code: 'CS' },
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

  await prisma.user.upsert({
    where: { email: 'admin@nust.edu.pk' },
    update: {
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      name: 'System Administrator',
      email: 'admin@nust.edu.pk',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@nust.edu.pk' },
    update: {
      name: 'Default Teacher',
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
    },
    create: {
      name: 'Default Teacher',
      email: 'teacher@nust.edu.pk',
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {
      departmentId: department.id,
      employeeId: 'EMP-001',
    },
    create: {
      userId: teacherUser.id,
      departmentId: department.id,
      employeeId: 'EMP-001',
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
    const hasSlot = await prisma.timetable.findFirst({
      where: {
        teacherId: teacher.id,
        academicClassId: seededClass.id,
        day: DayOfWeek.MONDAY,
        startTime: '10:00',
      },
    });

    if (!hasSlot) {
      await prisma.timetable.create({
        data: {
          academicClassId: seededClass.id,
          teacherId: teacher.id,
          day: DayOfWeek.MONDAY,
          startTime: '10:00',
          endTime: '10:50',
          room: 'Room 101',
        },
      });
    }
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Facial Recognition Attendance API' });
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { teacher: true },
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signAuthToken({
    sub: user.id,
    role: user.role,
    teacherId: user.teacher?.id || null,
  });

  res.json({ token, user: toUserPayload(user) });
});

app.post('/api/auth/login', loginHandler);
app.post('/api/login', loginHandler);

app.get(
  '/api/auth/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacher: true },
    });

    res.json({ user: toUserPayload(user) });
  }),
);

app.get(
  '/api/admin/dashboard',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    const [students, teachers, classes, departments, programs, activeSessions] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.academicClass.count(),
      prisma.department.count(),
      prisma.program.count(),
      prisma.attendanceSession.count({ where: { status: SessionStatus.ACTIVE } }),
    ]);

    res.json({
      totalStudents: students,
      totalTeachers: teachers,
      totalClasses: classes,
      totalDepartments: departments,
      totalPrograms: programs,
      activeSessions,
    });
  }),
);

app.get(
  '/api/teacher/dashboard',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const today = parseDateOnly();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [assignedClasses, attendanceToday, timetable] = await Promise.all([
      prisma.academicClass.count({ where: { teacherId: req.user.teacherId } }),
      prisma.attendance.count({
        where: {
          teacherId: req.user.teacherId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.timetable.findMany({
        where: { teacherId: req.user.teacherId },
        include: { academicClass: true },
      }),
    ]);

    const classIds = [...new Set(timetable.map((slot) => slot.academicClassId))];
    const enrollments = classIds.length
      ? await prisma.enrollment.count({ where: { academicClassId: { in: classIds } } })
      : 0;

    res.json({
      assignedClasses,
      attendanceMarkedToday: attendanceToday,
      managedStudents: enrollments,
      timetable,
    });
  }),
);

app.get(
  '/api/teacher/profile',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.user.teacherId },
      include: {
        user: true,
        department: true,
        classes: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    res.json({
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      avatarUrl: teacher.user.avatarUrl,
      department: teacher.department.name,
      employeeId: teacher.employeeId,
      assignedCourses: teacher.classes.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        section: row.section,
      })),
    });
  }),
);

app.patch(
  '/api/teacher/profile',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const payload = teacherProfileUpdateSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: payload.name,
        avatarUrl: payload.avatarUrl === '' ? null : payload.avatarUrl,
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
    });
  }),
);

app.patch(
  '/api/teacher/password',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ success: true });
  }),
);

app.get(
  '/api/departments',
  authRequired,
  asyncHandler(async (_req, res) => {
    const rows = await prisma.department.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rows);
  }),
);

app.post(
  '/api/departments',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = departmentSchema.parse(req.body);
    const created = await prisma.department.create({ data: payload });
    res.status(201).json(created);
  }),
);

app.put(
  '/api/departments/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = departmentSchema.partial().parse(req.body);
    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: payload,
    });
    res.json(updated);
  }),
);

app.delete(
  '/api/departments/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await prisma.$transaction(async (tx) => {
      const existingDepartment = await tx.department.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!existingDepartment) {
        return false;
      }

      const teachers = await tx.teacher.findMany({
        where: { departmentId: req.params.id },
        select: { id: true, userId: true },
      });

      const teacherIds = teachers.map((row) => row.id);
      const teacherUserIds = teachers.map((row) => row.userId);

      if (teacherIds.length > 0) {
        await tx.timetable.deleteMany({
          where: {
            teacherId: { in: teacherIds },
          },
        });

        await tx.attendance.deleteMany({
          where: {
            teacherId: { in: teacherIds },
          },
        });

        await tx.attendanceSession.deleteMany({
          where: {
            teacherId: { in: teacherIds },
          },
        });
      }

      await tx.academicClass.deleteMany({
        where: { departmentId: req.params.id },
      });

      await tx.student.deleteMany({
        where: { departmentId: req.params.id },
      });

      await tx.program.deleteMany({
        where: { departmentId: req.params.id },
      });

      if (teacherUserIds.length > 0) {
        await tx.user.deleteMany({
          where: {
            id: { in: teacherUserIds },
            role: Role.TEACHER,
          },
        });
      }

      await tx.department.delete({ where: { id: req.params.id } });
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    res.status(204).send();
  }),
);

app.get(
  '/api/programs',
  authRequired,
  asyncHandler(async (_req, res) => {
    const rows = await prisma.program.findMany({
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  }),
);

app.post(
  '/api/programs',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = programSchema.parse(req.body);
    const created = await prisma.program.create({ data: payload, include: { department: true } });
    res.status(201).json(created);
  }),
);

app.put(
  '/api/programs/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = programSchema.partial().parse(req.body);
    const updated = await prisma.program.update({
      where: { id: req.params.id },
      data: payload,
      include: { department: true },
    });
    res.json(updated);
  }),
);

app.delete(
  '/api/programs/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await prisma.$transaction(async (tx) => {
      const existingProgram = await tx.program.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!existingProgram) {
        return false;
      }

      await tx.academicClass.deleteMany({
        where: { programId: req.params.id },
      });

      await tx.student.deleteMany({
        where: { programId: req.params.id },
      });

      await tx.program.delete({ where: { id: req.params.id } });
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Program not found.' });
    }

    res.status(204).send();
  }),
);

app.get(
  '/api/teachers',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.teacher.findMany({
      include: {
        user: true,
        department: true,
        classes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.user.name,
        email: row.user.email,
        role: 'teacher',
        employeeId: row.employeeId,
        departmentId: row.departmentId,
        departmentName: row.department.name,
        assignedCourses: row.classes.map((c) => c.id),
        createdAt: row.createdAt,
      })),
    );
  }),
);

app.post(
  '/api/teachers',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = teacherCreateSchema.parse(req.body);
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase().trim(),
          role: Role.TEACHER,
          passwordHash,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          departmentId: payload.departmentId,
          employeeId: payload.employeeId,
        },
      });

      return { teacher, user };
    });

    res.status(201).json({
      id: created.teacher.id,
      name: created.user.name,
      email: created.user.email,
      employeeId: created.teacher.employeeId,
      departmentId: created.teacher.departmentId,
      credentials: {
        email: created.user.email,
        temporaryPassword: tempPassword,
      },
    });
  }),
);

app.delete(
  '/api/teachers/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.params.id } });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    await prisma.user.delete({ where: { id: teacher.userId } });
    res.status(204).send();
  }),
);

app.get(
  '/api/classes',
  authRequired,
  asyncHandler(async (req, res) => {
    const where = req.user.role === 'teacher' ? { teacherId: req.user.teacherId } : {};

    const rows = await prisma.academicClass.findMany({
      where,
      include: {
        teacher: { include: { user: true } },
        program: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rows.map(serializeClass));
  }),
);

app.post(
  '/api/classes',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = classCreateSchema.parse(req.body);

    const program = await prisma.program.findUnique({ where: { id: payload.programId } });
    if (!program) {
      return res.status(404).json({ message: 'Program not found.' });
    }

    const hasLab = payload.hasLab ?? false;
    const labName = hasLab ? payload.labName || `${payload.name} Lab` : null;
    const labAttendanceRequired = hasLab ? payload.labAttendanceRequired ?? true : false;

    const created = await prisma.academicClass.create({
      data: {
        name: payload.name,
        code: payload.code,
        section: payload.section || 'A',
        teacherId: payload.teacherId,
        programId: payload.programId,
        departmentId: program.departmentId,
        credits: payload.credits ?? 3,
        hasLab,
        labName,
        labAttendanceRequired,
      },
      include: {
        teacher: { include: { user: true } },
        program: true,
        department: true,
      },
    });

    res.status(201).json(serializeClass(created));
  }),
);

app.put(
  '/api/classes/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = classCreateSchema.partial().parse(req.body);

    let departmentId;
    if (payload.programId) {
      const program = await prisma.program.findUnique({ where: { id: payload.programId } });
      if (!program) {
        return res.status(404).json({ message: 'Program not found.' });
      }
      departmentId = program.departmentId;
    }

    const updateData = {
      ...payload,
      section: payload.section,
      departmentId,
    };

    if (payload.hasLab === false) {
      updateData.labName = null;
      updateData.labAttendanceRequired = false;
    }

    if (payload.hasLab === true) {
      updateData.labAttendanceRequired = payload.labAttendanceRequired ?? true;
      if (payload.labName !== undefined) {
        updateData.labName = payload.labName;
      } else if (payload.name) {
        updateData.labName = `${payload.name} Lab`;
      }
    }

    const updated = await prisma.academicClass.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        teacher: { include: { user: true } },
        program: true,
        department: true,
      },
    });

    res.json(serializeClass(updated));
  }),
);

app.delete(
  '/api/classes/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    await prisma.academicClass.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

app.post(
  '/api/classes/:id/enrollments',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const body = z.object({ studentIds: z.array(z.string()) }).parse(req.body);
    const uniqueStudentIds = [...new Set(body.studentIds || [])];

    await prisma.enrollment.deleteMany({ where: { academicClassId: req.params.id } });

    if (uniqueStudentIds.length > 0) {
      await prisma.enrollment.createMany({
        data: uniqueStudentIds.map((studentId) => ({
          studentId,
          academicClassId: req.params.id,
        })),
      });
    }

    res.status(200).json({ success: true });
  }),
);

app.get(
  '/api/classes/:id/students',
  authRequired,
  asyncHandler(async (req, res) => {
    await mustAccessClass({ user: req.user, classId: req.params.id });

    const enrollments = await prisma.enrollment.findMany({
      where: { academicClassId: req.params.id },
      include: {
        student: true,
      },
    });

    res.json(
      enrollments.map((entry) => ({
        id: entry.student.id,
        name: entry.student.name,
        rollNumber: entry.student.rollNumber,
        email: entry.student.email,
        programId: entry.student.programId,
        departmentId: entry.student.departmentId,
        faceDescriptors: entry.student.faceEncoding,
        faceImages: Array.isArray(entry.student.faceImages) ? entry.student.faceImages : [],
        createdAt: entry.student.createdAt,
      })),
    );
  }),
);

app.get(
  '/api/students',
  authRequired,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') {
      const rows = await prisma.student.findMany({
        include: {
          enrollments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          rollNumber: row.rollNumber,
          email: row.email,
          programId: row.programId,
          departmentId: row.departmentId,
          enrolledCourses: row.enrollments.map((e) => e.academicClassId),
          faceDescriptors: row.faceEncoding,
          faceImages: Array.isArray(row.faceImages) ? row.faceImages : [],
          createdAt: row.createdAt,
        })),
      );
    }

    const rows = await prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            academicClass: {
              teacherId: req.user.teacherId,
            },
          },
        },
      },
      include: { enrollments: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        rollNumber: row.rollNumber,
        email: row.email,
        programId: row.programId,
        departmentId: row.departmentId,
        enrolledCourses: row.enrollments.map((e) => e.academicClassId),
        faceDescriptors: row.faceEncoding,
        faceImages: Array.isArray(row.faceImages) ? row.faceImages : [],
        createdAt: row.createdAt,
      })),
    );
  }),
);

app.post(
  '/api/students/register',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = studentRegisterSchema.parse(req.body);

    const program = await prisma.program.findUnique({ where: { id: payload.programId } });
    if (!program) {
      return res.status(404).json({ message: 'Program not found.' });
    }

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const normalizedEnrollmentIds = [...new Set(payload.enrollmentClassIds || [])];

        if (normalizedEnrollmentIds.length > 0) {
          const selectedClasses = await tx.academicClass.findMany({
            where: { id: { in: normalizedEnrollmentIds } },
            select: { id: true, programId: true },
          });

          if (selectedClasses.length !== normalizedEnrollmentIds.length) {
            const err = new Error('One or more selected classes are invalid. Please refresh and try again.');
            err.status = 400;
            throw err;
          }

          const hasProgramMismatch = selectedClasses.some((row) => row.programId !== payload.programId);
          if (hasProgramMismatch) {
            const err = new Error('Selected classes must belong to the selected program.');
            err.status = 400;
            throw err;
          }
        }

        const student = await tx.student.create({
          data: {
            name: payload.name,
            rollNumber: payload.rollNumber,
            email: payload.email || null,
            programId: payload.programId,
            departmentId: program.departmentId,
            faceEncoding: payload.faceEncoding,
            faceImages: payload.faceImages || [],
          },
        });

        if (normalizedEnrollmentIds.length > 0) {
          await tx.enrollment.createMany({
            data: normalizedEnrollmentIds.map((classId) => ({
              studentId: student.id,
              academicClassId: classId,
            })),
          });
        }

        return student;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(409).json({ message: 'A student with this roll number already exists.' });
        }

        if (error.code === 'P2003') {
          return res.status(400).json({
            message: 'Invalid class selection. Please refresh classes and try again.',
          });
        }
      }

      throw error;
    }

    res.status(201).json(created);
  }),
);

app.delete(
  '/api/students/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

app.get(
  '/api/timetable',
  authRequired,
  asyncHandler(async (req, res) => {
    const where = req.user.role === 'teacher' ? { teacherId: req.user.teacherId } : {};
    const rows = await prisma.timetable.findMany({
      where,
      include: {
        academicClass: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    res.json(
      rows.map((row) => ({
        id: row.id,
        classId: row.academicClassId,
        courseId: row.academicClassId,
        teacherId: row.teacherId,
        day: row.day,
        dayOfWeek: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
        room: row.room,
        section: row.academicClass.section,
        className: row.academicClass.name,
        classCode: row.academicClass.code,
      })),
    );
  }),
);

app.post(
  '/api/timetable',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = timetableSchema.parse(req.body);
    const academicClass = await prisma.academicClass.findUnique({ where: { id: payload.classId } });

    if (!academicClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const dayKey = payload.day.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(DayOfWeek, dayKey)) {
      return res.status(400).json({ message: 'Invalid day value.' });
    }

    if (parseTimeToMinutes(payload.startTime) >= parseTimeToMinutes(payload.endTime)) {
      return res.status(400).json({ message: 'startTime must be before endTime.' });
    }

    const existingSlots = await prisma.timetable.findMany({
      where: {
        teacherId: academicClass.teacherId,
        day: DayOfWeek[dayKey],
      },
    });

    const hasOverlap = existingSlots.some((slot) =>
      rangesOverlap(slot.startTime, slot.endTime, payload.startTime, payload.endTime),
    );

    if (hasOverlap) {
      return res.status(409).json({ message: 'Timetable overlap detected for this teacher.' });
    }

    const created = await prisma.timetable.create({
      data: {
        academicClassId: payload.classId,
        teacherId: academicClass.teacherId,
        day: DayOfWeek[dayKey],
        startTime: payload.startTime,
        endTime: payload.endTime,
        room: payload.room,
      },
    });

    res.status(201).json(created);
  }),
);

app.delete(
  '/api/timetable/:id',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    await prisma.timetable.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

app.get(
  '/api/attendance/sessions',
  authRequired,
  asyncHandler(async (req, res) => {
    const where = {
      ...(req.user.role === 'teacher' ? { teacherId: req.user.teacherId } : {}),
      ...(req.query.status ? { status: String(req.query.status).toUpperCase() } : {}),
    };

    const rows = await prisma.attendanceSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      rows.map((row) => ({
        id: row.id,
        courseId: row.academicClassId,
        classId: row.academicClassId,
        teacherId: row.teacherId,
        date: row.date.toISOString().split('T')[0],
        status: row.status.toLowerCase(),
        createdAt: row.createdAt,
      })),
    );
  }),
);

app.post(
  '/api/attendance/sessions',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const payload = attendanceSessionSchema.parse(req.body);
    const academicClass = await mustAccessClass({ user: req.user, classId: payload.classId });

    const dayKey = getCurrentDayKey();
    const nowMinutes = getCurrentMinutes();
    const activeSlots = await prisma.timetable.findMany({
      where: {
        teacherId: req.user.teacherId,
        academicClassId: payload.classId,
        day: DayOfWeek[dayKey],
      },
    });

    const slotsNow = activeSlots.filter((slot) => {
      const start = parseTimeToMinutes(slot.startTime);
      const end = parseTimeToMinutes(slot.endTime);
      return start <= nowMinutes && nowMinutes <= end;
    });

    if (slotsNow.length === 0) {
      return res.status(400).json({ message: 'No class scheduled at this time.' });
    }

    if (slotsNow.length > 1) {
      return res.status(409).json({ message: 'Multiple overlapping classes are active.' });
    }

    const sessionDate = parseDateOnly(payload.date);
    const completedForToday = await prisma.attendanceSession.findFirst({
      where: {
        academicClassId: payload.classId,
        teacherId: req.user.teacherId,
        date: sessionDate,
        status: SessionStatus.COMPLETED,
      },
    });

    if (completedForToday) {
      return res.status(409).json({
        message: 'Attendance for this class is already completed today.',
      });
    }

    const existing = await prisma.attendanceSession.findFirst({
      where: {
        academicClassId: payload.classId,
        teacherId: req.user.teacherId,
        date: sessionDate,
        status: SessionStatus.ACTIVE,
      },
    });

    if (existing) {
      return res.status(200).json({
        id: existing.id,
        courseId: existing.academicClassId,
        classId: existing.academicClassId,
        teacherId: existing.teacherId,
        date: existing.date.toISOString().split('T')[0],
        status: existing.status.toLowerCase(),
        createdAt: existing.createdAt,
      });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        academicClassId: payload.classId,
        teacherId: req.user.teacherId,
        date: sessionDate,
        status: SessionStatus.ACTIVE,
      },
    });

    res.status(201).json({
      id: session.id,
      courseId: session.academicClassId,
      classId: session.academicClassId,
      teacherId: session.teacherId,
      date: session.date.toISOString().split('T')[0],
      status: session.status.toLowerCase(),
      createdAt: session.createdAt,
    });
  }),
);

app.patch(
  '/api/attendance/sessions/:id/complete',
  authRequired,
  asyncHandler(async (req, res) => {
    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await mustAccessClass({ user: req.user, classId: session.academicClassId });

    const updated = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { status: SessionStatus.COMPLETED },
    });

    res.json(updated);
  }),
);

app.post(
  '/api/attendance/mark',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const payload = attendanceMarkSchema.parse(req.body);
    const classId = payload.classId || payload.class_id;
    const detectedEmbeddings = payload.detectedEmbeddings || payload.detected_embeddings || [];

    if (!classId) {
      return res.status(400).json({ message: 'classId is required.' });
    }

    await mustAccessClass({ user: req.user, classId });

    let session;
    if (payload.sessionId) {
      session = await prisma.attendanceSession.findUnique({
        where: { id: payload.sessionId },
        include: {
          academicClass: {
            include: {
              enrollments: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ message: 'Session not found.' });
      }

      if (session.status !== SessionStatus.ACTIVE) {
        return res.status(409).json({ message: 'This attendance session is already completed.' });
      }

      if (session.academicClassId !== classId) {
        return res.status(400).json({ message: 'Session does not belong to selected class.' });
      }
    } else {
      const today = parseDateOnly();
      session = await prisma.attendanceSession.findFirst({
        where: {
          academicClassId: classId,
          teacherId: req.user.role === 'teacher' ? req.user.teacherId : undefined,
          date: today,
          status: SessionStatus.ACTIVE,
        },
        include: {
          academicClass: {
            include: {
              enrollments: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        const createdSession = await prisma.attendanceSession.create({
          data: {
            academicClassId: classId,
            teacherId: req.user.teacherId,
            date: today,
            status: SessionStatus.ACTIVE,
          },
        });

        session = await prisma.attendanceSession.findUnique({
          where: { id: createdSession.id },
          include: {
            academicClass: {
              include: {
                enrollments: {
                  include: {
                    student: true,
                  },
                },
              },
            },
          },
        });
      }
    }

    if (!session) {
      return res.status(500).json({ message: 'Unable to initialize attendance session.' });
    }

    const students = session.academicClass.enrollments.map((entry) => entry.student);

    if (detectedEmbeddings.length === 0) {
      return res.status(400).json({ message: 'No faces detected from captured image.' });
    }

    const matches = matchFaces({
      detectedEmbeddings,
      enrolledStudents: students,
      threshold: payload.threshold,
    });

    const presentByStudent = new Map(matches.map((item) => [item.studentId, item]));

    await prisma.$transaction(
      students.map((student) =>
        prisma.attendance.upsert({
          where: {
            studentId_academicClassId_date: {
              studentId: student.id,
              academicClassId: session.academicClassId,
              date: session.date,
            },
          },
          update: {
            status: presentByStudent.has(student.id) ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
            confidence: presentByStudent.get(student.id)?.confidence ?? null,
            method: 'ai',
            teacherId: session.teacherId,
          },
          create: {
            studentId: student.id,
            academicClassId: session.academicClassId,
            date: session.date,
            status: presentByStudent.has(student.id) ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
            confidence: presentByStudent.get(student.id)?.confidence ?? null,
            method: 'ai',
            teacherId: session.teacherId,
          },
        }),
      ),
    );

    res.json({
      success: true,
      results: matches,
      presentCount: matches.length,
      absentCount: Math.max(0, students.length - matches.length),
      totalStudents: students.length,
      unknownFaces: Math.max(0, detectedEmbeddings.length - matches.length),
      sessionId: session.id,
    });
  }),
);

app.post(
  '/api/attendance/manual',
  authRequired,
  asyncHandler(async (req, res) => {
    const payload = manualAttendanceSchema.parse(req.body);

    const session = await prisma.attendanceSession.findUnique({ where: { id: payload.sessionId } });
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await mustAccessClass({ user: req.user, classId: session.academicClassId });

    const status = payload.status === 'present' ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

    const student = await resolveStudentForClass({
      tx: prisma,
      academicClassId: session.academicClassId,
      studentIdentifier: payload.studentId,
    });

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_academicClassId_date: {
          studentId: student.id,
          academicClassId: session.academicClassId,
          date: session.date,
        },
      },
      update: {
        status,
        method: 'manual',
        confidence: null,
        teacherId: session.teacherId,
      },
      create: {
        studentId: student.id,
        academicClassId: session.academicClassId,
        date: session.date,
        status,
        method: 'manual',
        confidence: null,
        teacherId: session.teacherId,
      },
    });

    res.json(attendance);
  }),
);

app.get(
  '/api/attendance/report',
  authRequired,
  asyncHandler(async (req, res) => {
    const classId = String(req.query.classId || '');
    if (!classId) {
      return res.status(400).json({ message: 'classId query parameter is required.' });
    }

    const academicClass = await mustAccessClass({ user: req.user, classId });

    const [enrollments, attendances, sessions] = await Promise.all([
      prisma.enrollment.findMany({
        where: { academicClassId: classId },
        include: { student: true },
      }),
      prisma.attendance.findMany({
        where: { academicClassId: classId },
      }),
      prisma.attendanceSession.findMany({
        where: {
          academicClassId: classId,
          status: SessionStatus.COMPLETED,
        },
      }),
    ]);

    const totalSessions = sessions.length;

    const students = enrollments.map((entry) => {
      const studentRecords = attendances.filter((a) => a.studentId === entry.studentId);
      const attendedSessions = studentRecords.filter((record) => record.status === AttendanceStatus.PRESENT).length;
      const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

      return {
        student: {
          id: entry.student.id,
          name: entry.student.name,
          rollNumber: entry.student.rollNumber,
        },
        stats: {
          totalSessions,
          attendedSessions,
          attendancePercentage,
        },
        records: studentRecords.map((record) => ({
          id: record.id,
          status: record.status.toLowerCase(),
          date: record.date.toISOString().split('T')[0],
          confidence: record.confidence,
        })),
      };
    });

    const monthlyMap = new Map();
    for (const row of attendances) {
      const key = row.date.toISOString().slice(0, 7);
      const current = monthlyMap.get(key) || { month: key, present: 0, total: 0 };
      current.total += 1;
      if (row.status === AttendanceStatus.PRESENT) {
        current.present += 1;
      }
      monthlyMap.set(key, current);
    }

    const monthlyTrend = [...monthlyMap.values()]
      .map((row) => ({
        month: row.month,
        present: row.present,
        absent: row.total - row.present,
        percentage: row.total > 0 ? (row.present / row.total) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const classStats = {
      totalStudents: students.length,
      totalSessions,
      averageAttendance:
        students.length > 0
          ? students.reduce((sum, row) => sum + row.stats.attendancePercentage, 0) / students.length
          : 0,
      defaulters: students.filter((row) => row.stats.attendancePercentage < 75).length,
    };

    res.json({
      class: {
        id: academicClass.id,
        name: academicClass.name,
        code: academicClass.code,
      },
      students,
      classStats,
      monthlyTrend,
    });
  }),
);

app.get(
  '/api/teacher/classes',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const classes = await prisma.academicClass.findMany({
      where: { teacherId: req.user.teacherId },
      include: {
        program: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(classes.map(serializeClass));
  }),
);

app.get(
  '/api/teacher/timetable',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const dayFilter = req.query.day ? String(req.query.day).toUpperCase() : null;
    const timetable = await prisma.timetable.findMany({
      where: { teacherId: req.user.teacherId },
      include: {
        academicClass: true,
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    const filtered = dayFilter
      ? timetable.filter((slot) => slot.day === dayFilter)
      : timetable;

    res.json(
      filtered.map((row) => ({
        id: row.id,
        classId: row.academicClassId,
        className: row.academicClass.name,
        classCode: row.academicClass.code,
        section: row.academicClass.section,
        room: row.room,
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
      })),
    );
  }),
);

app.get(
  '/api/teacher/today-schedule',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const todayKey = getCurrentDayKey();
    const nowMinutes = getCurrentMinutes();

    const rows = await prisma.timetable.findMany({
      where: {
        teacherId: req.user.teacherId,
        day: DayOfWeek[todayKey],
      },
      include: {
        academicClass: true,
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const schedule = rows.map((row) => {
      const startMinutes = parseTimeToMinutes(row.startTime);
      const endMinutes = parseTimeToMinutes(row.endTime);
      const isActive = startMinutes <= nowMinutes && nowMinutes <= endMinutes;

      return {
        class_id: row.academicClassId,
        course_name: row.academicClass.name,
        class_code: row.academicClass.code,
        section: row.academicClass.section,
        room: row.room,
        day: row.day,
        start_time: row.startTime,
        end_time: row.endTime,
        is_active: isActive,
      };
    });

    res.json({ schedule });
  }),
);

app.get(
  '/api/teacher/current-class',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const todayKey = getCurrentDayKey();
    const nowMinutes = getCurrentMinutes();

    const rows = await prisma.timetable.findMany({
      where: {
        teacherId: req.user.teacherId,
        day: DayOfWeek[todayKey],
      },
      include: {
        academicClass: true,
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const active = rows.filter((row) => {
      const startMinutes = parseTimeToMinutes(row.startTime);
      const endMinutes = parseTimeToMinutes(row.endTime);
      return startMinutes <= nowMinutes && nowMinutes <= endMinutes;
    });

    if (active.length > 1) {
      return res.status(409).json({
        message: 'Multiple overlapping classes are active. Please contact admin.',
      });
    }

    if (active.length === 0) {
      return res.json({ currentClass: null });
    }

    const row = active[0];
    return res.json({
      currentClass: {
        class_id: row.academicClassId,
        course_name: row.academicClass.name,
        class_code: row.academicClass.code,
        section: row.academicClass.section,
        room: row.room,
        start_time: row.startTime,
        end_time: row.endTime,
      },
    });
  }),
);

app.get(
  '/api/communication/conversations',
  authRequired,
  asyncHandler(async (req, res) => {
    const where = {};

    if (req.user.role === 'teacher') {
      where.createdByTeacherId = req.user.teacherId;
    }

    if (req.user.role === 'admin') {
      if (req.query.teacherId) {
        where.createdByTeacherId = String(req.query.teacherId);
      }
    }

    if (req.query.status) {
      const status = toConversationStatus(req.query.status);
      if (status) where.status = status;
    }

    if (req.query.priority) {
      where.priority = toConversationPriority(req.query.priority);
    }

    if (req.query.type) {
      where.type = toConversationType(req.query.type);
    }

    if (req.query.courseId) {
      where.relatedCourseId = String(req.query.courseId);
    }

    const rows = await prisma.conversation.findMany({
      where,
      include: {
        createdByTeacher: {
          include: {
            user: true,
          },
        },
        createdByUser: true,
        relatedCourse: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const receiverRole = toMessagingRole(req.user.role);
    const serialized = await Promise.all(
      rows.map(async (row) => {
        const unreadCount = await prisma.conversationMessage.count({
          where: {
            conversationId: row.id,
            receiverRole,
            readStatus: false,
          },
        });

        return serializeConversation({
          ...row,
          _count: { messages: unreadCount },
        });
      }),
    );

    res.json(serialized);
  }),
);

app.post(
  '/api/communication/conversations',
  authRequired,
  requireRoles('teacher'),
  asyncHandler(async (req, res) => {
    const payload = conversationCreateSchema.parse(req.body);

    if (payload.type === 'attendance_issue' && !payload.attendanceIssue?.issueType) {
      return res.status(400).json({ message: 'attendanceIssue.issueType is required for attendance issues.' });
    }

    if (payload.type === 'lab_issue' && !(payload.relatedLab || payload.attendanceIssue?.labName)) {
      return res.status(400).json({ message: 'relatedLab is required for lab issues.' });
    }

    const relatedLab = payload.relatedLab || payload.attendanceIssue?.labName || null;
    const issueType = toAttendanceIssueType(payload.attendanceIssue?.issueType);

    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          createdByUserId: req.user.id,
          createdByTeacherId: req.user.teacherId,
          type: toConversationType(payload.type),
          status: ConversationStatus.OPEN,
          priority: toConversationPriority(payload.priority),
          subject: payload.subject || null,
          relatedCourseId: payload.relatedCourseId || null,
          relatedLab,
          attendanceIssueType: issueType,
          attendanceIssuePayload: payload.attendanceIssue || null,
        },
      });

      const message = await tx.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user.id,
          senderRole: MessagingRole.TEACHER,
          receiverRole: MessagingRole.ADMIN,
          messageText: payload.messageText,
          attachments: payload.attachments || [],
        },
      });

      const adminUserIds = await getAdminUserIds(tx);
      await createNotificationsForUsers({
        tx,
        userIds: adminUserIds,
        type: NotificationType.NEW_CONVERSATION,
        title: 'New attendance conversation',
        body: payload.subject || payload.messageText.slice(0, 120),
        conversationId: conversation.id,
        messageId: message.id,
      });

      await tx.conversationAuditLog.create({
        data: {
          conversationId: conversation.id,
          actorId: req.user.id,
          actorRole: MessagingRole.TEACHER,
          action: 'CONVERSATION_CREATED',
          details: {
            type: payload.type,
            priority: payload.priority || 'medium',
          },
        },
      });

      return conversation;
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: created.id },
      include: {
        createdByTeacher: { include: { user: true } },
        createdByUser: true,
        relatedCourse: true,
      },
    });

    res.status(201).json(serializeConversation(conversation));
  }),
);

app.get(
  '/api/communication/conversations/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const conversation = await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    const unreadCount = await prisma.conversationMessage.count({
      where: {
        conversationId: conversation.id,
        receiverRole: toMessagingRole(req.user.role),
        readStatus: false,
      },
    });

    res.json(
      serializeConversation({
        ...conversation,
        _count: { messages: unreadCount },
      }),
    );
  }),
);

app.get(
  '/api/communication/conversations/:id/messages',
  authRequired,
  asyncHandler(async (req, res) => {
    await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    const rows = await prisma.conversationMessage.findMany({
      where: { conversationId: req.params.id },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(rows.map(serializeConversationMessage));
  }),
);

app.patch(
  '/api/communication/conversations/:id/messages/read',
  authRequired,
  asyncHandler(async (req, res) => {
    await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    const result = await prisma.conversationMessage.updateMany({
      where: {
        conversationId: req.params.id,
        receiverRole: toMessagingRole(req.user.role),
        readStatus: false,
      },
      data: {
        readStatus: true,
        readAt: new Date(),
      },
    });

    res.json({ updated: result.count });
  }),
);

app.post(
  '/api/communication/conversations/:id/messages',
  authRequired,
  requireRoles('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const payload = conversationMessageCreateSchema.parse(req.body);
    const conversation = await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    if (payload.parentMessageId) {
      const parent = await prisma.conversationMessage.findUnique({
        where: { id: payload.parentMessageId },
      });

      if (!parent || parent.conversationId !== req.params.id) {
        return res.status(400).json({ message: 'parentMessageId is invalid for this conversation.' });
      }
    }

    const senderRole = toMessagingRole(req.user.role);
    const receiverRole = senderRole === MessagingRole.ADMIN ? MessagingRole.TEACHER : MessagingRole.ADMIN;

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.conversationMessage.create({
        data: {
          conversationId: req.params.id,
          senderId: req.user.id,
          senderRole,
          receiverRole,
          messageText: payload.messageText,
          attachments: payload.attachments || [],
          parentMessageId: payload.parentMessageId || null,
        },
        include: {
          sender: true,
        },
      });

      await tx.conversation.update({
        where: { id: req.params.id },
        data: {
          updatedAt: new Date(),
          status:
            req.user.role === 'admin' && conversation.status === ConversationStatus.OPEN
              ? ConversationStatus.IN_REVIEW
              : undefined,
        },
      });

      if (receiverRole === MessagingRole.ADMIN) {
        const adminUserIds = (await getAdminUserIds(tx)).filter((id) => id !== req.user.id);
        await createNotificationsForUsers({
          tx,
          userIds: adminUserIds,
          type: NotificationType.NEW_MESSAGE,
          title: 'New teacher message',
          body: payload.messageText.slice(0, 120),
          conversationId: req.params.id,
          messageId: message.id,
        });
      } else if (conversation.createdByUserId) {
        await createNotificationsForUsers({
          tx,
          userIds: [conversation.createdByUserId],
          type: NotificationType.NEW_MESSAGE,
          title: 'Admin replied to your issue',
          body: payload.messageText.slice(0, 120),
          conversationId: req.params.id,
          messageId: message.id,
        });
      }

      await tx.conversationAuditLog.create({
        data: {
          conversationId: req.params.id,
          actorId: req.user.id,
          actorRole: senderRole,
          action: 'MESSAGE_SENT',
          details: {
            parentMessageId: payload.parentMessageId || null,
          },
        },
      });

      return message;
    });

    res.status(201).json(serializeConversationMessage(created));
  }),
);

app.patch(
  '/api/communication/conversations/:id/status',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = conversationStatusUpdateSchema.parse(req.body);
    const nextStatus = toConversationStatus(payload.status);
    if (!nextStatus) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const conversation = await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.conversation.update({
        where: { id: req.params.id },
        data: {
          status: nextStatus,
        },
        include: {
          createdByTeacher: { include: { user: true } },
          createdByUser: true,
          relatedCourse: true,
        },
      });

      await tx.conversationAuditLog.create({
        data: {
          conversationId: req.params.id,
          actorId: req.user.id,
          actorRole: MessagingRole.ADMIN,
          action: 'STATUS_UPDATED',
          details: {
            from: conversation.status,
            to: nextStatus,
            note: payload.note || null,
          },
        },
      });

      if (row.createdByUserId) {
        await createNotificationsForUsers({
          tx,
          userIds: [row.createdByUserId],
          type: NotificationType.STATUS_CHANGED,
          title: 'Conversation status updated',
          body: `Status changed to ${toClientEnum(nextStatus)}`,
          conversationId: row.id,
        });
      }

      return row;
    });

    res.json(serializeConversation(updated));
  }),
);

app.post(
  '/api/communication/conversations/:id/resolve-attendance',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = attendanceResolutionSchema.parse(req.body);

    const conversation = await mustAccessConversation({
      user: req.user,
      conversationId: req.params.id,
    });

    if (!conversation.relatedCourseId) {
      return res.status(400).json({ message: 'Conversation has no related course for attendance correction.' });
    }

    const academicClass = await prisma.academicClass.findUnique({ where: { id: conversation.relatedCourseId } });
    if (!academicClass) {
      return res.status(404).json({ message: 'Related class not found.' });
    }

    const attendanceDate = parseDateOnly(payload.date);
    const status = payload.status === 'present' ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

    await prisma.$transaction(async (tx) => {
      const student = await resolveStudentForClass({
        tx,
        academicClassId: academicClass.id,
        studentIdentifier: payload.studentId,
      });

      await tx.attendance.upsert({
        where: {
          studentId_academicClassId_date: {
            studentId: student.id,
            academicClassId: academicClass.id,
            date: attendanceDate,
          },
        },
        update: {
          status,
          method: 'manual',
          confidence: null,
          teacherId: academicClass.teacherId,
        },
        create: {
          studentId: student.id,
          academicClassId: academicClass.id,
          date: attendanceDate,
          status,
          method: 'manual',
          confidence: null,
          teacherId: academicClass.teacherId,
        },
      });

      await tx.conversation.update({
        where: { id: req.params.id },
        data: {
          status: ConversationStatus.RESOLVED,
        },
      });

      await tx.conversationAuditLog.create({
        data: {
          conversationId: req.params.id,
          actorId: req.user.id,
          actorRole: MessagingRole.ADMIN,
          action: 'ATTENDANCE_RESOLVED',
          details: {
            studentId: student.id,
            studentRollNumber: student.rollNumber,
            classId: academicClass.id,
            date: attendanceDate.toISOString().split('T')[0],
            status,
            note: payload.note || null,
          },
        },
      });

      if (conversation.createdByUserId) {
        await createNotificationsForUsers({
          tx,
          userIds: [conversation.createdByUserId],
          type: NotificationType.STATUS_CHANGED,
          title: 'Attendance issue resolved',
          body: `Attendance has been updated for student ${student.rollNumber}.`,
          conversationId: req.params.id,
        });
      }
    });

    res.json({ success: true, status: 'resolved' });
  }),
);

app.get(
  '/api/communication/notifications',
  authRequired,
  asyncHandler(async (req, res) => {
    const unreadOnly = String(req.query.unreadOnly || 'false').toLowerCase() === 'true';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));

    const rows = await prisma.appNotification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(
      rows.map((row) => ({
        id: row.id,
        type: toClientEnum(row.type),
        title: row.title,
        body: row.body,
        conversationId: row.conversationId,
        messageId: row.messageId,
        isRead: row.isRead,
        createdAt: row.createdAt,
      })),
    );
  }),
);

app.patch(
  '/api/communication/notifications/:id/read',
  authRequired,
  asyncHandler(async (req, res) => {
    const result = await prisma.appNotification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: {
        isRead: true,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ success: true });
  }),
);

app.patch(
  '/api/communication/notifications/read-all',
  authRequired,
  asyncHandler(async (req, res) => {
    const result = await prisma.appNotification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({ updated: result.count });
  }),
);

app.get(
  '/api/admin/communication/summary',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    const [open, inReview, resolved, rejected, highPriority] = await Promise.all([
      prisma.conversation.count({ where: { status: ConversationStatus.OPEN } }),
      prisma.conversation.count({ where: { status: ConversationStatus.IN_REVIEW } }),
      prisma.conversation.count({ where: { status: ConversationStatus.RESOLVED } }),
      prisma.conversation.count({ where: { status: ConversationStatus.REJECTED } }),
      prisma.conversation.count({
        where: {
          priority: ConversationPriority.HIGH,
          status: { in: [ConversationStatus.OPEN, ConversationStatus.IN_REVIEW] },
        },
      }),
    ]);

    res.json({ open, inReview, resolved, rejected, highPriority });
  }),
);

app.post(
  '/api/admin/reset',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    await prisma.$transaction([
      prisma.appNotification.deleteMany(),
      prisma.conversationMessage.deleteMany(),
      prisma.conversationAuditLog.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.attendanceSession.deleteMany(),
      prisma.timetable.deleteMany(),
      prisma.enrollment.deleteMany(),
      prisma.academicClass.deleteMany(),
      prisma.student.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.program.deleteMany(),
      prisma.department.deleteMany(),
      prisma.user.deleteMany({ where: { role: Role.TEACHER } }),
    ]);

    await seedDefaults();
    res.json({ success: true });
  }),
);

app.get(
  '/api/admin/export',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    const [
      departments,
      programs,
      teacherRows,
      classes,
      students,
      enrollments,
      timetable,
      attendanceSessions,
      attendance,
      conversations,
      conversationMessages,
      conversationAuditLogs,
      notifications,
    ] =
      await Promise.all([
        prisma.department.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.program.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } }),
        prisma.academicClass.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.student.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.enrollment.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.timetable.findMany({ orderBy: [{ day: 'asc' }, { startTime: 'asc' }] }),
        prisma.attendanceSession.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.attendance.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.conversation.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.conversationMessage.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.conversationAuditLog.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.appNotification.findMany({ orderBy: { createdAt: 'asc' } }),
      ]);

    const teachers = teacherRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      passwordHash: row.user.passwordHash,
      avatarUrl: row.user.avatarUrl,
      departmentId: row.departmentId,
      employeeId: row.employeeId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userCreatedAt: row.user.createdAt,
      userUpdatedAt: row.user.updatedAt,
    }));

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        departments,
        programs,
        teachers,
        classes,
        students,
        enrollments,
        timetable,
        attendanceSessions,
        attendance,
        conversations,
        conversationMessages,
        conversationAuditLogs,
        notifications,
      },
    });
  }),
);

app.post(
  '/api/admin/import',
  authRequired,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const payload = systemDataPayloadSchema.parse(req.body);
    const data = payload.data;
    const fallbackTeacherPasswordHash = await bcrypt.hash('teacher123', 10);

    await prisma.$transaction(async (tx) => {
      await tx.appNotification.deleteMany();
      await tx.conversationMessage.deleteMany();
      await tx.conversationAuditLog.deleteMany();
      await tx.conversation.deleteMany();
      await tx.attendance.deleteMany();
      await tx.attendanceSession.deleteMany();
      await tx.timetable.deleteMany();
      await tx.enrollment.deleteMany();
      await tx.academicClass.deleteMany();
      await tx.student.deleteMany();
      await tx.teacher.deleteMany();
      await tx.program.deleteMany();
      await tx.department.deleteMany();
      await tx.user.deleteMany({ where: { role: Role.TEACHER } });

      for (const row of data.departments) {
        const createData = {
          id: row.id,
          name: row.name,
          code: row.code,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) createData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) createData.updatedAt = updatedAt;
        await tx.department.create({ data: createData });
      }

      for (const row of data.programs) {
        const createData = {
          id: row.id,
          name: row.name,
          code: row.code,
          departmentId: row.departmentId,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) createData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) createData.updatedAt = updatedAt;
        await tx.program.create({ data: createData });
      }

      for (const row of data.teachers) {
        const userId = row.userId || `user_${row.id}`;

        const userData = {
          id: userId,
          name: row.name,
          email: String(row.email || '').toLowerCase().trim(),
          passwordHash: row.passwordHash || fallbackTeacherPasswordHash,
          avatarUrl: row.avatarUrl || null,
          role: Role.TEACHER,
        };
        const userCreatedAt = toValidDate(row.userCreatedAt || row.createdAt);
        if (userCreatedAt) userData.createdAt = userCreatedAt;
        const userUpdatedAt = toValidDate(row.userUpdatedAt || row.updatedAt);
        if (userUpdatedAt) userData.updatedAt = userUpdatedAt;
        await tx.user.create({ data: userData });

        const teacherData = {
          id: row.id,
          userId,
          departmentId: row.departmentId,
          employeeId: row.employeeId,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) teacherData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) teacherData.updatedAt = updatedAt;
        await tx.teacher.create({ data: teacherData });
      }

      for (const row of data.classes) {
        const classData = {
          id: row.id,
          name: row.name,
          code: row.code,
          section: row.section || 'A',
          credits: Number.isFinite(Number(row.credits)) ? Number(row.credits) : 3,
          hasLab: Boolean(row.hasLab),
          labName: row.labName || null,
          labAttendanceRequired: Boolean(row.labAttendanceRequired),
          teacherId: row.teacherId,
          programId: row.programId,
          departmentId: row.departmentId,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) classData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) classData.updatedAt = updatedAt;
        await tx.academicClass.create({ data: classData });
      }

      for (const row of data.students) {
        const studentData = {
          id: row.id,
          name: row.name,
          rollNumber: row.rollNumber,
          email: row.email || null,
          programId: row.programId,
          departmentId: row.departmentId,
          faceEncoding: row.faceEncoding ?? row.faceDescriptors ?? [],
          faceImages: row.faceImages || [],
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) studentData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) studentData.updatedAt = updatedAt;
        await tx.student.create({ data: studentData });
      }

      for (const row of data.enrollments) {
        const enrollmentData = {
          id: row.id,
          studentId: row.studentId,
          academicClassId: row.academicClassId,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) enrollmentData.createdAt = createdAt;
        await tx.enrollment.create({ data: enrollmentData });
      }

      for (const row of data.timetable) {
        const day = toEnumValue(DayOfWeek, row.day, null);
        if (!day) {
          throw Object.assign(new Error('Invalid timetable day in import payload.'), { status: 400 });
        }

        const timetableData = {
          id: row.id,
          academicClassId: row.academicClassId,
          teacherId: row.teacherId,
          day,
          startTime: row.startTime,
          endTime: row.endTime,
          room: row.room,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) timetableData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) timetableData.updatedAt = updatedAt;
        await tx.timetable.create({ data: timetableData });
      }

      for (const row of data.attendanceSessions) {
        const status = toEnumValue(SessionStatus, row.status, SessionStatus.ACTIVE);
        const sessionData = {
          id: row.id,
          academicClassId: row.academicClassId,
          teacherId: row.teacherId,
          date: toValidDate(row.date) || parseDateOnly(),
          status,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) sessionData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) sessionData.updatedAt = updatedAt;
        await tx.attendanceSession.create({ data: sessionData });
      }

      for (const row of data.attendance) {
        const status = toEnumValue(AttendanceStatus, row.status, AttendanceStatus.ABSENT);
        const attendanceData = {
          id: row.id,
          studentId: row.studentId,
          academicClassId: row.academicClassId,
          teacherId: row.teacherId,
          date: toValidDate(row.date) || parseDateOnly(),
          status,
          confidence: row.confidence ?? null,
          method: row.method || 'ai',
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) attendanceData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) attendanceData.updatedAt = updatedAt;
        await tx.attendance.create({ data: attendanceData });
      }

      for (const row of data.conversations) {
        const conversationData = {
          id: row.id,
          createdByUserId: row.createdByUserId || null,
          createdByTeacherId: row.createdByTeacherId || null,
          type: toEnumValue(ConversationType, row.type, ConversationType.GENERAL),
          status: toEnumValue(ConversationStatus, row.status, ConversationStatus.OPEN),
          priority: toEnumValue(ConversationPriority, row.priority, ConversationPriority.MEDIUM),
          subject: row.subject || null,
          relatedCourseId: row.relatedCourseId || null,
          relatedLab: row.relatedLab || null,
          attendanceIssueType: toEnumValue(AttendanceIssueType, row.attendanceIssueType, null),
          attendanceIssuePayload: row.attendanceIssuePayload || null,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) conversationData.createdAt = createdAt;
        const updatedAt = toValidDate(row.updatedAt);
        if (updatedAt) conversationData.updatedAt = updatedAt;
        await tx.conversation.create({ data: conversationData });
      }

      for (const row of data.conversationMessages) {
        const messageData = {
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          senderRole: toEnumValue(MessagingRole, row.senderRole, MessagingRole.TEACHER),
          receiverRole: toEnumValue(MessagingRole, row.receiverRole, MessagingRole.ADMIN),
          messageText: row.messageText,
          attachments: row.attachments || [],
          parentMessageId: row.parentMessageId || null,
          readStatus: Boolean(row.readStatus),
          readAt: toValidDate(row.readAt) || null,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) messageData.createdAt = createdAt;
        await tx.conversationMessage.create({ data: messageData });
      }

      for (const row of data.conversationAuditLogs) {
        const auditData = {
          id: row.id,
          conversationId: row.conversationId,
          actorId: row.actorId,
          actorRole: toEnumValue(MessagingRole, row.actorRole, MessagingRole.ADMIN),
          action: row.action,
          details: row.details || null,
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) auditData.createdAt = createdAt;
        await tx.conversationAuditLog.create({ data: auditData });
      }

      for (const row of data.notifications) {
        const notificationData = {
          id: row.id,
          userId: row.userId,
          type: toEnumValue(NotificationType, row.type, NotificationType.NEW_MESSAGE),
          title: row.title,
          body: row.body,
          conversationId: row.conversationId || null,
          messageId: row.messageId || null,
          isRead: Boolean(row.isRead),
        };
        const createdAt = toValidDate(row.createdAt);
        if (createdAt) notificationData.createdAt = createdAt;
        await tx.appNotification.create({ data: notificationData });
      }
    });

    res.json({
      success: true,
      imported: {
        departments: data.departments.length,
        programs: data.programs.length,
        teachers: data.teachers.length,
        classes: data.classes.length,
        students: data.students.length,
        enrollments: data.enrollments.length,
        timetable: data.timetable.length,
        attendanceSessions: data.attendanceSessions.length,
        attendance: data.attendance.length,
        conversations: data.conversations.length,
        conversationMessages: data.conversationMessages.length,
        conversationAuditLogs: data.conversationAuditLogs.length,
        notifications: data.notifications.length,
      },
    });
  }),
);

app.use((error, _req, res, _next) => {
  const statusCode = error.status || 500;
  const message = error?.message || 'Internal server error.';

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(statusCode).json({ message });
});

const start = async () => {
  await seedDefaults();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server running on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});
