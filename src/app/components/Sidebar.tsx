import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  Users, 
  UserCircle, 
  Calendar, 
  Camera, 
  BarChart3, 
  MessageSquare,
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/departments', icon: Building2, label: 'Departments' },
    { path: '/programs', icon: GraduationCap, label: 'Programs' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/teachers', icon: UserCircle, label: 'Teachers' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/communication', icon: MessageSquare, label: 'Communication' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const teacherLinks = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/my-courses', icon: BookOpen, label: 'My Courses' },
    { path: '/attendance', icon: Camera, label: 'Start Attendance' },
    { path: '/communication', icon: MessageSquare, label: 'Communication' },
    { path: '/reports', icon: BarChart3, label: 'Attendance Analytics' },
    { path: '/teacher-settings', icon: Settings, label: 'Settings' },
  ];

  const links = isAdmin ? adminLinks : teacherLinks;

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">NUST Attendance</h1>
        <p className="text-sm text-slate-400 mt-1">Face Recognition System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}