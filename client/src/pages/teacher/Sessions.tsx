import { CalendarRange, ArrowRight, GraduationCap, BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDepartments, useSessions } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';

export default function TeacherSessions() {
  const { deptId } = useParams();
  const deptIdNum = Number(deptId);
  const { data: deptData } = useDepartments();
  const { data, isLoading, isError } = useSessions();

  const department = deptData?.items.find((d) => d.id === deptIdNum);

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: department?.name ?? 'Department' },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={department ? `Sessions — ${department.name}` : 'Select a Session'}
        subtitle="Choose an academic session to continue to semesters."
        icon={<CalendarRange className="h-5 w-5" />}
        crumbs={crumbs}
      />

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <Card className="p-10 text-center text-slate-500">Could not load sessions.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((session) => (
            <Link
              key={session.id}
              to={`/teacher/departments/${deptIdNum}/sessions/${session.id}/semesters`}
              className="group"
            >
              <Card hoverable className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-card">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy-900">{session.label}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Academic Session</p>
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> {session._count?.subjects ?? 0} subjects
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
