import { useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, KeyRound, Power } from 'lucide-react';
import { useTeachers, useCreateTeacher, useUpdateTeacher, useResetTeacherPassword, useDeleteTeacher, useDepartments } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import type { TeacherUser } from '../../types';

export default function AdminTeachers() {
  const { data, isLoading } = useTeachers();
  const { data: departments } = useDepartments(true);
  const create = useCreateTeacher();
  const update = useUpdateTeacher();
  const reset = useResetTeacherPassword();
  const del = useDeleteTeacher();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherUser | null>(null);
  const [form, setForm] = useState({ username: '', fullName: '', email: '', departmentId: '', phone: '', designation: '', qualification: '' });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState<TeacherUser | null>(null);
  const [resetManual, setResetManual] = useState('');
  const [deleting, setDeleting] = useState<TeacherUser | null>(null);

  const openCreate = () => { setEditing(null); setForm({ username: '', fullName: '', email: '', departmentId: '', phone: '', designation: '', qualification: '' }); setOpen(true); };
  const openEdit = (t: TeacherUser) => {
    setEditing(t);
    setForm({ username: t.username, fullName: t.fullName, email: t.email ?? '', departmentId: t.departmentId ? String(t.departmentId) : '', phone: t.phone ?? '', designation: t.designation ?? '', qualification: t.qualification ?? '' });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.username || !form.fullName) { toast.error('Username and full name are required.'); return; }
    try {
      const body = {
        username: form.username,
        fullName: form.fullName,
        email: form.email || null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        phone: form.phone || null,
        designation: form.designation || null,
        qualification: form.qualification || null,
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        toast.success('Teacher updated.');
        setOpen(false);
      } else {
        const res = await create.mutateAsync(body);
        setTempPassword((res as { temporaryPassword?: string }).temporaryPassword ?? null);
        toast.success((res as { message?: string }).message ?? 'Teacher created.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save teacher.');
    }
  };

  const doReset = async () => {
    if (!resetOpen) return;
    try {
      const res = await reset.mutateAsync({ id: resetOpen.id, newPassword: resetManual || undefined });
      setTempPassword((res as { temporaryPassword?: string }).temporaryPassword ?? (resetManual || 'Password reset'));
      setResetOpen(null);
      setResetManual('');
      toast.success('Password reset successfully.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password.');
    }
  };

  const toggleActive = async (t: TeacherUser) => {
    try {
      await update.mutateAsync({ id: t.id, body: { isActive: !t.isActive } });
      toast.success(t.isActive ? 'Teacher deactivated.' : 'Teacher activated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Teacher deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete teacher.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Teacher Management"
        subtitle="Add, edit, activate, reset access and manage teacher accounts"
        icon={<UserCog className="h-5 w-5" />}
        actions={<Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>Add Teacher</Button>}
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-royal-500 to-teal-500 font-bold text-white">{t.fullName?.[0]}</div>
                <Badge tone={t.isActive ? 'green' : 'red'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-navy-900">{t.fullName}</h3>
              <p className="text-xs text-slate-500">@{t.username}</p>
              {t.employeeId && <p className="mt-0.5 text-xs font-semibold text-royal-600">{t.employeeId}</p>}
              <p className="mt-1 text-xs text-slate-500">{t.department?.name ?? 'No department'}</p>
              {t.designation && <p className="mt-0.5 text-xs text-slate-500">{t.designation}</p>}
              {t.qualification && <p className="mt-0.5 text-xs text-slate-500">{t.qualification}</p>}
              {t.phone && <p className="mt-0.5 text-xs text-slate-500">{t.phone}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(t)} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setResetOpen(t)} icon={<KeyRound className="h-3.5 w-3.5" />}>Reset Password</Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(t)} icon={<Power className="h-3.5 w-3.5" />}>{t.isActive ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(t)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setTempPassword(null); }} title={editing ? 'Edit Teacher' : 'Add Teacher'} footer={
        <>
          <Button variant="outline" onClick={() => { setOpen(false); setTempPassword(null); }}>Close</Button>
          {!tempPassword && <Button onClick={submit} loading={create.isPending || update.isPending}>Save</Button>}
        </>
      }>
        {tempPassword ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal-800">Temporary password (shown once — share securely):</p>
            <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-lg font-bold text-navy-900">{tempPassword}</p>
            {editing?.employeeId && <p className="mt-2 text-xs text-teal-700">Employee ID: {editing.employeeId}</p>}
            <p className="mt-2 text-xs text-teal-700">The teacher can change it after logging in from their Profile.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username / User ID" required>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="teacher.username" disabled={!!editing} />
            </Field>
            <Field label="Full Name" required>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Ayesha Khan" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@university.edu" />
            </Field>
            <Field label="Department">
              <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">No department</option>
                {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Contact number" />
            </Field>
            <Field label="Designation">
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Assistant Professor" />
            </Field>
            <Field label="Qualification">
              <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. PhD Computer Science" />
            </Field>
            {!editing && <p className="col-span-2 text-xs text-slate-500">A secure temporary password is generated server-side and shown once after creation. Employee ID is auto-generated.</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!resetOpen} onClose={() => { setResetOpen(null); setResetManual(''); }} title={`Reset Password — ${resetOpen?.fullName ?? ''}`} footer={
        <>
          <Button variant="outline" onClick={() => { setResetOpen(null); setResetManual(''); }}>Cancel</Button>
          <Button onClick={doReset} loading={reset.isPending}>Reset Password</Button>
        </>
      }>
        <Field label="New password (optional)" hint="Leave empty to auto-generate a secure temporary password">
          <Input value={resetManual} onChange={(e) => setResetManual(e.target.value)} placeholder="At least 6 characters" />
        </Field>
      </Modal>

      {deleting && (
        <ConfirmDialog open title="Delete Teacher" message={`Delete the teacher account "${deleting.fullName}" (@${deleting.username})? This action cannot be undone.`} confirmLabel="Delete" loading={del.isPending} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
