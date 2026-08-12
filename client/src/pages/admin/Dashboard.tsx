import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarRange,
  Layers,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  UploadCloud,
  UserCog,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/queries';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../auth/authStore';

export default function AdminDashboard() {
  const { data, isLoading } = useDashboardStats();
  const user = useAuthStore((s) => s.user);

  if (isLoading || !data) return <PageLoader />;
  const { stats, recentStudents } = data;

  const shortcuts = [
    { to: '/admin/departments', label: 'Departments', icon: <Building2 className="h-5 w-5" />, color: 'bg-royal-50 text-royal-600' },
    { to: '/admin/sessions', label: 'Sessions', icon: <CalendarRange className="h-5 w-5" />, color: 'bg-teal-50 text-teal-600' },
    { to: '/admin/semesters', label: 'Semesters', icon: <Layers className="h-5 w-5" />, color: 'bg-navy-50 text-navy-700' },
    { to: '/admin/teachers', label: 'Teachers', icon: <UserCog className="h-5 w-5" />, color: 'bg-amber-50 text-amber-600' },
    { to: '/admin/subjects', label: 'Subjects', icon: <BookOpen className="h-5 w-5" />, color: 'bg-royal-50 text-royal-600' },
    { to: '/admin/reports', label: 'Reports', icon: <ClipboardList className="h-5 w-5" />, color: 'bg-teal-50 text-teal-600' },
    { to: '/admin/uploads', label: 'Uploaded Files', icon: <UploadCloud className="h-5 w-5" />, color: 'bg-navy-50 text-navy-700' },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ShieldCheck className="h-5 w-5" />, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={`Admin Dashboard`}
        subtitle={`Welcome, ${user?.fullName}. Full control over the academic system.`}
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Departments" value={stats.departments} icon={<Building2 className="h-6 w-6" />} accent="royal" />
        <StatCard label="Teachers" value={stats.teachers} icon={<UserCog className="h-6 w-6" />} accent="amber" />
        <StatCard label="Students" value={stats.students} icon={<Users className="h-6 w-6" />} accent="teal" />
        <StatCard label="Subjects" value={stats.subjects} icon={<BookOpen className="h-6 w-6" />} accent="navy" />
        <StatCard label="Sessions" value={stats.sessions} icon={<CalendarRange className="h-6 w-6" />} accent="royal" />
        <StatCard label="Semesters" value={stats.semesters} icon={<Layers className="h-6 w-6" />} accent="teal" />
        <StatCard label="Attendance Records" value={stats.attendance} icon={<CalendarCheck className="h-6 w-6" />} accent="amber" />
        <StatCard label="Marks Records" value={stats.marks} icon={<ClipboardList className="h-6 w-6" />} accent="navy" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Management Shortcuts" subtitle="Quick access to every management module" icon={<ShieldCheck className="h-5 w-5" />} />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {shortcuts.map((s) => (
                <Link key={s.to} to={s.to} className="group">
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center transition-colors hover:border-royal-300 hover:bg-royal-50/40">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>{s.icon}</div>
                    <p className="text-sm font-semibold text-navy-900">{s.label}</p>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Students" subtitle="Latest additions across the system" icon={<Users className="h-5 w-5" />} />
          <CardBody className="p-0">
            {recentStudents.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No students yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentStudents.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-600">{s.name?.[0]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.studentId} · {s.department?.name} · {s.semester?.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
