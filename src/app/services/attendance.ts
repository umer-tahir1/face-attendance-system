import { db, Student, AttendanceSession, AttendanceRecord, CurrentClassInfo } from './database';
import { faceRecognitionService, FaceMatchResult } from './faceRecognition';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface AttendanceStats {
  totalSessions: number;
  attendedSessions: number;
  attendancePercentage: number;
}

export interface StudentAttendanceReport {
  student: Student;
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

class AttendanceService {
  private readonly API_BASE = `${((import.meta as any).env || {}).VITE_API_URL || 'http://localhost:4000'}/api`;

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('authToken');
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.API_BASE}${path}`, {
      ...options,
      headers,
    });

    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Attendance request failed');
    }

    return payload as T;
  }

  async createSession(
    courseId: string,
    teacherId: string,
    section: string,
    date: string,
    startTime: string,
    endTime: string,
    room: string
  ): Promise<AttendanceSession> {
    const session = await this.request<AttendanceSession>('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify({
        classId: courseId,
        date,
      }),
    });

    return {
      ...session,
      courseId: session.courseId || session.classId || courseId,
      teacherId,
      section,
      startTime,
      endTime,
      room,
    };
  }

  async getCurrentClass(): Promise<CurrentClassInfo | null> {
    const payload = await this.request<{ currentClass: CurrentClassInfo | null }>('/teacher/current-class');
    return payload.currentClass;
  }

  async processAttendanceWithAI(
    sessionId: string,
    classId: string,
    capturedImage: string,
  ): Promise<{ success: boolean; results: FaceMatchResult[]; error?: string }> {
    try {
      const img = await faceRecognitionService.createImageFromBase64(capturedImage);
      const detections = await faceRecognitionService.detectMultipleFaces(img);
      if (detections.length === 0) {
        return {
          success: false,
          results: [],
          error: 'No faces detected in the captured image.',
        };
      }

      const detectedEmbeddings = detections.map((result) => Array.from(result.descriptor));

      const payload = await this.request<{ success: boolean; results: FaceMatchResult[]; sessionId?: string }>(
        '/attendance/mark',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            classId,
            captured_image: capturedImage,
            detectedEmbeddings,
          }),
        },
      );

      return { success: payload.success, results: payload.results };
    } catch (error) {
      console.error('Error processing attendance:', error);
      return { 
        success: false, 
        results: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async markManualAttendance(
    sessionId: string,
    studentId: string,
    status: 'present' | 'absent',
    userId: string
  ): Promise<void> {
    await this.request('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify({ sessionId, studentId, status }),
    });
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.request(`/attendance/sessions/${sessionId}/complete`, {
      method: 'PATCH',
    });
  }

  async getSessionAttendance(sessionId: string): Promise<{
    session: AttendanceSession;
    records: Array<AttendanceRecord & { studentName: string; rollNumber: string }>;
  }> {
    const sessions = await db.getAll<AttendanceSession>('attendanceSessions');
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error('Session not found');

    return { session, records: [] };
  }

  async getStudentAttendanceStats(studentId: string, courseId: string): Promise<AttendanceStats> {
    const report = await this.getCourseAttendanceReport(courseId);
    const row = report.find((item) => item.student.id === studentId);
    return row?.stats || { totalSessions: 0, attendedSessions: 0, attendancePercentage: 0 };
  }

  async getCourseAttendanceReport(courseId: string): Promise<StudentAttendanceReport[]> {
    const payload = await this.request<{ students: StudentAttendanceReport[] }>(
      `/attendance/report?classId=${encodeURIComponent(courseId)}`,
    );
    return payload.students || [];
  }

  async getCourseAttendanceAnalytics(courseId: string): Promise<any> {
    return this.request(`/attendance/report?classId=${encodeURIComponent(courseId)}`);
  }

  async generatePDFReport(courseId: string, courseName: string): Promise<void> {
    const report = await this.getCourseAttendanceReport(courseId);
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Attendance Report', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Course: ${courseName}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

    // Table data
    const tableData = report.map(r => [
      r.student.rollNumber,
      r.student.name,
      r.stats.totalSessions.toString(),
      r.stats.attendedSessions.toString(),
      `${r.stats.attendancePercentage.toFixed(1)}%`,
      r.stats.attendancePercentage < 75 ? 'Yes' : 'No',
    ]);

    doc.autoTable({
      startY: 50,
      head: [['Roll No', 'Name', 'Total', 'Present', 'Percentage', 'Defaulter']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: {
        5: { 
          cellWidth: 25,
          fontStyle: 'bold',
          textColor: (rowIndex: number) => {
            return tableData[rowIndex][5] === 'Yes' ? [231, 76, 60] : [46, 125, 50];
          }
        }
      }
    });

    doc.save(`attendance_${courseName}_${Date.now()}.pdf`);
  }

  async exportToCSV(courseId: string, courseName: string): Promise<void> {
    const report = await this.getCourseAttendanceReport(courseId);
    
    let csv = 'Roll Number,Name,Total Sessions,Attended,Percentage,Defaulter\n';
    
    report.forEach(r => {
      csv += `${r.student.rollNumber},${r.student.name},${r.stats.totalSessions},${r.stats.attendedSessions},${r.stats.attendancePercentage.toFixed(1)}%,${r.stats.attendancePercentage < 75 ? 'Yes' : 'No'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${courseName}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

export const attendanceService = new AttendanceService();