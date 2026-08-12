import { Layers, ArrowRight, Users, BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDepartments, useSemesters, useSessions } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';

export default function TeacherSemesters() {
  const { deptId, sessionId } = useParams();
  const deptIdNum = Number(deptId);
  const sessionIdNum = Number(sessionId);

  const { data: deptData } = useDepartments();
  const { data: sessionData } = useSessions();
  const { data, isLoading, isError } = useSemesters(deptIdNum);

  const department = deptData?.items.find((d) => d.id === deptIdNum);
  const session = sessionData?.items.find((s) => s.id === sessionIdNum);

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: department?.name ?? 'Department', to: `/teacher/departments/${deptIdNum}/sessions` },
    { label: session?.label ?? 'Session' },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={session ? `Semesters — ${session.label}` : 'Select a Semester'}
        subtitle="Select the semester to manage students and subjects."
        icon={<Layers className="h-5 w-5" />}
        crumbs={crumbs}
      />

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <Card className="p-10 text-center text-slate-500">Could not load semesters.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((sem) => (
            <Link
              key={sem.id}
              to={`/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters/${sem.id}`}
              className="group"
            >
              <Card hoverable className="h-full p-5 text-center transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-500 to-royal-700 text-lg font-bold text-white shadow-card">
                  {sem.number}
                </div>
                <h3 className="mt-3 font-bold text-navy-900">{sem.name}</h3>
                <p className="text-xs text-slate-500">Semester {sem.number}</p>
                <div className="mt-3 flex justify-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {sem._count?.students ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {sem._count?.subjects ?? 0}
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
