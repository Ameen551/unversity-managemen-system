import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Users,
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useSubject, useAttendance, useAttendanceSummary, useMarks, useMarkAttendance, useUpsertMarks, useAssessmentConfigs } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import { cn } from '../../utils/cn';
import type { Student } from '../../types';

type Tab = 'attendance' | 'marks' | 'students';

const enrolledStudents = (enrollments?: { student?: Student }[] | null): Student[] =>
  (enrollments ?? []).map((e) => e.student).filter((s): s is Student => Boolean(s));

export default function TeacherSubjectDetail() {
  const { deptId, sessionId, semesterId, subjectId } = useParams();
  const subjectIdNum = Number(subjectId);
  const scope = `/teacher/departments/${deptId}/sessions/${sessionId}/semesters/${semesterId}`;

  const { data, isLoading } = useSubject(subjectIdNum);
  const [tab, setTab] = useState<Tab>('attendance');
  const subject = data?.item;

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: 'Subjects', to: scope },
    { label: subject?.name ?? 'Subject' },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={subject ? `${subject.name} (${subject.code})` : 'Subject'}
        subtitle={subject ? `${subject.department?.name} · ${subject.session?.label} · ${subject.semester?.name} · ${subject.creditHours} credit hrs` : ''}
        icon={<BookOpen className="h-5 w-5" />}
        crumbs={crumbs}
        actions={
          <Link to={scope} className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 hover:text-royal-700">
            <ArrowLeft className="h-4 w-4" /> Back to Subjects
          </Link>
        }
      />

      {isLoading || !subject ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              { key: 'attendance' as Tab, label: 'Attendance', desc: 'Mark and review daily attendance', icon: <CalendarCheck className="h-5 w-5" /> },
              { key: 'marks' as Tab, label: 'Marks', desc: 'Enter Mid Term and Final Term marks', icon: <ClipboardList className="h-5 w-5" /> },
              { key: 'students' as Tab, label: 'Student Record', desc: 'Enrolled students in this subject', icon: <Users className="h-5 w-5" /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors',
                  tab === t.key ? 'border-royal-500 bg-royal-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', tab === t.key ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-500')}>
                  {t.icon}
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {tab === 'attendance' && <AttendanceTab subjectId={subjectIdNum} />}
          {tab === 'marks' && <MarksTab subjectId={subjectIdNum} />}
          {tab === 'students' && <StudentsTab subjectId={subjectIdNum} />}
        </>
      )}
    </div>
  );
}

