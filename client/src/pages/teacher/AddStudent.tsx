import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { UserPlus, UploadCloud, Download, Users, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useCreateStudent, useImportStudents } from '../../hooks/queries';
import { PageHeader, type Crumb } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { toast } from '../../components/ui/toastStore';
import { API_BASE } from '../../api/client';
import { Badge } from '../../components/ui/Badge';

export default function TeacherAddStudent() {
  const { deptId, sessionId, semesterId } = useParams();
  const deptIdNum = Number(deptId);
  const sessionIdNum = Number(sessionId);
  const semesterIdNum = Number(semesterId);
  const navigate = useNavigate();
  const create = useCreateStudent();
  const importMut = useImportStudents();

  const [mode, setMode] = useState<'individual' | 'excel'>('individual');

  // Individual form
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [section, setSection] = useState('');

  // Excel
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; issues: { row: number; reason: string }[] } | null>(null);

  const crumbs: Crumb[] = [
    { label: 'Departments', to: '/teacher/departments' },
    { label: `Department ${deptIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions` },
    { label: `Session ${sessionIdNum}`, to: `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters` },
    { label: 'Add Student' },
  ];

  const scope = `/teacher/departments/${deptIdNum}/sessions/${sessionIdNum}/semesters/${semesterIdNum}`;

  const submitIndividual = async () => {
    if (!name || !fatherName || !studentId) {
      toast.error('Name, father name and Student ID are required.');
      return;
    }
    try {
      await create.mutateAsync({
        name,
        fatherName,
        studentId,
        section: section || null,
        departmentId: deptIdNum,
        sessionId: sessionIdNum,
        semesterId: semesterIdNum,
      });
      toast.success('Student added successfully.');
      setName(''); setFatherName(''); setStudentId(''); setSection('');
      navigate(`${scope}/students`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add student.');
    }
  };

  const submitImport = async () => {
    if (!file) {
      toast.error('Please choose a file to upload.');
      return;
    }
    const form = new FormData();
    form.append('departmentId', String(deptIdNum));
    form.append('sessionId', String(sessionIdNum));
    form.append('semesterId', String(semesterIdNum));
    form.append('file', file);
    setImportResult(null);
    try {
      const json = (await importMut.mutateAsync(form)) as { success: boolean; message: string; result?: { successCount: number; errorCount: number; issues: { row: number; reason: string }[] } };
      toast.success(json.message);
      setImportResult(json.result ?? null);
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Add Student"
        subtitle="Add individually or import a batch from an Excel/CSV file."
        icon={<UserPlus className="h-5 w-5" />}
        crumbs={crumbs}
        actions={
          <Link to={scope} className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 hover:text-royal-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setMode('individual')}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${mode === 'individual' ? 'border-royal-500 bg-royal-50/50' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode === 'individual' ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Add Individually</p>
            <p className="text-xs text-slate-500">Manually enter one student record</p>
          </div>
        </button>
        <button
          onClick={() => setMode('excel')}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${mode === 'excel' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode === 'excel' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Add via Excel</p>
            <p className="text-xs text-slate-500">Upload an Excel/CSV student file</p>
          </div>
        </button>
      </div>

      {mode === 'individual' ? (
        <Card className="max-w-3xl">
          <CardHeader title="Student Details" subtitle="Fill in the academic information for the student" icon={<Users className="h-5 w-5" />} />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" />
              </Field>
              <Field label="Father Name" required>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="e.g. Muhammad Khan" />
              </Field>
              <Field label="Student ID / Roll Number" required hint="Must be unique">
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. PHARM-2020-005" />
              </Field>
              <Field label="Section">
                <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" maxLength={20} />
              </Field>
              <Field label="Department">
                <Select disabled value=""><option>Assigned from selection</option></Select>
              </Field>
              <Field label="Session">
                <Select disabled value=""><option>Assigned from selection</option></Select>
              </Field>
              <Field label="Semester">
                <Select disabled value=""><option>Assigned from selection</option></Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={submitIndividual} loading={create.isPending} icon={<UserPlus className="h-4 w-4" />}>Add Student</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="max-w-3xl space-y-4">
          <Card>
            <CardHeader title="Import Students" subtitle="Validated import into the selected Department · Session · Semester" icon={<UploadCloud className="h-5 w-5" />} />
            <CardBody>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block text-sm font-medium text-navy-800">Choose an Excel/CSV file</label>
                  <p className="text-xs text-slate-500">.xlsx, .xls or .csv · max 10 MB</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-royal-700 hover:file:bg-royal-100 sm:w-72"
                />
              </div>
              {file && (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" /> {file.name}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="teal" onClick={submitImport} loading={importMut.isPending} icon={<UploadCloud className="h-4 w-4" />}>Upload & Import</Button>
                <a
                  href={`${API_BASE}/files/template`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Download Sample Template
                </a>
              </div>
            </CardBody>
          </Card>

          {importResult && (
            <Card className="border-slate-200">
              <CardBody>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={importResult.successCount > 0 ? 'green' : 'slate'}><CheckCircle2 className="h-3.5 w-3.5" /> {importResult.successCount} imported</Badge>
                  <Badge tone={importResult.errorCount > 0 ? 'amber' : 'slate'}><AlertTriangle className="h-3.5 w-3.5" /> {importResult.errorCount} issues</Badge>
                </div>
                {importResult.errorCount > 0 && (
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr><th className="px-4 py-2">Row</th><th className="px-4 py-2">Issue</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.issues.map((i, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 font-semibold text-navy-800">#{i.row}</td>
                            <td className="px-4 py-2 text-slate-600"><span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-red-500" />{i.reason}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
