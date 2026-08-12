import { Building2, GraduationCap, ArrowRight, BookOpen, Users } from 'lucide-react';
import { useDepartments } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';

export default function TeacherDepartments() {
  const { data, isLoading, isError } = useDepartments();

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Select a Department"
        subtitle="Choose a program to manage its sessions, students, subjects, attendance and marks."
        icon={<Building2 className="h-5 w-5" />}
      />

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <Card className="p-10 text-center text-slate-500">Could not load departments. Please try again.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((dept) => (
            <Link key={dept.id} to={`/teacher/departments/${dept.id}/sessions`} className="group">
              <Card hoverable className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-royal-500 to-royal-700 text-white shadow-card">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-royal-500" />
                </div>
                <h3 className="mt-4 text-base font-bold text-navy-900">{dept.name}</h3>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-royal-600">{dept.code}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{dept.description}</p>
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {dept._count?.students ?? 0} students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> {dept._count?.subjects ?? 0} subjects
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
