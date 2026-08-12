import { useState } from 'react';
import { CalendarRange, Plus, Pencil, Trash2 } from 'lucide-react';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import type { Session } from '../../types';

const empty = { label: '', startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 4, isActive: true };

export default function AdminSessions() {
  const { data, isLoading } = useSessions(true);
  const create = useCreateSession();
  const update = useUpdateSession();
  const del = useDeleteSession();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Session | null>(null);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({ label: s.label, startYear: s.startYear, endYear: s.endYear, isActive: s.isActive });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.label || !form.startYear || !form.endYear) {
      toast.error('Label, start year and end year are required.');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: { label: form.label, startYear: Number(form.startYear), endYear: Number(form.endYear), isActive: form.isActive } });
        toast.success('Session updated.');
      } else {
        await create.mutateAsync({ label: form.label, startYear: Number(form.startYear), endYear: Number(form.endYear), isActive: form.isActive });
        toast.success('Session created.');
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save session.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Session deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete session.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Session Management"
        subtitle="Add, edit or remove academic sessions"
        icon={<CalendarRange className="h-5 w-5" />}
        actions={<Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>Add Session</Button>}
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <h3 className="mt-3 text-lg font-bold text-navy-900">{s.label}</h3>
              <p className="text-xs text-slate-500">{s._count?.subjects ?? 0} subjects · {s._count?.students ?? 0} students</p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Session' : 'Add Session'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={create.isPending || update.isPending}>Save</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Session Label" required hint="e.g. 2028 - 2032">
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="2028 - 2032" />
            </Field>
          </div>
          <Field label="Start Year" required>
            <Input type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: Number(e.target.value) })} />
          </Field>
          <Field label="End Year" required>
            <Input type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Status">
              <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete Session"
          message={`Delete session "${deleting.label}"? This is permanent and only possible when it has no students.`}
          confirmLabel="Delete"
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
