import { useState } from 'react';
import { UploadCloud, Download, FileUp, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUploads, useDepartments, useSessions, useSemesters, useDeleteUploadedFile, useUploadGeneralFile } from '../../hooks/queries';
import { api, API_BASE } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Select } from '../../components/ui/Form';
import { PageLoader } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';

export default function AdminUploads() {
  const { data, isLoading } = useUploads();
  const qc = useQueryClient();
  const { data: departments } = useDepartments(true);
  const { data: sessions } = useSessions(true);
  const [page, setPage] = useState(0);
  const perPage = 12;
  const items = data?.items ?? [];
  const paged = items.slice(page * perPage, page * perPage + perPage);
  const pages = Math.max(1, Math.ceil(items.length / perPage));

  const del = useDeleteUploadedFile();
  const uploadGeneral = useUploadGeneralFile();

  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({ departmentId: '', sessionId: '', semesterId: '' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null);

  const { data: semesters } = useSemesters(importForm.departmentId ? Number(importForm.departmentId) : undefined, true);

  const handleImport = async () => {
    if (!importFile || !importForm.departmentId || !importForm.sessionId || !importForm.semesterId) {
      toast.error('Select a file and all three filters (department, session, semester).');
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('departmentId', importForm.departmentId);
      fd.append('sessionId', importForm.sessionId);
      fd.append('semesterId', importForm.semesterId);
      const res = await api.upload<{ message: string; result: { successCount: number; errorCount: number } }>('/files/import', fd);
      toast.success(res.message);
      setImportOpen(false);
      setImportFile(null);
      setImportForm({ departmentId: '', sessionId: '', semesterId: '' });
      qc.invalidateQueries({ queryKey: ['uploads'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFileObj) { toast.error('Select a file first.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFileObj);
      const res = await uploadGeneral.mutateAsync(fd);
      toast.success(res.message);
      setUploadOpen(false);
      setUploadFileObj(null);
      qc.invalidateQueries({ queryKey: ['uploads'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Uploaded Files"
        subtitle="All files uploaded across the system — imports, documents, and general uploads"
        icon={<UploadCloud className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setUploadOpen(true)} icon={<Upload className="h-4 w-4" />}>Upload File</Button>
            <Button onClick={() => setImportOpen(true)} icon={<FileUp className="h-4 w-4" />}>Import Students</Button>
            <a href={`${API_BASE}/files/template`} target="_blank" rel="noreferrer">
              <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />}>Download Template</Button>
            </a>
          </div>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : !items.length ? (
        <Card className="p-10 text-center text-slate-500">No files have been uploaded yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Rows</th>
                  <th className="px-5 py-3">Imported</th>
                  <th className="px-5 py-3">Errors</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Uploaded By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((f) => (
                  <tr key={f.id}>
                    <td className="px-5 py-3 font-medium text-navy-900">{f.originalName}</td>
                    <td className="px-5 py-3"><Badge tone="navy">{f.fileType}</Badge></td>
                    <td className="px-5 py-3 text-slate-600">{f.rowCount || '—'}</td>
                    <td className="px-5 py-3 text-emerald-600">{f.successCount || '—'}</td>
                    <td className="px-5 py-3 text-red-600">{f.errorCount || '—'}</td>
                    <td className="px-5 py-3"><Badge tone={statusTone(f.status)}>{f.status}</Badge></td>
                    <td className="px-5 py-3 text-slate-600">{f.uploadedBy?.fullName ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <a href={`${API_BASE}/files/${f.id}/download`} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />}>Download</Button>
                        </a>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting({ id: f.id, name: f.originalName })} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-slate-500">Page {page + 1} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </Card>
      )}

      {/* General Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload File" footer={
        <>
          <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} loading={uploading} icon={<Upload className="h-4 w-4" />}>Upload</Button>
        </>
      }>
        <div className="grid gap-4">
          <Field label="Select any file (PDF, Word, Image, Excel, etc.)" required>
            <input type="file" onChange={(e) => setUploadFileObj(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-royal-700 hover:file:bg-royal-100" />
          </Field>
          {uploadFileObj && (
            <p className="text-xs text-slate-500">Selected: {uploadFileObj.name} ({(uploadFileObj.size / 1024).toFixed(1)} KB)</p>
          )}
          <p className="text-xs text-slate-500">The file will be stored and appear in this list. You can download or delete it anytime.</p>
        </div>
      </Modal>

      {/* Import Students Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Students from Excel" footer={
        <>
          <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} loading={importing} icon={<FileUp className="h-4 w-4" />}>Import</Button>
        </>
      }>
        <div className="grid gap-4">
          <Field label="Select Excel/CSV file" required>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-royal-700 hover:file:bg-royal-100" />
          </Field>
          <Field label="Department" required>
            <Select value={importForm.departmentId} onChange={(e) => setImportForm({ ...importForm, departmentId: e.target.value, semesterId: '' })}>
              <option value="">Select department</option>
              {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Session" required>
            <Select value={importForm.sessionId} onChange={(e) => setImportForm({ ...importForm, sessionId: e.target.value })}>
              <option value="">Select session</option>
              {sessions?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Semester" required>
            <Select value={importForm.semesterId} onChange={(e) => setImportForm({ ...importForm, semesterId: e.target.value })} disabled={!importForm.departmentId}>
              <option value="">Select semester</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <a href={`${API_BASE}/files/template`} target="_blank" rel="noreferrer" className="text-sm text-royal-600 hover:underline">Download the Excel template first</a>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleting && (
        <ConfirmDialog
          open
          title="Delete File"
          message={`Delete "${deleting.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
