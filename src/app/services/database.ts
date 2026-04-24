const runtimeEnv = (import.meta as any).env || {};
const API_BASE = `${runtimeEnv.VITE_API_URL || 'http://localhost:4000'}/api`;

const getAuthToken = () => localStorage.getItem('authToken');

const request = async <T>(path: string, options: RequestInit = {}, auth = true): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const json = await response.json();
      message = json.message || message;
    } catch {
      // ignore parse errors and keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'admin' | 'teacher';
  teacherId?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  section?: string;
  departmentId: string;
  programId: string;
  teacherId?: string;
  credits: number;
  hasLab?: boolean;
  labName?: string | null;
  labAttendanceRequired?: boolean;
  createdAt: string;
  teacherName?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  employeeId: string;
  assignedCourses: string[];
  createdAt: string;
  credentials?: {
    email: string;
    temporaryPassword: string;
  };
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  departmentId: string;
  programId: string;
  enrolledCourses: string[];
  faceDescriptors: Array<number[] | Float32Array>;
  faceImages: string[];
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  courseId: string;
  classId?: string;
  teacherId: string;
  day: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  section?: string;
  className?: string;
  classCode?: string;
  createdAt?: string;
}

export interface CurrentClassInfo {
  class_id: string;
  class_code: string;
  course_name: string;
  section: string;
  room: string;
  start_time: string;
  end_time: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  department: string;
  employeeId: string;
  assignedCourses: Array<{ id: string; name: string; code: string; section?: string }>;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  classId?: string;
  teacherId: string;
  section?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  capturedImage?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  courseId: string;
  status: 'present' | 'absent' | 'manual';
  confidence?: number;
  markedAt: string;
  markedBy: string;
  method: 'ai' | 'manual';
}

class DatabaseService {
  async init() {
    await request('/health', {}, false);
  }

