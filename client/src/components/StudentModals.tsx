import { useState } from 'react';
import {
  UserRound,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useStudent, useUpdateStudent } from '../hooks/queries';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Form';
import { toast } from './ui/toastStore';
import type { Student } from '../types';

export function StudentDetailModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const { data, isLoading } = useStudent(studentId);
  const s = data?.item;

  return (
    <Modal open onClose={onClose} title="Student Profile" subtitle="Complete academic record" size="lg">
      {isLoading || !s ? (
        <div className="py-8 text-center text-slate-500">Loading student profile…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 p-5 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-royal-400 to-teal-400 text-xl font-bold">
              {s.name?.[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="text-sm text-slate-300">{s.studentId} · {s.section ?? 'No section'}</p>
            </div>
            <Badge tone={s.isDeleted ? 'red' : 'green'}>{s.isDeleted ? 'Deleted' : 'Active'}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile icon={<UserRound className="h-4 w-4" />} label="Father Name" value={s.fatherName} />
            <InfoTile icon={<Users className="h-4 w-4" />} label="Department" value={s.department?.name ?? '—'} />
            <InfoTile icon={<CalendarCheck className="h-4 w-4" />} label="Session" value={s.session?.label ?? '—'} />
            <InfoTile icon={<BookOpen className="h-4 w-4" />} label="Semester" value={s.semester?.name ?? '—'} />
            <InfoTile icon={<ClipboardList className="h-4 w-4" />} label="Subjects" value={String(s.enrollments?.length ?? 0)} />
            <InfoTile icon={<Clock className="h-4 w-4" />} label="Added by" value={s.createdBy?.fullName ?? '—'} />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy-900">Subjects</h4>
            {s.enrollments?.length ? (
              <div className="flex flex-wrap gap-2">
                {s.enrollments.map((e) => (
                  <span key={e.id} className="rounded-lg bg-royal-50 px-3 py-1.5 text-xs font-medium text-royal-700 ring-1 ring-royal-100">
                    {e.subject?.code} · {e.subject?.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No subjects enrolled.</p>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy-900">Marks & Attendance</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <MarksBlock student={s} />
              <AttendanceBlock studentId={studentId} attendanceBySubject={data.attendanceBySubject} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function MarksBlock({ student }: { student: Student }) {
  const mid = (student.marks ?? []).filter((m) => m.assessmentType === 'MID_TERM');
  const fin = (student.marks ?? []).filter((m) => m.assessmentType === 'FINAL_TERM');
  const sum = (arr: { obtainedMarks: number; totalMarks: number }[]) => ({
    o: arr.reduce((a, b) => a + b.obtainedMarks, 0),
    t: arr.reduce((a, b) => a + b.totalMarks, 0),
  });
  const m = sum(mid);
  const f = sum(fin);
  const pct = (o: number, t: number) => (t > 0 ? Math.round((o / t) * 1000) / 10 : 0);
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ClipboardList className="h-3.5 w-3.5" /> Marks</p>
      <div className="mt-2 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Mid Term</span><span className="font-semibold">{m.t > 0 ? `${m.o} / ${m.t}` : '—'}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Final Term</span><span className="font-semibold">{f.t > 0 ? `${f.o} / ${f.t}` : '—'}</span></div>
        <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Overall %</span><span className="font-bold text-royal-700">{m.t + f.t > 0 ? pct(m.o + f.o, m.t + f.t) + '%' : '—'}</span></div>
      </div>
    </div>
  );
}

function AttendanceBlock({ studentId, attendanceBySubject }: { studentId: number; attendanceBySubject?: Record<string, { total: number; present: number; absent: number; leave: number }> }) {
  const entries = Object.values(attendanceBySubject ?? {});
  const total = entries.reduce((a, b) => a + b.total, 0);
  const present = entries.reduce((a, b) => a + b.present, 0);
  const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarCheck className="h-3.5 w-3.5" /> Attendance</p>
      <div className="mt-2 space-y-2 text-sm">
        <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-slate-500"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Present</span><span className="font-semibold">{present}</span></div>
        <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-slate-500"><XCircle className="h-3.5 w-3.5 text-red-500" /> Absent / Leave</span><span className="font-semibold">{total - present}</span></div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-2"><span className="flex items-center gap-1.5 text-slate-500"><Percent className="h-3.5 w-3.5" /> Percentage</span><span className="font-bold text-teal-700">{total > 0 ? pct + '%' : '—'}</span></div>
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentEditModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved?: () => void }) {
  const [name, setName] = useState(student.name);
  const [fatherName, setFatherName] = useState(student.fatherName);
  const [studentId, setStudentId] = useState(student.studentId);
  const [section, setSection] = useState(student.section ?? '');
  const update = useUpdateStudent();

  const submit = async () => {
    if (!name || !fatherName || !studentId) {
      toast.error('Name, father name and student ID are required.');
      return;
    }
    try {
      await update.mutateAsync({ id: student.id, body: { name, fatherName, studentId, section: section || null } });
      toast.success('Student updated successfully.');
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update student.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Student"
      subtitle={`${student.department?.name ?? ''} · ${student.session?.label ?? ''} · ${student.semester?.name ?? ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={update.isPending}>Save Changes</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Student Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Father Name" required>
          <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
        </Field>
        <Field label="Student ID / Roll Number" required>
          <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        </Field>
        <Field label="Section">
          <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" maxLength={20} />
        </Field>
      </div>
    </Modal>
  );
}
