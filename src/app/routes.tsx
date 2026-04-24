import { useEffect, useMemo, useState } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ProgramsPage from './pages/ProgramsPage';
import CoursesPage from './pages/CoursesPage';
import TeachersPage from './pages/TeachersPage';
import StudentsPage from './pages/StudentsPage';
import AttendancePage from './pages/AttendancePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import TimetablePage from './pages/TimetablePage';
import MyCoursesPage from './pages/MyCoursesPage';
import TeacherSettingsPage from './pages/TeacherSettingsPage';
import CommunicationPage from './pages/CommunicationPage';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

const routeTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/departments': 'Departments',
  '/programs': 'Programs',
  '/courses': 'Classes',
  '/teachers': 'Teachers',
  '/students': 'Students',
  '/timetable': 'Timetable',
  '/my-courses': 'My Courses',
  '/attendance': 'Attendance',
  '/communication': 'Communication',
  '/reports': 'Attendance Analytics',
  '/teacher-settings': 'Settings',
  '/settings': 'Settings',
};

// Protected route wrapper
function ProtectedLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'teacher'>;
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const pageTitle = useMemo(() => {
    return routeTitleMap[location.pathname] || 'NUST Attendance';
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-30">
          <div className="h-full px-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-slate-500">{currentTime.toLocaleDateString()}</p>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedLayout>
        <DashboardPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/departments',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <DepartmentsPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/programs',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <ProgramsPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/courses',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <CoursesPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/teachers',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <TeachersPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/students',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <StudentsPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/timetable',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <TimetablePage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/my-courses',
    element: (
      <ProtectedLayout allowedRoles={['teacher']}>
        <MyCoursesPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/attendance',
    element: (
      <ProtectedLayout allowedRoles={['teacher']}>
        <AttendancePage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/communication',
    element: (
      <ProtectedLayout allowedRoles={['admin', 'teacher']}>
        <CommunicationPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedLayout allowedRoles={['teacher']}>
        <ReportsPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/teacher-settings',
    element: (
      <ProtectedLayout allowedRoles={['teacher']}>
        <TeacherSettingsPage />
      </ProtectedLayout>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedLayout allowedRoles={['admin']}>
        <SettingsPage />
      </ProtectedLayout>
    ),
  },
]);