import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  db,
  Department,
  Program,
  Course,
  Teacher,
  Student,
  CurrentClassInfo,
  TimetableEntry,
  TeacherProfile,
  AttendanceSession,
} from '../services/database';
import { Users, BookOpen, GraduationCap, Building2, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { attendanceService } from '../services/attendance';

type AdminSessionRow = {
  id: string;
  classLabel: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const API_BASE = `${((import.meta as any).env || {}).VITE_API_URL || 'http://localhost:4000'}/api`;

  const [stats, setStats] = useState({
    departments: 0,
    programs: 0,
    courses: 0,
    teachers: 0,
    students: 0,
    activeSessions: 0,
    totalSessionsToday: 0,
    completedSessionsToday: 0,
  });

  const [adminInsights, setAdminInsights] = useState({
    programsBySchool: [] as Array<{ name: string; count: number }>,
    classesBySchool: [] as Array<{ name: string; count: number }>,
    recentSessions: [] as AdminSessionRow[],
  });

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [currentClass, setCurrentClass] = useState<CurrentClassInfo | null>(null);
  const [trendData, setTrendData] = useState<Array<{ date: string; percentage: number }>>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (isAdmin) {
      const [departments, programs, courses, teachers, students, sessions] = await Promise.all([
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
        db.getAll<Course>('courses'),
        db.getAll<Teacher>('teachers'),
        db.getAll<Student>('students'),
        db.getAll<AttendanceSession>('attendanceSessions'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const sessionsToday = sessions.filter((s: any) => String(s.date || '').slice(0, 10) === today);
      const activeSessions = sessions.filter((s: any) => s.status === 'active');
      const completedSessionsToday = sessionsToday.filter((s: any) => s.status === 'completed').length;

      setStats({
        departments: departments.length,
        programs: programs.length,
        courses: courses.length,
        teachers: teachers.length,
        students: students.length,
        activeSessions: activeSessions.length,
        totalSessionsToday: sessionsToday.length,
        completedSessionsToday,
      });

      const schoolNameById = new Map(departments.map((row) => [row.id, row.name]));
      const classById = new Map(courses.map((row) => [row.id, row]));

      const programsBySchool = departments
        .map((dept) => ({
          name: dept.code,
          count: programs.filter((program) => program.departmentId === dept.id).length,
        }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const classesBySchool = departments
        .map((dept) => ({
          name: dept.code,
          count: courses.filter((course) => course.departmentId === dept.id).length,
        }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const recentSessions = [...sessions]
        .sort((a, b) => {
          const aTime = new Date((a as any).createdAt || a.date).getTime();
          const bTime = new Date((b as any).createdAt || b.date).getTime();
          return bTime - aTime;
        })
        .slice(0, 8)
        .map((session) => {
          const classId = session.classId || session.courseId;
          const classRow = classId ? classById.get(classId) : null;
          const schoolName = classRow?.departmentId ? schoolNameById.get(classRow.departmentId) : null;
          const classLabel = classRow
            ? `${classRow.code} - ${classRow.name}`
            : classId
              ? `Class ${classId}`
              : 'Unknown class';

          return {
            id: session.id,
            classLabel: schoolName ? `${classLabel} (${schoolName})` : classLabel,
            date: session.date,
            status: session.status,
          };
        });

      setAdminInsights({
        programsBySchool,
        classesBySchool,
        recentSessions,
      });
      return;
    }

    const token = localStorage.getItem('authToken');
    const dashboardResponse = await fetch(`${API_BASE}/teacher/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (dashboardResponse.ok) {
      const data = await dashboardResponse.json();
      setStats({
        departments: 0,
        programs: 0,
        courses: data.assignedClasses || 0,
        teachers: 1,
        students: data.managedStudents || 0,
        activeSessions: data.attendanceMarkedToday || 0,
        totalSessionsToday: 0,
        completedSessionsToday: 0,
      });

      setAdminInsights({
        programsBySchool: [],
        classesBySchool: [],
        recentSessions: [],
      });
    }

    const [profile, schedule, current] = await Promise.all([
      db.getTeacherProfile(),
      db.getTeacherTodaySchedule(),
      db.getTeacherCurrentClass(),
    ]);

    setTeacherProfile(profile);
    setTodaySchedule(schedule);
    setCurrentClass(current);

    if (profile.assignedCourses.length > 0) {
      const analytics = await Promise.all(
        profile.assignedCourses.map((course) => attendanceService.getCourseAttendanceAnalytics(course.id)),
      );

      const bucket = new Map<string, { sum: number; count: number }>();
      for (const report of analytics) {
        const monthlyTrend = report?.monthlyTrend || [];
        for (const entry of monthlyTrend) {
          const previous = bucket.get(entry.month) || { sum: 0, count: 0 };
          previous.sum += entry.percentage || 0;
          previous.count += 1;
          bucket.set(entry.month, previous);
        }
      }

      const mergedTrend = [...bucket.entries()]
        .map(([date, row]) => ({ date, percentage: row.count > 0 ? row.sum / row.count : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTrendData(mergedTrend);
    }
  };

  const teacherStats = [
    { label: 'Assigned Classes', value: stats.courses, icon: BookOpen, color: 'bg-green-500' },
    { label: 'Managed Students', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { label: 'Marked Today', value: stats.activeSessions, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  const adminStats = [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Classes', value: stats.courses, icon: BookOpen, color: 'bg-green-500' },
    { label: 'Total Teachers', value: stats.teachers, icon: GraduationCap, color: 'bg-purple-500' },
    { label: 'Departments', value: stats.departments, icon: Building2, color: 'bg-orange-500' },
  ];

  const noDataTrend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (5 - index));
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return { date: label, percentage: 0 };
    });
  }, []);

  const profileInitials = useMemo(() => {
    const raw = teacherProfile?.name || user?.name || 'T';
    return raw
      .split(' ')
      .filter(Boolean)
      .map((piece) => piece[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [teacherProfile?.name, user?.name]);

  if (isAdmin) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">{stat.label}</p>
                      <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Operational Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded border p-3">
                    <h4 className="font-semibold mb-2">Programs By School</h4>
                    <div className="space-y-2 text-sm">
                      {adminInsights.programsBySchool.length === 0 ? (
                        <p className="text-slate-500">No data</p>
                      ) : (
                        adminInsights.programsBySchool.map((row) => (
                          <div key={`program_${row.name}`} className="flex items-center justify-between">
                            <span>{row.name}</span>
                            <span className="font-semibold">{row.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <h4 className="font-semibold mb-2">Classes By School</h4>
                    <div className="space-y-2 text-sm">
                      {adminInsights.classesBySchool.length === 0 ? (
                        <p className="text-slate-500">No data</p>
                      ) : (
                        adminInsights.classesBySchool.map((row) => (
                          <div key={`class_${row.name}`} className="flex items-center justify-between">
                            <span>{row.name}</span>
                            <span className="font-semibold">{row.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded border p-3">
                  <h4 className="font-semibold mb-2">Recent Attendance Sessions</h4>
                  {adminInsights.recentSessions.length === 0 ? (
                    <p className="text-sm text-slate-500">No sessions found</p>
                  ) : (
                    <div className="space-y-2">
                      {adminInsights.recentSessions.map((row) => (
                        <div key={row.id} className="flex items-center justify-between text-sm rounded bg-slate-50 px-3 py-2">
                          <span className="truncate pr-2">{row.classLabel}</span>
                          <span className="text-slate-600 whitespace-nowrap">
                            {row.date} - {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Today's Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Date</span>
                <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Sessions Today</span>
                <span className="font-semibold text-slate-900">{stats.totalSessionsToday}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Completed Today</span>
                <span className="font-semibold text-slate-900">{stats.completedSessionsToday}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Active Now</span>
                <span className="font-semibold text-slate-900">{stats.activeSessions}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={teacherProfile?.avatarUrl || undefined} />
                <AvatarFallback>{profileInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{teacherProfile?.name || user?.name}</p>
                <p className="text-sm text-slate-600">{teacherProfile?.email || user?.email}</p>
              </div>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="text-slate-500">Department:</span> {teacherProfile?.department || 'N/A'}</p>
              <p><span className="text-slate-500">Assigned Courses:</span> {teacherProfile?.assignedCourses.length || 0}</p>
            </div>
            <div className="space-y-2">
              {(teacherProfile?.assignedCourses || []).map((course) => (
                <div key={course.id} className="text-sm rounded border p-2">
                  {course.code} - {course.name} (Section {course.section || 'A'})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <p className="text-slate-500">No timetable assigned</p>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((slot) => {
                  const isCurrent = currentClass?.class_id === (slot.classId || slot.courseId);
                  return (
                    <div
                      key={slot.id}
                      className={`grid grid-cols-1 md:grid-cols-4 gap-2 border rounded p-3 ${
                        isCurrent ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                    >
                      <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                      <span>{slot.classCode || ''}</span>
                      <span>{slot.className || ''}</span>
                      <span>{slot.room || 'TBD'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teacherStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData.length > 0 ? trendData : noDataTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#16a34a" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
            {trendData.length === 0 && <p className="text-sm text-slate-500 mt-2">No Data Available</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Load</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={(teacherProfile?.assignedCourses || []).map((course) => ({
                  name: course.code,
                  attendance: trendData.length > 0 ? Math.max(1, Math.round(trendData[trendData.length - 1].percentage)) : 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="attendance" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
            {(teacherProfile?.assignedCourses.length || 0) === 0 && (
              <p className="text-sm text-slate-500 mt-2">No classes assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
