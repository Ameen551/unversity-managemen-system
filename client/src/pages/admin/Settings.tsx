import { useState } from 'react';
import { Settings, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAssessmentConfigs } from '../../hooks/queries';
import { api } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import { useQueryClient } from '@tanstack/react-query';
import type { AssessmentConfig } from '../../types';

const ASSESSMENT_TYPES = [
  { value: 'SESSIONAL', label: 'Sessional' },
  { value: 'MID_TERM', label: 'Mid Term' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'FINAL_TERM', label: 'Final Term' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'VIVA', label: 'Viva' },
];

export default function AdminSettings() {
  const { data, isLoading } = useAssessmentConfigs();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssessmentConfig | null>(null);
  const [form, setForm] = useState({ assessmentType: 'SESSIONAL', label: '', defaultTotal: 40, allowedTotals: '40,50,100', editable: true });
  const [deleting, setDeleting] = useState<AssessmentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['assessment-configs'] });

  const submit = async () => {
    if (!form.label || !form.defaultTotal || !form.allowedTotals) {
      toast.error('Label, default total and allowed totals are required.');
      return;
    }
    const allowedTotals = form.allowedTotals.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n > 0);
    if (allowedTotals.length === 0) {
      toast.error('Allowed totals must be a comma-separated list of numbers.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/settings/${editing.id}`, {
          assessmentType: form.assessmentType,
          label: form.label,
          defaultTotal: Number(form.defaultTotal),
          allowedTotals,
          editable: form.editable,
        });
        toast.success('Assessment config updated.');
      } else {
        await api.post('/settings', {
          assessmentType: form.assessmentType,
          label: form.label,
          defaultTotal: Number(form.defaultTotal),
          allowedTotals,
          editable: form.editable,
        });
        toast.success('Assessment config created.');
      }
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/settings/${deleting.id}`);
      toast.success('Assessment config deleted.');
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Settings"
        subtitle="Configure marking structures and assessment totals"
        icon={<Settings className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setForm({ assessmentType: 'SESSIONAL', label: '', defaultTotal: 40, allowedTotals: '40,50,100', editable: true }); setOpen(true); }} icon={<Plus className="h-4 w-4" />}>Add Config</Button>}
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.items.map((c) => (
            <Card key={c.id}>
              <CardHeader
                title={c.label}
                subtitle={c.department ? `Applied to ${c.department.name}` : 'Applied globally'}
                actions={<Badge tone={c.isActive ? 'green' : 'red'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>}
              />
              <CardBody>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Assessment</span><span className="font-semibold">{c.assessmentType}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Default total</span><span className="font-semibold">{c.defaultTotal}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Editable total</span><span className="font-semibold">{c.editable ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between gap-3"><span className="shrink-0 text-slate-500">Allowed totals</span><span className="text-right font-semibold">{c.allowedTotals.replace(/[\[\]"]/g, '').replace(/,/g, ', ')}</span></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(c); setForm({ assessmentType: c.assessmentType, label: c.label, defaultTotal: c.defaultTotal, allowedTotals: c.allowedTotals.replace(/[\[\]"]/g, ''), editable: c.editable }); setOpen(true); }} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(c)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Assessment Config' : 'Add Assessment Config'} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assessment Type">
            <Select value={form.assessmentType} onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}>
              {ASSESSMENT_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </Field>
          <Field label="Label" required>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Mid Term" />
          </Field>
          <Field label="Default Total" required>
            <Input type="number" min={1} value={form.defaultTotal} onChange={(e) => setForm({ ...form, defaultTotal: Number(e.target.value) })} />
          </Field>
          <Field label="Editable Total" hint="Can teachers change the total marks?">
            <Select value={form.editable ? '1' : '0'} onChange={(e) => setForm({ ...form, editable: e.target.value === '1' })}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Allowed Totals" required hint="Comma separated, e.g. 40, 50, 100, 500">
              <Input value={form.allowedTotals} onChange={(e) => setForm({ ...form, allowedTotals: e.target.value })} placeholder="40, 50, 100, 500" />
            </Field>
          </div>
        </div>
      </Modal>

      {deleting && (
        <ConfirmDialog open title="Delete Assessment Config" message={`Delete the "${deleting.label}" assessment config?`} confirmLabel="Delete" loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
