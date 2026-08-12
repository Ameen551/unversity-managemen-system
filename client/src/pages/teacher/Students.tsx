import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import { StudentDataTable } from '../../components/StudentDataTable';
import { StudentDetailModal, StudentEditModal } from '../../components/StudentModals';
import { useDeleteStudent } from '../../hooks/queries';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { toast } from '../../components/ui/toastStore';
import type { Student } from '../../types';

export default function TeacherStudents() {
  const { deptId, sessionId, semesterId } = useParams();
  const deptIdNum = Number(deptId);
  const sessionIdNum = Number(sessionId);
  const semesterIdNum = Number(semesterId);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const deleteMut = useDeleteStudent();

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: `Department ${deptIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions` },
    { label: `Session ${sessionIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters` },
    { label: 'Students' },
  ];

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await deleteMut.mutateAsync(deleteStudent.id);
      toast.success('Student removed.');
      setDeleteStudent(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove student.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="View Students"
        subtitle="Search, filter and manage student records."
        icon={<Users className="h-5 w-5" />}
        crumbs={crumbs}
        actions={
          <Link to={`/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters/${semesterIdNum}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 hover:text-royal-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <StudentDataTable
        departmentId={deptIdNum}
        sessionId={sessionIdNum}
        semesterId={semesterIdNum}
        onView={(s) => setDetailId(s.id)}
        onEdit={(s) => setEditStudent(s)}
      />

      {detailId && <StudentDetailModal studentId={detailId} onClose={() => setDetailId(null)} />}
      {editStudent && <StudentEditModal student={editStudent} onClose={() => setEditStudent(null)} />}
      {deleteStudent && (
        <ConfirmDialog
          open
          title="Remove Student"
          message={`This will remove "${deleteStudent.name}" from active records. Teachers cannot undo this — only an Admin can restore it.`}
          confirmLabel="Remove"
          loading={deleteMut.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteStudent(null)}
        />
      )}
    </div>
  );
}
