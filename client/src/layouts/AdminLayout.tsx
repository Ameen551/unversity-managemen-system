import { Shell, type NavItem } from './Shell';
import {
  LayoutDashboard,
  Building2,
  CalendarRange,
  Layers,
  Users,
  UserCog,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart2,
  UploadCloud,
  ScrollText,
  Settings,
} from 'lucide-react';

const navItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/sessions', label: 'Sessions', icon: CalendarRange },
  { to: '/admin/semesters', label: 'Semesters', icon: Layers },
  { to: '/admin/teachers', label: 'Teachers', icon: UserCog },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/admin/marks', label: 'Marks', icon: ClipboardList },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/admin/uploads', label: 'Uploaded Files', icon: UploadCloud },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell navItems={navItems}>{children}</Shell>;
}
