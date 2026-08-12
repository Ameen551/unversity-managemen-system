import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Plus, Clock, ArrowRight, Layers } from 'lucide-react';
import { useSubjects, useCreateSubject } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';

export default function TeacherSubjects() {
  const { deptId, sessionId, semesterId } = useParams();
  const deptIdNum = Number(deptId);
  const sessionIdNum = Number(sessionId);
  const semesterIdNum = Number(semesterId);

  const { data, isLoading, isError } = useSubjects(deptIdNum, sessionIdNum, semesterIdNum);
  const create = useCreateSubject();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [description, setDescription] = useState('');

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: `Department ${deptIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions` },
    { label: `Session ${sessionIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters` },
    { label: 'Subjects' },
  ];

  const scope = `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters/${semesterIdNum}`;

  const submit = async () => {
    if (!name || !code) {
      toast.error('Subject name and code are required.');
      return;
    }
    try {
      await create.mutateAsync({
        name,
        code,
        creditHours: Number(creditHours) || 3,
        description: description || null,
        departmentId: deptIdNum,
        sessionId: sessionIdNum,
        semesterId: semesterIdNum,
      });
      toast.success('Subject saved successfully.');
      setOpen(false);
      setName(''); setCode(''); setCreditHours(3); setDescription('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save subject.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Subjects"
        subtitle="Subjects assigned to this Department · Session · Semester"
        icon={<BookOpen className="h-5 w-5" />}
        crumbs={crumbs}
        actions={
          <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Subject</Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <Card className="p-10 text-center text-slate-500">Could not load subjects.</Card>
      ) : data.items.length === 0 ? (
        <EmptyState title="No subjects yet" message="Add the first subject for this department, session and semester." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((subj) => (
            <Link key={subj.id} to={`${scope}/subjects/${subj.id}`} className="group">
              <Card hoverable className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-royal-300">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-royal-500 to-royal-700 text-white shadow-card">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">{subj.code}</span>
                </div>
                <h3 className="mt-4 font-bold text-navy-900">{subj.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[2rem] text-sm text-slate-500">{subj.description ?? 'No description'}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {subj.creditHours} credit hrs</span>
                  <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {subj.semester?.name}</span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600">
                  Open subject <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Subject"
        subtitle="Save to this department · session · semester"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={create.isPending}>Save Subject</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic Chemistry" />
          </Field>
          <Field label="Subject Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CHEM-201" />
          </Field>
          <Field label="Credit Hours">
            <Select value={creditHours} onChange={(e) => setCreditHours(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description / Instructions">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief subject description or instructions…" />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
