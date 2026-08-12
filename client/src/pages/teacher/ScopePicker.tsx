import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarRange, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import { useDepartments, useSessions, useSemesters } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';

const targets = {
  students: { label: 'Students', path: '/students' },
  subjects: { label: 'Subjects', path: '/subjects' },
  attendance: { label: 'Attendance', path: '/subjects' },
  marks: { label: 'Marks', path: '/subjects' },
} as const;

export default function ScopePicker({ target }: { target: keyof typeof targets }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const { data: departments, isLoading: dLoading } = useDepartments();
  const { data: sessions, isLoading: sLoading } = useSessions();
  const { data: semesters, isLoading: semLoading } = useSemesters(departmentId ?? undefined);

  const t = targets[target];

  const go = (semesterId: number) => {
    if (target === 'students') {
      navigate(`/teacher/departments/${departmentId}/sessions/${sessionId}/semesters/${semesterId}/students`);
    } else if (target === 'subjects') {
      navigate(`/teacher/departments/${departmentId}/sessions/${sessionId}/semesters/${semesterId}/subjects`);
    } else {
      // attendance & marks open via a subject
      navigate(`/teacher/departments/${departmentId}/sessions/${sessionId}/semesters/${semesterId}/subjects`);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={t.label}
        subtitle="Select Department → Session → Semester to continue."
        icon={<Building2 className="h-5 w-5" />}
      />

      <div className="mb-6 flex items-center gap-2 text-sm">
        {['Department', 'Session', 'Semester'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 text-slate-300" />}
            <span className={step === i + 1 ? 'rounded-lg bg-royal-600 px-3 py-1 font-semibold text-white' : 'rounded-lg bg-slate-100 px-3 py-1 text-slate-500'}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        dLoading || !departments ? <PageLoader /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.items.map((d) => (
              <button key={d.id} onClick={() => { setDepartmentId(d.id); setStep(2); }} className="group text-left">
                <Card hoverable className="h-full p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-50 text-royal-600"><Building2 className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <p className="font-semibold text-navy-900">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.code}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )
      )}

      {step === 2 && (
        sLoading || !sessions ? <PageLoader /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.items.map((s) => (
              <button key={s.id} onClick={() => { setSessionId(s.id); setStep(3); }} className="group text-left">
                <Card hoverable className="h-full p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><CalendarRange className="h-5 w-5" /></div>
                    <div className="flex-1"><p className="font-semibold text-navy-900">{s.label}</p></div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )
      )}

      {step === 3 && (
        <>
          {semLoading || !semesters ? <PageLoader /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {semesters.items.map((s) => (
                <button key={s.id} onClick={() => go(s.id)} className="group text-left">
                  <Card hoverable className="h-full p-4 text-center transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Layers className="h-5 w-5" /></div>
                    <p className="mt-2 font-semibold text-navy-900">{s.name}</p>
                  </Card>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6">
            <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(2)}>Back to Sessions</Button>
          </div>
        </>
      )}
    </div>
  );
}
