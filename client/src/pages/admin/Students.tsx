import { useState } from 'react';
import { Users, UserPlus, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartments, useSessions, useSemesters, useDeleteStudent, useRestoreStudent } from '../../hooks/queries';
import { api } from '../../api/client';
import { StudentDataTable } from '../../components/StudentDataTable';
import { StudentDetailModal, StudentEditModal } from '../../components/StudentModals';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Form';
import { toast } from '../../components/ui/toastStore';
import type { Student } from '../../types';

export default function AdminStudents() {
  const qc = useQueryClient();
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<number | undefined>();
  const { data: semesters } = useSemesters(departmentId, true);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [restoreStudent, setRestoreStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const del = useDeleteStudent();
  const restore = useRestoreStudent();

  // Add Student form state
  const [form, setForm] = useState({
    name: '', fatherName: '', studentId: '', admissionNumber: '', section: '',
    dateOfBirth: '', gender: '', phone: '', email: '', address: '', cnic: '',
  });

  // Modal-specific scope selectors (independent of the table filters above)
  const [modalDeptId, setModalDeptId] = useState<number | undefined>();
  const [modalSessionId, setModalSessionId] = useState<number | undefined>();
  const [modalSemesterId, setModalSemesterId] = useState<number | undefined>();
  const { data: modalSemesters } = useSemesters(modalDeptId, true);

  const openAddModal = () => {
    setForm({ name: '', fatherName: '', studentId: '', admissionNumber: '', section: '', dateOfBirth: '', gender: '', phone: '', email: '', address: '', cnic: '' });
    setModalDeptId(undefined);
    setModalSessionId(undefined);
    setModalSemesterId(undefined);
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!modalDeptId || !modalSessionId || !modalSemesterId) { toast.error('Select department, session and semester.'); return; }
    if (!form.name || !form.fatherName || !form.studentId) { toast.error('Name, Father Name and Student ID are required.'); return; }
    setSaving(true);
    try {
      const json = await api.post<{ message: string; item: Student }>('/students', {
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        departmentId: modalDeptId,
        sessionId: modalSessionId,
        semesterId: modalSemesterId,
      });
      toast.success(json.message);
      setShowAdd(false);
      // Sync table filters to match the scope where the student was just added
      // so the table renders and the new student is immediately visible.
      setDepartmentId(modalDeptId);
      setSessionId(modalSessionId);
      setSemesterId(modalSemesterId);
      qc.invalidateQueries({ queryKey: ['students'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await del.mutateAsync(deleteStudent.id);
      toast.success('Student removed (soft delete). Can be restored.');
      setDeleteStudent(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove student.');
    }
  };

  const handleRestore = async () => {
    if (!restoreStudent) return;
    try {
      await restore.mutateAsync(restoreStudent.id);
      toast.success('Student restored.');
      setRestoreStudent(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to restore student.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Student Management"
        subtitle="View, add, edit, delete and restore student records across all programs"
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button onClick={openAddModal} icon={<UserPlus className="h-4 w-4" />}>Add Student</Button>
            <Link to="/admin/subjects" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50">
              <LinkIcon className="h-4 w-4" /> Manage Subjects
            </Link>
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
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
          <Field label="Include deleted">
            <Select value={includeDeleted ? '1' : '0'} onChange={(e) => setIncludeDeleted(e.target.value === '1')}>
              <option value="0">Active only</option>
              <option value="1">Include deleted</option>
            </Select>
          </Field>
        </div>
      </Card>

      {departmentId && sessionId && semesterId ? (
        <StudentDataTable
          departmentId={departmentId}
          sessionId={sessionId}
          semesterId={semesterId}
          canDelete
          includeDeleted={includeDeleted}
          onView={(s) => setDetailId(s.id)}
          onEdit={(s) => setEditStudent(s)}
          onDelete={(s) => setDeleteStudent(s)}
          onRestore={(s) => setRestoreStudent(s)}
        />
      ) : departmentId ? (
        <Card className="p-10 text-center text-slate-500">Select a session and semester to view students.</Card>
      ) : (
        <Card className="p-10 text-center text-slate-500">Select a department, session and semester to browse student records.</Card>
      )}

      {/* Add Student Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Student" footer={
        <>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd} loading={saving}>Add Student</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" required>
            <Select value={modalDeptId ?? ''} onChange={(e) => { setModalDeptId(e.target.value ? Number(e.target.value) : undefined); setModalSemesterId(undefined); }}>
              <option value="">Select department</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session" required>
            <Select value={modalSessionId ?? ''} onChange={(e) => setModalSessionId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Select session</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester" required>
            <Select value={modalSemesterId ?? ''} onChange={(e) => setModalSemesterId(e.target.value ? Number(e.target.value) : undefined)} disabled={!modalDeptId}>
              <option value="">Select semester</option>
              {modalSemesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Student Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </Field>
          <Field label="Father Name" required>
            <Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father name" />
          </Field>
          <Field label="Student ID / Roll Number" required>
            <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="e.g. PHARM-2024-001" />
          </Field>
          <Field label="Admission Number">
            <Input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Section">
            <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Contact number" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@email.com" />
          </Field>
          <Field label="CNIC / National ID">
            <Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="Optional" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Permanent address" />
            </Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Student will be enrolled in all matching subjects for the selected semester automatically.</p>
      </Modal>

      {detailId && <StudentDetailModal studentId={detailId} onClose={() => setDetailId(null)} />}
      {editStudent && <StudentEditModal student={editStudent} onClose={() => setEditStudent(null)} />}
      {deleteStudent && (
        <ConfirmDialog open title="Remove Student" message={`Remove "${deleteStudent.name}" (${deleteStudent.studentId})? This is a soft delete.`} confirmLabel="Remove" loading={del.isPending} onConfirm={handleDelete} onCancel={() => setDeleteStudent(null)} />
      )}
      {restoreStudent && (
        <ConfirmDialog open title="Restore Student" message={`Restore "${restoreStudent.name}" (${restoreStudent.studentId})?`} confirmLabel="Restore" loading={restore.isPending} onConfirm={handleRestore} onCancel={() => setRestoreStudent(null)} />
      )}
    </div>
  );
}
