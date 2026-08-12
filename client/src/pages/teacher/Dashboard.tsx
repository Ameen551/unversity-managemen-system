import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarRange,
  Layers,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ArrowRight,
  Search,
  GraduationCap,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/queries';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../auth/authStore';

export default function TeacherDashboard() {
  const { data, isLoading } = useDashboardStats();
  const user = useAuthStore((s) => s.user);

  if (isLoading || !data) return <PageLoader />;
  const { stats, recentStudents } = data;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? 'Teacher'}`}
        subtitle="Manage your departments, students, subjects, attendance and marks."
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <Link to="/teacher/departments">
            <Button icon={<ArrowRight className="h-4 w-4" />}>Open Departments</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Departments" value={stats.departments} icon={<Building2 className="h-6 w-6" />} accent="royal" />
        <StatCard label="Sessions" value={stats.sessions} icon={<CalendarRange className="h-6 w-6" />} accent="teal" />
        <StatCard label="Semesters" value={stats.semesters} icon={<Layers className="h-6 w-6" />} accent="navy" />
        <StatCard label="Students" value={stats.students} icon={<Users className="h-6 w-6" />} accent="royal" />
        <StatCard label="Subjects" value={stats.subjects} icon={<BookOpen className="h-6 w-6" />} accent="teal" />
        <StatCard label="Attendance" value={stats.attendance} icon={<CalendarCheck className="h-6 w-6" />} accent="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Quick Actions"
            subtitle="Start from a department and follow the program flow"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to="/teacher/departments" className="group">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-royal-300 hover:bg-royal-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-900">Departments</p>
                    <p className="text-xs text-slate-500">Select a program to continue</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              <Link to="/teacher/students" className="group">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-royal-300 hover:bg-royal-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-900">Students</p>
                    <p className="text-xs text-slate-500">View, add or import students</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              <Link to="/teacher/subjects" className="group">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-royal-300 hover:bg-royal-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-900">Subjects</p>
                    <p className="text-xs text-slate-500">Manage subject cards</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              <Link to="/teacher/overall-records" className="group">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-royal-300 hover:bg-royal-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-900">Overall Records</p>
                    <p className="text-xs text-slate-500">Search any student profile</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Students" subtitle="Latest additions" icon={<Users className="h-5 w-5" />} />
          <CardBody className="p-0">
            {recentStudents.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No students added yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentStudents.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-royal-50 text-sm font-bold text-royal-600">
                      {s.name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.studentId} · {s.department?.name}
                      </p>
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
