import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useAuditLogs } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Form';
import { Pagination } from '../../components/ui/Pagination';
import { PageLoader } from '../../components/ui/Spinner';

const actionTone: Record<string, 'royal' | 'teal' | 'green' | 'red' | 'amber' | 'slate'> = {
  CREATE: 'green',
  UPDATE: 'royal',
  DELETE: 'red',
  RESTORE: 'teal',
  LOGIN: 'slate',
  LOGOUT: 'slate',
  IMPORT: 'amber',
  EXPORT: 'teal',
  UPLOAD: 'royal',
  DOWNLOAD: 'teal',
};

const ALL_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'IMPORT', 'EXPORT', 'UPLOAD', 'DOWNLOAD'];

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAuditLogs({ page, pageSize: 20, action: action || undefined, search: search || undefined });

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Audit Logs"
        subtitle="Every important action recorded with actor, time and details"
        icon={<ScrollText className="h-5 w-5" />}
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search description…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : !data?.items.length ? (
        <Card className="p-10 text-center text-slate-500">No audit log entries found.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-3">
                      <Badge tone={actionTone[log.action] ?? 'slate'}>{log.action}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</td>
                    <td className="px-5 py-3 max-w-[320px] truncate text-navy-900">{log.description ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{log.user?.fullName ?? log.user?.username ?? 'System'}</td>
                    <td className="px-5 py-3 text-slate-600">{log.userRole ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}
