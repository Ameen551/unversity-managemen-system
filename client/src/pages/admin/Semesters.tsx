import { useState } from 'react';
import { Layers, Plus, Pencil, Trash2, Wand2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartments, useSemesters, useCreateSemester, useUpdateSemester, useDeleteSemester } from '../../hooks/queries';
import { api } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import type { Semester } from '../../types';

export default function AdminSemesters() {
  const qc = useQueryClient();
  const { data: departments } = useDepartments(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const { data, isLoading } = useSemesters(departmentId, true);

  const create = useCreateSemester();
  const update = useUpdateSemester();
  const del = useDeleteSemester();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [form, setForm] = useState({ name: '', number: 1, isActive: true });
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);

  const submit = async () => {
    if (!departmentId) { toast.error('Select a department first.'); return; }
    if (!form.name || !form.number) { toast.error('Name and number are required.'); return; }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: { name: form.name, number: Number(form.number), isActive: form.isActive } });
        toast.success('Semester updated.');
      } else {
        await create.mutateAsync({ name: form.name, number: Number(form.number), departmentId, isActive: form.isActive });
        toast.success('Semester created.');
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save semester.');
    }
  };

  const bulkCreate = async () => {
    if (!departmentId) return;
    try {
      const json = await api.post<{ message: string }>('/semesters/bulk', { departmentId, count: Number(bulkCount) });
      toast.success(json.message);
      setBulkOpen(false);
      qc.invalidateQueries({ queryKey: ['semesters'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create semesters.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Semester deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete semester.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Semester Management"
        subtitle="Configure the number of semesters per department/program"
        icon={<Layers className="h-5 w-5" />}
        actions={
          <>
            <Button variant="teal" onClick={() => setBulkOpen(true)} icon={<Wand2 className="h-4 w-4" />}>Generate 1–N</Button>
            <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Semester</Button>
          </>
        }
      />

      <Card className="mb-6 max-w-md p-4">
        <Field label="Department">
          <Select value={departmentId ?? ''} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Select a department…</option>
            {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      </Card>

      {!departmentId ? (
        <Card className="p-10 text-center text-slate-500">Select a department to manage its semesters.</Card>
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Layers className="h-5 w-5" /></div>
                <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-navy-900">{s.name}</h3>
              <p className="text-xs text-slate-500">{s._count?.students ?? 0} students · {s._count?.subjects ?? 0} subjects</p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(s); setForm({ name: s.name, number: s.number, isActive: s.isActive }); setOpen(true); }} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Semester' : 'Add Semester'} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={create.isPending || update.isPending}>Save</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Semester Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Semester 3" />
          </Field>
          <Field label="Semester Number" required>
            <Input type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
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

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Generate Semesters" subtitle="Quickly create Semester 1 through N for the selected department" footer={
        <>
          <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button onClick={bulkCreate}>Generate</Button>
        </>
      }>
        <Field label="Number of semesters" required>
          <Input type="number" min={1} max={12} value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))} />
        </Field>
        <p className="mt-2 text-xs text-slate-500">Programs like DPT and Pharm-D may need up to 10 semesters.</p>
      </Modal>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete Semester"
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
