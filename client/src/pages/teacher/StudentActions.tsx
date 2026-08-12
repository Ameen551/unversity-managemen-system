import { Users, UserPlus, ArrowRight, CalendarRange } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDepartments, useSemesters, useSessions } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export default function TeacherStudentActions() {
  const { deptId, sessionId, semesterId } = useParams();
  const deptIdNum = Number(deptId);
  const sessionIdNum = Number(sessionId);
  const semesterIdNum = Number(semesterId);

  const { data: deptData } = useDepartments();
  const { data: sessionData } = useSessions();
  const { data: semData } = useSemesters(deptIdNum);

  const department = deptData?.items.find((d) => d.id === deptIdNum);
  const session = sessionData?.items.find((s) => s.id === sessionIdNum);
  const semester = semData?.items.find((s) => s.id === semesterIdNum);

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: department?.name ?? 'Department', to: `/teacher/departments/${deptIdNum}/sessions` },
    { label: session?.label ?? 'Session', to: `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters` },
    { label: semester?.name ?? 'Semester' },
  ];

  const scope = `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters/${semesterIdNum}`;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={semester ? `${semester.name} — Student Management` : 'Student Management'}
        subtitle={`${department?.name ?? ''} · ${session?.label ?? ''} · ${semester?.name ?? ''}`}
        icon={<Users className="h-5 w-5" />}
        crumbs={crumbs}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Link to={`${scope}/students`} className="group">
          <Card hoverable className="h-full p-8 transition-all group-hover:-translate-y-1 group-hover:border-royal-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-500 to-royal-700 text-white shadow-card">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-navy-900">View Students</h3>
            <p className="mt-1 text-sm text-slate-500">Search, filter and manage student records in this semester.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600">
              Open student list <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Card>
        </Link>

        <Link to={`${scope}/add-student`} className="group">
          <Card hoverable className="h-full p-8 transition-all group-hover:-translate-y-1 group-hover:border-teal-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-card">
              <UserPlus className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-navy-900">Add Student</h3>
            <p className="mt-1 text-sm text-slate-500">Add a student individually or import a batch via Excel/CSV.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600">
              Add students <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Card>
        </Link>
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          to={`${scope}/subjects`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-royal-600 to-royal-700 px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:from-royal-700 hover:to-royal-800"
        >
          <CalendarRange className="h-4 w-4" />
          Next: Subjects
        </Link>
      </div>
    </div>
  );
}
