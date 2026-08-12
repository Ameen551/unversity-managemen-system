import { useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { useDepartments, useSessions, useSemesters, useSubjects, useTeachers, useCreateSubject, useUpdateSubject, useDeleteSubject } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Subject } from '../../types';

export default function AdminSubjects() {
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<number | undefined>();
  const { data: semesters } = useSemesters(departmentId, true);
  const { data, isLoading } = useSubjects(departmentId, sessionId, semesterId);
  const { data: teachers } = useTeachers();

  const create = useCreateSubject();
  const update = useUpdateSubject();
  const del = useDeleteSubject();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', creditHours: 3, description: '', isActive: true, teacherId: '' });
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const submit = async () => {
    if (!departmentId || !sessionId || !semesterId) { toast.error('Select department, session and semester.'); return; }
    if (!form.name || !form.code) { toast.error('Name and code are required.'); return; }
    try {
      const body = {
        name: form.name,
        code: form.code,
        creditHours: Number(form.creditHours),
        description: form.description || null,
        isActive: form.isActive,
        teacherId: form.teacherId ? Number(form.teacherId) : null,
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        toast.success('Subject updated.');
      } else {
        await create.mutateAsync({ ...body, departmentId, sessionId, semesterId });
        toast.success('Subject created and students auto-enrolled.');
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save subject.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Subject deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete subject.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Subject Management"
        subtitle="Subjects are scoped to Department + Session + Semester"
        icon={<BookOpen className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setForm({ name: '', code: '', creditHours: 3, description: '', isActive: true, teacherId: '' }); setOpen(true); }} icon={<Plus className="h-4 w-4" />}>Add Subject</Button>}
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Department">
            <Select value={departmentId ?? ''} onChange={(e) => { setDepartmentId(e.target.value ? Number(e.target.value) : undefined); setSemesterId(undefined); }}>
              <option value="">All departments</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session">
            <Select value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">All sessions</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={semesterId ?? ''} onChange={(e) => setSemesterId(e.target.value ? Number(e.target.value) : undefined)} disabled={!departmentId}>
              <option value="">All semesters</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : !data?.items.length ? (
        <EmptyState title="No subjects" message="Adjust filters or add a subject for the selected scope." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal-50 text-royal-600"><BookOpen className="h-5 w-5" /></div>
                <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-navy-900">{s.name}</h3>
              <p className="text-xs font-semibold text-royal-600">{s.code}</p>
              <p className="mt-1 text-xs text-slate-500">{s.department?.name} · {s.semester?.name} · {s.session?.label}</p>
              {s.teacher && <p className="mt-0.5 text-xs font-medium text-teal-600">Teacher: {s.teacher.fullName}{s.teacher.employeeId ? ` (${s.teacher.employeeId})` : ''}</p>}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {s.creditHours} credit hrs</p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(s); setForm({ name: s.name, code: s.code, creditHours: s.creditHours, description: s.description ?? '', isActive: s.isActive, teacherId: s.teacherId ? String(s.teacherId) : '' }); setOpen(true); }} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={create.isPending || update.isPending}>Save Subject</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Subject Code" required>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Credit Hours">
            <Select value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="Assign Teacher">
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">No teacher assigned</option>
              {teachers?.items.map((t) => <option key={t.id} value={t.id}>{t.fullName}{t.employeeId ? ` (${t.employeeId})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description / Instructions">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      {deleting && (
        <ConfirmDialog open title="Delete Subject" message={`Delete "${deleting.name}" (${deleting.code})? Only possible when no enrollments exist.`} confirmLabel="Delete" loading={del.isPending} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
