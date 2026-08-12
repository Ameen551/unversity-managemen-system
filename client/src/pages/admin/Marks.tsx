import { useState } from 'react';
import { ClipboardList, Save, Trash2, Download } from 'lucide-react';
import { useDepartments, useSessions, useSemesters, useSubjects, useMarks, useUpsertMarks, useDeleteMarks } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Select, Input } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import { API_BASE } from '../../api/client';
import { cn } from '../../utils/cn';
import type { Marks } from '../../types';

const ASSESSMENT_TYPES = [
  { value: 'SESSIONAL', label: 'Sessional' },
  { value: 'MID_TERM', label: 'Mid Term' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'FINAL_TERM', label: 'Final Term' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'VIVA', label: 'Viva' },
] as const;

type AssessmentType = typeof ASSESSMENT_TYPES[number]['value'];

const assessmentLabel = (t: string) => ASSESSMENT_TYPES.find((a) => a.value === t)?.label ?? t;

export default function AdminMarks() {
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('SESSIONAL');
  const { data: semesters } = useSemesters(departmentId, true);
  const { data: subjects } = useSubjects(departmentId, sessionId, semesterId);
  const { data, isLoading } = useMarks(subjectId, undefined, assessmentType);
  const upsert = useUpsertMarks();
  const del = useDeleteMarks();

  const [edits, setEdits] = useState<Record<number, { studentId: number; obtained: string; total: string; remarks: string }>>({});
  const [deleting, setDeleting] = useState<Marks | null>(null);

  const saveAll = async () => {
    if (!subjectId) return;
    const records = Object.entries(edits)
      .filter(([, v]) => v.obtained !== '')
      .map(([, v]) => ({ studentId: v.studentId, obtainedMarks: Number(v.obtained), totalMarks: Number(v.total), remarks: v.remarks || null }));
    if (records.length === 0) { toast.error('No edits to save.'); return; }
    try {
      await upsert.mutateAsync({ subjectId, assessmentType, records });
      toast.success('Marks saved successfully.');
      setEdits({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save marks.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Marks record deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Marks Management"
        subtitle="View, correct and manage marks across all subjects"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          subjectId ? (
            <a href={`${API_BASE}/reports/marks?subjectId=${subjectId}&format=excel`} target="_blank" rel="noreferrer">
              <Button variant="teal" icon={<Download className="h-4 w-4" />}>Export Excel</Button>
            </a>
          ) : undefined
        }
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Department">
            <Select value={departmentId ?? ''} onChange={(e) => { setDepartmentId(e.target.value ? Number(e.target.value) : undefined); setSemesterId(undefined); setSubjectId(undefined); }}>
              <option value="">All departments</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session">
            <Select value={sessionId ?? ''} onChange={(e) => { setSessionId(e.target.value ? Number(e.target.value) : undefined); setSubjectId(undefined); }}>
              <option value="">All sessions</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={semesterId ?? ''} onChange={(e) => { setSemesterId(e.target.value ? Number(e.target.value) : undefined); setSubjectId(undefined); }} disabled={!departmentId}>
              <option value="">All semesters</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Select a subject…</option>
              {subjects?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {!subjectId ? (
        <Card className="p-10 text-center text-slate-500">Select a subject to view its marks.</Card>
      ) : (
        <>
          <Card className="mb-5">
            <CardHeader
              title="Edit / Correct Marks"
              subtitle="Upsert marks for students in this subject"
              actions={
                <div className="flex flex-wrap gap-1">
                  {ASSESSMENT_TYPES.map((a) => (
                    <button key={a.value} onClick={() => setAssessmentType(a.value)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', assessmentType === a.value ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                      {a.label}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody>
              {isLoading ? (
                <PageLoader />
              ) : !data?.items.length ? (
                <p className="py-6 text-center text-slate-500">No marks records for this assessment type. Enter them in the Teacher portal or below.</p>
              ) : (
                <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-100">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Obtained</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Remarks</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((m) => {
                        const edit = edits[m.id] ?? { studentId: m.studentId, obtained: String(m.obtainedMarks), total: String(m.totalMarks), remarks: m.remarks ?? '' };
                        return (
                          <tr key={m.id}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-navy-900">{m.student?.name}</p>
                              <p className="text-xs text-slate-500">{m.student?.studentId}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <Input type="number" min={0} className="w-24" value={edit.obtained} onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: { ...edit, obtained: e.target.value } }))} />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input type="number" min={1} className="w-24" value={edit.total} onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: { ...edit, total: e.target.value } }))} />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input className="w-32" value={edit.remarks} onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: { ...edit, remarks: e.target.value } }))} placeholder="Optional" />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex justify-end">
                                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(m)} icon={<Trash2 className="h-4 w-4" />}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {data?.items.length ? (
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveAll} loading={upsert.isPending} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm text-slate-600">
                <Badge tone="royal">Note</Badge>{' '}
                Marks are stored per student, subject and assessment type. Available types: Sessional, Mid Term, Assignment, Final Term, Practical, Viva.
              </p>
            </CardBody>
          </Card>
        </>
      )}

      {deleting && (
        <ConfirmDialog open title="Delete Marks Record" message={`Delete the ${assessmentLabel(deleting.assessmentType)} marks record for ${deleting.student?.name}?`} confirmLabel="Delete" loading={del.isPending} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
