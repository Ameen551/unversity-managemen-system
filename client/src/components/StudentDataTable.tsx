import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Eye, Pencil, Trash2, RotateCcw, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useStudents } from '../hooks/queries';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input, Select } from './ui/Form';
import { Pagination } from './ui/Pagination';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { PageLoader } from './ui/Spinner';
import { Button } from './ui/Button';
import type { Student } from '../types';
import { cn } from '../utils/cn';

interface Props {
  departmentId: number;
  sessionId: number;
  semesterId: number;
  canDelete?: boolean;
  includeDeleted?: boolean;
  onView?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
  onRestore?: (student: Student) => void;
}

function markSummary(student: Student): { midObtained: number; midTotal: number; finObtained: number; finTotal: number } {
  const mid = (student.marks ?? []).filter((m) => m.assessmentType === 'MID_TERM');
  const fin = (student.marks ?? []).filter((m) => m.assessmentType === 'FINAL_TERM');
  return {
    midObtained: mid.reduce((a, m) => a + m.obtainedMarks, 0),
    midTotal: mid.reduce((a, m) => a + m.totalMarks, 0),
    finObtained: fin.reduce((a, m) => a + m.obtainedMarks, 0),
    finTotal: fin.reduce((a, m) => a + m.totalMarks, 0),
  };
}

export function StudentDataTable({ departmentId, sessionId, semesterId, canDelete, includeDeleted, onView, onEdit, onDelete, onRestore }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [section, setSection] = useState('');
  const [sort, setSort] = useState('studentId');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const { data, isLoading, isError } = useStudents({
    departmentId,
    sessionId,
    semesterId,
    search: debounced || undefined,
    section: section || undefined,
    sort,
    order,
    page,
    pageSize: 12,
    includeDeleted,
  });

  const sections = useMemo(() => {
    const set = new Set<string>();
    (data?.items ?? []).forEach((s) => s.section && set.add(s.section));
    return Array.from(set).sort();
  }, [data]);

  const toggleSort = (key: string) => {
    if (sort === key) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setOrder('asc');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 hover:text-navy-900">
      {label}
      {sort === field ? (
        order === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );

  return (
    <Card>
      <CardHeader
        title="Students"
        subtitle="Searchable, sortable and filterable record list"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search name, ID, father…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                  clearTimeout(timerRef.current);
                  timerRef.current = window.setTimeout(() => setDebounced(e.target.value), 350);
                }}
                className="w-52 pl-9"
              />
            </div>
            <Select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }} className="w-28">
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <CardBody><p className="text-center text-slate-500">Failed to load students.</p></CardBody>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <EmptyState title="No students found" message="Add students individually or import an Excel/CSV file." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3"><SortHeader label="Student ID" field="studentId" /></th>
                <th className="px-5 py-3"><SortHeader label="Name" field="name" /></th>
                <th className="px-5 py-3">Father Name</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Mid Term</th>
                <th className="px-5 py-3">Final Term</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((s) => {
                const m = markSummary(s);
                const deleted = s.isDeleted;
                return (
                  <tr key={s.id} className={cn('hover:bg-royal-50/40', deleted && 'opacity-50')}>
                    <td className="px-5 py-3 font-semibold text-royal-700">{s.studentId}</td>
                    <td className="px-5 py-3 font-medium text-navy-900">{s.name}</td>
                    <td className="px-5 py-3 text-slate-600">{s.fatherName}</td>
                    <td className="px-5 py-3 text-slate-600">{s.section ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {m.midTotal > 0 ? `${m.midObtained} / ${m.midTotal}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {m.finTotal > 0 ? `${m.finObtained} / ${m.finTotal}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {deleted ? <Badge tone="red">Deleted</Badge> : <Badge tone="green">Active</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {onView && (
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => onView(s)}>View</Button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(s)}>Edit</Button>
                        )}
                        {deleted && onRestore && (
                          <Button variant="ghost" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => onRestore(s)}>Restore</Button>
                        )}
                        {!deleted && canDelete && onDelete && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(s)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
      )}
    </Card>
  );
}