// ---------------- Attendance ----------------
function AttendanceTab({ subjectId }: { subjectId: number }) {
  const { data, isLoading } = useSubject(subjectId);
  const summary = useAttendanceSummary(subjectId);
  const markMut = useMarkAttendance();

  const students = enrolledStudents(data?.item.enrollments);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lectureNo, setLectureNo] = useState(1);
  const [statuses, setStatuses] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'LEAVE'>>({});
  const [allStatus, setAllStatus] = useState<'PRESENT' | 'ABSENT' | 'LEAVE'>('PRESENT');

  const markAll = () => {
    const next: Record<number, string> = {};
    students.forEach((s) => (next[s.id] = allStatus));
    setStatuses(next as Record<number, 'PRESENT' | 'ABSENT' | 'LEAVE'>);
  };

  const submit = async () => {
    const records = students
      .filter((s) => statuses[s.id])
      .map((s) => ({ studentId: s.id, status: statuses[s.id] }));
    if (records.length === 0) {
      toast.error('Set attendance status for at least one student.');
      return;
    }
    try {
      await markMut.mutateAsync({ subjectId, date, lectureNo, records });
      toast.success(`Attendance saved for ${date} (lecture ${lectureNo}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save attendance.');
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Mark Attendance" subtitle="Select date, lecture/class and mark each student" icon={<CalendarCheck className="h-5 w-5" />} />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Date" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Lecture / Class" required>
              <Input type="number" min={1} value={lectureNo} onChange={(e) => setLectureNo(Number(e.target.value))} />
            </Field>
            <Field label="Apply to all">
              <div className="flex gap-2">
                <Select value={allStatus} onChange={(e) => setAllStatus(e.target.value as 'PRESENT' | 'ABSENT' | 'LEAVE')} className="flex-1">
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </Select>
                <Button variant="outline" onClick={markAll}>Apply</Button>
              </div>
            </Field>
            <div className="flex items-end">
              <Button onClick={submit} loading={markMut.isPending} icon={<Save className="h-4 w-4" />} className="w-full">Save Attendance</Button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="mt-4"><EmptyState title="No students enrolled" message="Add students to this semester to mark attendance." /></div>
          ) : (
            <div className="mt-5 max-h-[420px] overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2.5 font-semibold text-royal-700">{s.studentId}</td>
                      <td className="px-4 py-2.5 font-medium text-navy-900">{s.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{s.section ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {(['PRESENT', 'ABSENT', 'LEAVE'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: st }))}
                              className={cn(
                                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                                statuses[s.id] === st
                                  ? st === 'PRESENT' ? 'bg-emerald-500 text-white' : st === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attendance Summary" subtitle="Auto-calculated totals and percentages" icon={<Users className="h-5 w-5" />} />
        <CardBody className="p-0">
          {summary.isLoading ? (
            <div className="px-5 py-8 text-center text-slate-500">Loading summary…</div>
          ) : !summary.data?.items.length ? (
            <div className="px-5 py-8 text-center text-slate-500">No attendance records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Present</th>
                    <th className="px-5 py-3">Absent</th>
                    <th className="px-5 py-3">Leave</th>
                    <th className="px-5 py-3">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.data.items.map((row) => (
                    <tr key={row.student.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-navy-900">{row.student.name}</p>
                        <p className="text-xs text-slate-500">{row.student.studentId}</p>
                      </td>
                      <td className="px-5 py-3 font-semibold">{row.total}</td>
                      <td className="px-5 py-3 text-emerald-600">{row.present}</td>
                      <td className="px-5 py-3 text-red-600">{row.absent}</td>
                      <td className="px-5 py-3 text-amber-600">{row.leave}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className={cn('h-full rounded-full', row.percentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${row.percentage}%` }} />
                          </div>
                          <span className="text-sm font-semibold">{row.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------- Marks ----------------
function MarksTab({ subjectId }: { subjectId: number }) {
  const { data } = useSubject(subjectId);
  const { data: configs } = useAssessmentConfigs();
  const upsert = useUpsertMarks();

  const students = enrolledStudents(data?.item.enrollments);
  const [type, setType] = useState<'MID_TERM' | 'FINAL_TERM'>('MID_TERM');
  const [total, setTotal] = useState(40);
  const [marks, setMarks] = useState<Record<number, { obtained: string; total: number }>>({});

  const totalsFor = (t: 'MID_TERM' | 'FINAL_TERM') =>
    (configs?.items ?? []).find((c) => c.assessmentType === t);

  const switchType = (t: 'MID_TERM' | 'FINAL_TERM') => {
    setType(t);
    const cfg = totalsFor(t);
    setTotal(cfg?.defaultTotal ?? 40);
    setMarks({});
  };

  const submit = async () => {
    const records = students
      .filter((s) => marks[s.id] && marks[s.id].obtained !== '')
      .map((s) => ({ studentId: s.id, obtainedMarks: Number(marks[s.id].obtained), totalMarks: marks[s.id].total || total }));
    if (records.length === 0) {
      toast.error('Enter marks for at least one student.');
      return;
    }
    try {
      await upsert.mutateAsync({ subjectId, assessmentType: type, records });
      toast.success(`${type === 'MID_TERM' ? 'Mid Term' : 'Final Term'} marks saved.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save marks.');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Marks Management"
        subtitle="Editable total marks — configure the marking structure per assessment"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <button onClick={() => switchType('MID_TERM')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', type === 'MID_TERM' ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>Mid Term</button>
            <button onClick={() => switchType('FINAL_TERM')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', type === 'FINAL_TERM' ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>Final Term</button>
          </div>
        }
      />
      <CardBody>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Total Marks" hint={totalsFor(type) ? `${totalsFor(type)!.label} allowed totals: ${totalsFor(type)!.allowedTotals}` : ''}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="w-28"
              />
              {(() => {
                const cfg = totalsFor(type);
                if (!cfg) return null;
                try {
                  const allowed = JSON.parse(cfg.allowedTotals) as number[];
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {allowed.map((t) => (
                        <button key={t} onClick={() => setTotal(t)} className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', t === total ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100')}>{t}</button>
                      ))}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          </Field>
        </div>

        {students.length === 0 ? (
          <div className="mt-4"><EmptyState title="No students enrolled" message="Add students to this semester to enter marks." /></div>
        ) : (
          <div className="mt-5 max-h-[420px] overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Obtained</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-semibold text-royal-700">{s.studentId}</td>
                    <td className="px-4 py-2.5 font-medium text-navy-900">{s.name}</td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        max={marks[s.id]?.total || total}
                        placeholder="Marks"
                        value={marks[s.id]?.obtained ?? ''}
                        onChange={(e) => setMarks((prev) => ({ ...prev, [s.id]: { obtained: e.target.value, total: prev[s.id]?.total || total } }))}
                        className="w-28"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-600">/ {marks[s.id]?.total || total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-500">Marks are stored per student, subject and assessment type.</p>
          <Button onClick={submit} loading={upsert.isPending} icon={<Save className="h-4 w-4" />}>Save {type === 'MID_TERM' ? 'Mid Term' : 'Final Term'} Marks</Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------- Students ----------------
function StudentsTab({ subjectId }: { subjectId: number }) {
  const { data, isLoading } = useSubject(subjectId);
  const { data: attendance } = useAttendance(subjectId);
  const { data: marks } = useMarks(subjectId);

  if (isLoading) return <PageLoader />;
  const students = enrolledStudents(data?.item.enrollments);

  return (
    <Card>
      <CardHeader title="Student Record" subtitle={`${students.length} enrolled student(s) in this subject`} icon={<Users className="h-5 w-5" />} />
      <CardBody className="p-0">
        {students.length === 0 ? (
          <EmptyState title="No students enrolled" message="Add students to this semester first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Section</th>
                  <th className="px-5 py-3">Mid Term</th>
                  <th className="px-5 py-3">Final Term</th>
                  <th className="px-5 py-3">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const mid = (marks?.items ?? []).find((m) => m.studentId === s.id && m.assessmentType === 'MID_TERM');
                  const fin = (marks?.items ?? []).find((m) => m.studentId === s.id && m.assessmentType === 'FINAL_TERM');
                  const att = (attendance?.items ?? []).filter((a) => a.studentId === s.id);
                  const present = att.filter((a) => a.status === 'PRESENT').length;
                  const pct = att.length > 0 ? Math.round((present / att.length) * 1000) / 10 : 0;
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-navy-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.studentId}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{s.section ?? '—'}</td>
                      <td className="px-5 py-3">{mid ? `${mid.obtainedMarks}/${mid.totalMarks}` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3">{fin ? `${fin.obtainedMarks}/${fin.totalMarks}` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
