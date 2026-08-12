import { useState } from 'react';
import { FileBarChart2, FileSpreadsheet, FileDown, Printer, Users, ClipboardList, CalendarCheck, FileSearch, Upload, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartments, useSessions, useSemesters, useSubjects, useUploadGeneralFile } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Select } from '../../components/ui/Form';
import { toast } from '../../components/ui/toastStore';
import { API_BASE } from '../../api/client';

export default function AdminReports() {
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const { data: semesters } = useSemesters(departmentId, true);
  const { data: subjects } = useSubjects(departmentId, sessionId, semesterId);

  const uploadFile = useUploadGeneralFile();
  const qc = useQueryClient();
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const buildUrl = (kind: 'students' | 'marks' | 'attendance' | 'overall', format: 'excel' | 'csv') => {
    const qs = new URLSearchParams({ format });
    if (kind === 'students') {
      if (departmentId) qs.set('departmentId', String(departmentId));
      if (sessionId) qs.set('sessionId', String(sessionId));
      if (semesterId) qs.set('semesterId', String(semesterId));
    }
    if (kind === 'marks') {
      if (subjectId) qs.set('subjectId', String(subjectId));
      if (departmentId) qs.set('departmentId', String(departmentId));
      if (sessionId) qs.set('sessionId', String(sessionId));
      if (semesterId) qs.set('semesterId', String(semesterId));
    }
    if (kind === 'attendance') {
      if (subjectId) qs.set('subjectId', String(subjectId));
    }
    return `${API_BASE}/reports/${kind}?${qs.toString()}`;
  };

  const download = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  const handleUpload = async () => {
    if (!uploadFileObj) { toast.error('Select a file first.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFileObj);
      await uploadFile.mutateAsync(fd);
      toast.success(`"${uploadFileObj.name}" uploaded successfully.`);
      setUploadFileObj(null);
      qc.invalidateQueries({ queryKey: ['uploads'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const canMarks = Boolean(subjectId || departmentId || sessionId || semesterId);
  const canAttendance = Boolean(subjectId);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Reports & Downloads"
        subtitle="Export student, marks, attendance and overall records as Excel, CSV or printable report"
        icon={<FileBarChart2 className="h-5 w-5" />}
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Department">
            <Select value={departmentId ?? ''} onChange={(e) => { setDepartmentId(e.target.value ? Number(e.target.value) : undefined); setSemesterId(undefined); setSubjectId(undefined); }}>
              <option value="">All departments</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session">
            <Select value={sessionId ?? ''} onChange={(e) => { setSessionId(e.target.value ? Number(e.target.value) : undefined); setSubjectId(undefined); }}>
              <option value="">All sessions</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={semesterId ?? ''} onChange={(e) => { setSemesterId(e.target.value ? Number(e.target.value) : undefined); setSubjectId(undefined); }} disabled={!departmentId}>
              <option value="">All semesters</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">All subjects</option>
              {subjects?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Student List" subtitle="All students matching the selected scope" icon={<Users className="h-5 w-5" />} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => download(buildUrl('students', 'excel'))} icon={<FileSpreadsheet className="h-4 w-4" />}>Excel</Button>
              <Button variant="teal" onClick={() => download(buildUrl('students', 'csv'))} icon={<FileDown className="h-4 w-4" />}>CSV</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Marks Report" subtitle="Subject-wise / semester-wise marks" icon={<ClipboardList className="h-5 w-5" />} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canMarks} onClick={() => download(buildUrl('marks', 'excel'))} icon={<FileSpreadsheet className="h-4 w-4" />}>Excel</Button>
              <Button variant="teal" disabled={!canMarks} onClick={() => download(buildUrl('marks', 'csv'))} icon={<FileDown className="h-4 w-4" />}>CSV</Button>
            </div>
            {!canMarks && <p className="mt-3 text-xs text-amber-600">Select a subject or department/session/semester to export marks.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Attendance Report" subtitle="Subject-wise attendance records" icon={<CalendarCheck className="h-5 w-5" />} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canAttendance} onClick={() => download(buildUrl('attendance', 'excel'))} icon={<FileSpreadsheet className="h-4 w-4" />}>Excel</Button>
              <Button variant="teal" disabled={!canAttendance} onClick={() => download(buildUrl('attendance', 'csv'))} icon={<FileDown className="h-4 w-4" />}>CSV</Button>
            </div>
            {!canAttendance && <p className="mt-3 text-xs text-amber-600">Select a subject to export attendance.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upload File" subtitle="Upload any file (PDF, Word, Image, Excel, etc.)" icon={<Upload className="h-5 w-5" />} />
          <CardBody>
            <div className="flex flex-wrap items-end gap-2">
              <input type="file" onChange={(e) => setUploadFileObj(e.target.files?.[0] ?? null)} className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-royal-700 hover:file:bg-royal-100" />
              <Button onClick={handleUpload} loading={uploading} disabled={!uploadFileObj} icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
            {uploadFileObj && (
              <p className="mt-2 text-xs text-slate-500">Selected: {uploadFileObj.name} ({(uploadFileObj.size / 1024).toFixed(1)} KB)</p>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Printer className="h-3.5 w-3.5" /> For a printable report, open any Excel/CSV file and print from your browser.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Overall Records" subtitle="Complete academic record for every student" icon={<FileSearch className="h-5 w-5" />} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => download(buildUrl('overall', 'excel'))} icon={<FileSpreadsheet className="h-4 w-4" />}>Excel</Button>
              <Button variant="teal" onClick={() => download(buildUrl('overall', 'csv'))} icon={<FileDown className="h-4 w-4" />}>CSV</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