  async add<T>(storeName: string, data: T): Promise<any> {
    switch (storeName) {
      case 'departments':
        return request('/departments', { method: 'POST', body: JSON.stringify(data) });
      case 'programs':
        return request('/programs', { method: 'POST', body: JSON.stringify(data) });
      case 'teachers': {
        const payload = data as unknown as Teacher;
        return request('/teachers', {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            departmentId: payload.departmentId,
            employeeId: payload.employeeId,
          }),
        });
      }
      case 'courses':
        return request('/classes', { method: 'POST', body: JSON.stringify(data) });
      case 'students': {
        const payload = data as unknown as Student;
        const normalizedFaceEncoding = (payload.faceDescriptors || []).map((item) =>
          Array.from(item as number[] | Float32Array).map((value) => Number(value)),
        );

        return request('/students/register', {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name,
            rollNumber: payload.rollNumber,
            email: payload.email,
            programId: payload.programId,
            faceEncoding: normalizedFaceEncoding,
            faceImages: payload.faceImages || [],
            enrollmentClassIds: payload.enrolledCourses || [],
          }),
        });
      }
      case 'timetable': {
        const payload = data as unknown as TimetableEntry;
        return request('/timetable', {
          method: 'POST',
          body: JSON.stringify({
            classId: payload.classId || payload.courseId,
            day: payload.day || payload.dayOfWeek,
            startTime: payload.startTime,
            endTime: payload.endTime,
            room: payload.room,
          }),
        });
      }
      case 'attendanceSessions':
        return request('/attendance/sessions', { method: 'POST', body: JSON.stringify(data) });
      default:
        throw new Error(`Unsupported store add operation: ${storeName}`);
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    switch (storeName) {
      case 'departments':
        return request('/departments');
      case 'programs':
        return request('/programs');
      case 'courses':
        return request('/classes');
      case 'teachers':
        return request('/teachers');
      case 'students':
        return request('/students');
      case 'timetable':
        return request('/timetable');
      case 'attendanceSessions':
        return request('/attendance/sessions');
      default:
        return [];
    }
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const rows = await this.getAll<T & { id: string }>(storeName);
    return rows.find((item) => item.id === id);
  }

  async update<T extends { id: string }>(storeName: string, data: T): Promise<void> {
    switch (storeName) {
      case 'departments':
        await request(`/departments/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
        return;
      case 'programs':
        await request(`/programs/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
        return;
      case 'courses':
        await request(`/classes/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
        return;
      default:
        throw new Error(`Unsupported store update operation: ${storeName}`);
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    switch (storeName) {
      case 'departments':
        await request(`/departments/${id}`, { method: 'DELETE' });
        return;
      case 'programs':
        await request(`/programs/${id}`, { method: 'DELETE' });
        return;
      case 'courses':
        await request(`/classes/${id}`, { method: 'DELETE' });
        return;
      case 'teachers':
        await request(`/teachers/${id}`, { method: 'DELETE' });
        return;
      case 'students':
        await request(`/students/${id}`, { method: 'DELETE' });
        return;
      case 'timetable':
        await request(`/timetable/${id}`, { method: 'DELETE' });
        return;
      default:
        throw new Error(`Unsupported store delete operation: ${storeName}`);
    }
  }

  async getByIndex<T extends Record<string, any>>(storeName: string, indexName: string, value: string): Promise<T[]> {
    const rows = await this.getAll<T>(storeName);
    return rows.filter((row) => String(row[indexName]) === value);
  }

  async getStudentsByIds(ids: string[]): Promise<Student[]> {
    const students = await this.getAll<Student>('students');
    return students.filter((student) => ids.includes(student.id));
  }

  async getStudentsByCourse(courseId: string): Promise<Student[]> {
    return request(`/classes/${courseId}/students`);
  }

  async getAttendanceBySession(_sessionId: string): Promise<AttendanceRecord[]> {
    return [];
  }

  async getAttendanceByStudent(_studentId: string): Promise<AttendanceRecord[]> {
    return [];
  }

  async getAttendanceByCourse(_courseId: string): Promise<AttendanceRecord[]> {
    return [];
  }

  async getTimetableByCourse(courseId: string): Promise<TimetableEntry[]> {
    const timetable = await this.getAll<TimetableEntry>('timetable');
    return timetable.filter((entry) => (entry.classId || entry.courseId) === courseId);
  }

  async getTimetableByTeacher(teacherId: string): Promise<TimetableEntry[]> {
    const timetable = await this.getAll<TimetableEntry>('timetable');
    return timetable.filter((entry) => entry.teacherId === teacherId);
  }

  async clearAll() {
    await request('/admin/reset', { method: 'POST' });
  }

  async exportSystemData(): Promise<any> {
    return request('/admin/export');
  }

  async importSystemData(payload: any): Promise<any> {
    return request('/admin/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTeacherTodaySchedule(): Promise<TimetableEntry[]> {
    const response = await request<{ schedule: Array<any> }>('/teacher/today-schedule');
    return (response.schedule || []).map((item) => ({
      id: `${item.class_id}_${item.start_time}_${item.day}`,
      classId: item.class_id,
      courseId: item.class_id,
      teacherId: '',
      day: item.day,
      dayOfWeek: item.day,
      startTime: item.start_time,
      endTime: item.end_time,
      room: item.room,
      section: item.section,
      className: item.course_name,
      classCode: item.class_code,
    }));
  }

  async getTeacherCurrentClass(): Promise<CurrentClassInfo | null> {
    const response = await request<{ currentClass: CurrentClassInfo | null }>('/teacher/current-class');
    return response.currentClass;
  }

  async getTeacherProfile(): Promise<TeacherProfile> {
    return request('/teacher/profile');
  }

  async updateTeacherProfile(payload: { name?: string; avatarUrl?: string | null }): Promise<User> {
    return request('/teacher/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async changeTeacherPassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await request('/teacher/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export const db = new DatabaseService();
