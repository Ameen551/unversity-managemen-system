import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Textarea, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import type { Department } from '../../types';

const empty = { name: '', code: '', description: '', sortOrder: 0, isActive: true };

export default function AdminDepartments() {
  const { data, isLoading, isError } = useDepartments(true);
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const del = useDeleteDepartment();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code, description: d.description ?? '', sortOrder: d.sortOrder, isActive: d.isActive });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name || !form.code) {
      toast.error('Name and code are required.');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: { name: form.name, code: form.code, description: form.description || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive } });
        toast.success('Department updated.');
      } else {
        await create.mutateAsync({ name: form.name, code: form.code, description: form.description || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive });
        toast.success('Department created.');
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save department.');
    }
  };

  const toggleActive = async (d: Department) => {
    try {
      await update.mutateAsync({ id: d.id, body: { isActive: !d.isActive } });
      toast.success(d.isActive ? 'Department deactivated.' : 'Department activated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Department deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete department.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Department Management"
        subtitle="Add, edit, activate or remove programs"
        icon={<Building2 className="h-5 w-5" />}
        actions={<Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>Add Department</Button>}
      />

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <Card className="p-10 text-center text-slate-500">Could not load departments.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge tone={d.isActive ? 'green' : 'red'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-navy-900">{d.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-royal-600">{d.code}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description}</p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(d)} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(d)} icon={<Power className="h-3.5 w-3.5" />}>{d.isActive ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(d)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Department' : 'Add Department'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={create.isPending || update.isPending}>Save</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BS Software Engineering" />
          </Field>
          <Field label="Code" required hint="Short unique code, e.g. BSIT">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. BSIT" />
          </Field>
          <Field label="Sort Order">
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </Field>
          <Field label="Status">
            <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the program…" />
            </Field>
          </div>
        </div>
      </Modal>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete Department"
          message={`Delete "${deleting.name}"? This is permanent and only possible when it has no students.`}
          confirmLabel="Delete"
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
