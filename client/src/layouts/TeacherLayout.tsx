import { Shell, type NavItem } from './Shell';
import { LayoutDashboard, Building2, Users, BookOpen, CalendarCheck, ClipboardList, FileSearch, UserRound } from 'lucide-react';

const navItems: NavItem[] = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teacher/departments', label: 'Departments', icon: Building2 },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/teacher/marks', label: 'Marks', icon: ClipboardList },
  { to: '/teacher/overall-records', label: 'Overall Records', icon: FileSearch },
  { to: '/teacher/profile', label: 'Profile', icon: UserRound },
];

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <Shell navItems={navItems}>{children}</Shell>;
}
