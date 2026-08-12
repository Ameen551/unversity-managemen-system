import { useState } from 'react';
import { CalendarCheck, Trash2, Download, Save, CheckCircle, XCircle, MinusCircle, Clock, History, Users } from 'lucide-react';
import { useDepartments, useSessions, useSemesters, useSubjects, useAttendance, useDeleteAttendance, useStudentsByScope, useMarkAttendanceByScope, useStudentAttendanceHistory, useStudents } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Select, Input } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';
import { cn } from '../../utils/cn';
import { API_BASE } from '../../api/client';
import type { Attendance } from '../../types';

type Tab = 'mark' | 'view' | 'history';

export default function AdminAttendance() {
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<number | undefined>();
  const { data: semesters } = useSemesters(departmentId, true);

  const [tab, setTab] = useState<Tab>('mark');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');

  const { data: scopeStudents, isLoading: loadingStudents } = useStudentsByScope(
    departmentId, sessionId, semesterId,
    tab === 'mark' ? attDate : undefined
  );
  const markMut = useMarkAttendanceByScope();
  const del = useDeleteAttendance();
  const [deleting, setDeleting] = useState<Attendance | null>(null);

  const [localMarks, setLocalMarks] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'LEAVE'>>({});

  const setStatus = (studentId: number, status: 'PRESENT' | 'ABSENT' | 'LEAVE') => {
    setLocalMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const hasChanges = Object.keys(localMarks).length > 0;

  const filteredStudents = scopeStudents?.items.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || (s.section ?? '').toLowerCase().includes(q);
  }) ?? [];

  const saveAttendance = async () => {
    if (!departmentId || !sessionId || !semesterId) return;
    const records = Object.entries(localMarks).map(([sid, status]) => ({ studentId: Number(sid), status }));
    if (records.length === 0) { toast.error('No changes to save.'); return; }
    try {
      await markMut.mutateAsync({ departmentId, sessionId, semesterId, date: attDate, records });
      toast.success(`Attendance saved for ${records.length} student(s).`);
      setLocalMarks({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save attendance.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Attendance record deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete.');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'mark', label: 'Student Attendance', icon: <Users className="h-4 w-4" /> },
    { key: 'view', label: 'View Records', icon: <Clock className="h-4 w-4" /> },
    { key: 'history', label: 'Student History', icon: <History className="h-4 w-4" /> },
  ];

  const ready = departmentId && sessionId && semesterId;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Attendance Management"
        subtitle="Mark attendance, view records and check student history"
        icon={<CalendarCheck className="h-5 w-5" />}
      />

      {/* Scope filters — always visible */}
      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Department" required>
            <Select value={departmentId ?? ''} onChange={(e) => { setDepartmentId(e.target.value ? Number(e.target.value) : undefined); setSemesterId(undefined); setLocalMarks({}); }}>
              <option value="">Select department</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session" required>
            <Select value={sessionId ?? ''} onChange={(e) => { setSessionId(e.target.value ? Number(e.target.value) : undefined); setLocalMarks({}); }}>
              <option value="">Select session</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester" required>
            <Select value={semesterId ?? ''} onChange={(e) => { setSemesterId(e.target.value ? Number(e.target.value) : undefined); setLocalMarks({}); }} disabled={!departmentId}>
              <option value="">Select semester</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={attDate} onChange={(e) => { setAttDate(e.target.value); setLocalMarks({}); }} />
          </Field>
        </div>
      </Card>

      {!ready ? (
        <Card className="p-10 text-center text-slate-500">Select Department, Session and Semester to view students and mark attendance.</Card>
      ) : (
        <>
          {/* Tab bar */}
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors', tab === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Student Attendance Tab */}
          {tab === 'mark' && (
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-navy-900">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</p>
                  <input
                    type="text"
                    placeholder="Search by name, ID or section…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
                  />
                </div>
                {hasChanges && (
                  <Button onClick={saveAttendance} loading={markMut.isPending} icon={<Save className="h-4 w-4" />}>
                    Save ({Object.keys(localMarks).length} changes)
                  </Button>
                )}
              </div>
              <div className="p-5">
                {loadingStudents ? (
                  <PageLoader />
                ) : !filteredStudents.length ? (
                  <p className="py-6 text-center text-slate-500">No students found for this scope.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Student ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Section</th>
                          <th className="px-4 py-3 text-center">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((s, i) => {
                          const currentStatus = localMarks[s.id] ?? s.attendanceStatus ?? null;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">{s.studentId}</td>
                              <td className="px-4 py-3 font-medium text-navy-900">{s.name}</td>
                              <td className="px-4 py-3 text-slate-600">{s.section ?? '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => setStatus(s.id, 'PRESENT')}
                                    className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                      currentStatus === 'PRESENT' ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    )}
                                  >
                                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Present
                                  </button>
                                  <button
                                    onClick={() => setStatus(s.id, 'ABSENT')}
                                    className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                      currentStatus === 'ABSENT' ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200' : 'bg-red-50 text-red-700 hover:bg-red-100'
                                    )}
                                  >
                                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Absent
                                  </button>
                                  <button
                                    onClick={() => setStatus(s.id, 'LEAVE')}
                                    className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                      currentStatus === 'LEAVE' ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    )}
                                  >
                                    <MinusCircle className="mr-1 inline h-3.5 w-3.5" /> Leave
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {hasChanges && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={saveAttendance} loading={markMut.isPending} icon={<Save className="h-4 w-4" />}>
                      Save Attendance ({Object.keys(localMarks).length} student{Object.keys(localMarks).length !== 1 ? 's' : ''})
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* View Records Tab */}
          {tab === 'view' && <ViewRecords departmentId={departmentId!} sessionId={sessionId!} semesterId={semesterId!} attDate={attDate} />}

          {/* History Tab */}
          {tab === 'history' && <AttendanceHistory />}
        </>
      )}

      {deleting && (
        <ConfirmDialog
          open
          title="Delete Attendance Record"
          message={`Delete the attendance record for ${deleting.student?.name} on ${new Date(deleting.date).toLocaleDateString()} (lecture #${deleting.lectureNo})?`}
          confirmLabel="Delete"
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function ViewRecords({ departmentId, sessionId, semesterId, attDate }: { departmentId: number; sessionId: number; semesterId: number; attDate: string }) {
  const { data: attendanceData, isLoading } = useStudentsByScope(departmentId, sessionId, semesterId, attDate);
  const del = useDeleteAttendance();
  const [deleting, setDeleting] = useState<{ id: number; name: string; studentName: string; date: string; lectureNo: number } | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Attendance record deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete.');
    }
  };

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-semibold text-navy-900">Attendance for {new Date(attDate).toLocaleDateString()} — {attendanceData?.items.filter((s) => s.attendanceStatus).length ?? 0} of {attendanceData?.items.length ?? 0} marked</p>
      </div>
      <div className="p-5">
        {isLoading ? (
          <PageLoader />
        ) : !attendanceData?.items.length ? (
          <p className="py-6 text-center text-slate-500">No students found for this scope.</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Section</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceData.items.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-navy-900">{s.studentId}</td>
                    <td className="px-5 py-3 font-medium text-navy-900">{s.name}</td>
                    <td className="px-5 py-3 text-slate-600">{s.section ?? '—'}</td>
                    <td className="px-5 py-3">
                      {s.attendanceStatus ? (
                        <Badge tone={statusTone(s.attendanceStatus)}>{s.attendanceStatus}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Not marked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleting && (
        <ConfirmDialog
          open
          title="Delete Attendance Record"
          message={`Delete attendance for ${deleting.studentName} on ${new Date(deleting.date).toLocaleDateString()}?`}
          confirmLabel="Delete"
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Card>
  );
}

function AttendanceHistory() {
  const { data: students } = useStudents({ pageSize: 500 });
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>();
  const [historySemesterId, setHistorySemesterId] = useState<number | undefined>();
  const { data: history, isLoading } = useStudentAttendanceHistory(selectedStudentId, historySemesterId);
  const { data: departments } = useDepartments(true);
  const [histDeptId, setHistDeptId] = useState<number | undefined>();
  const { data: semesters } = useSemesters(histDeptId, true);

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Student">
            <Select value={selectedStudentId ?? ''} onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Select a student…</option>
              {students?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>)}
            </Select>
          </Field>
          <Field label="Department (optional filter)">
            <Select value={histDeptId ?? ''} onChange={(e) => { setHistDeptId(e.target.value ? Number(e.target.value) : undefined); setHistorySemesterId(undefined); }}>
              <option value="">All departments</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Semester (optional)">
            <Select value={historySemesterId ?? ''} onChange={(e) => setHistorySemesterId(e.target.value ? Number(e.target.value) : undefined)} disabled={!histDeptId}>
              <option value="">All semesters</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
      </div>
      <div className="p-5">
        {!selectedStudentId ? (
          <p className="py-6 text-center text-slate-500">Select a student to view their attendance history.</p>
        ) : isLoading ? (
          <PageLoader />
        ) : !history?.records.length ? (
          <p className="py-6 text-center text-slate-500">No attendance records found for this student.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-2 text-center">
                <p className="text-lg font-bold text-emerald-700">{history.summary.present}</p>
                <p className="text-xs font-semibold text-emerald-600">Present</p>
              </div>
              <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
                <p className="text-lg font-bold text-red-700">{history.summary.absent}</p>
                <p className="text-xs font-semibold text-red-600">Absent</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-4 py-2 text-center">
                <p className="text-lg font-bold text-amber-700">{history.summary.leave}</p>
                <p className="text-xs font-semibold text-amber-600">Leave</p>
              </div>
              <div className="rounded-lg bg-slate-100 px-4 py-2 text-center">
                <p className="text-lg font-bold text-slate-700">{history.summary.total}</p>
                <p className="text-xs font-semibold text-slate-600">Total</p>
              </div>
              {history.summary.total > 0 && (
                <div className="rounded-lg bg-royal-50 px-4 py-2 text-center">
                  <p className="text-lg font-bold text-royal-700">{Math.round((history.summary.present / history.summary.total) * 100)}%</p>
                  <p className="text-xs font-semibold text-royal-600">Attendance %</p>
                </div>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Lecture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.records.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-navy-900">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-600">{r.subject?.name ?? '—'}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                      <td className="px-4 py-3 text-slate-500">#{r.lectureNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
