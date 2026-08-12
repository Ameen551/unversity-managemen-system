import { useState } from 'react';
import { Search, FileSearch, ChevronRight } from 'lucide-react';
import { useStudents } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StudentDetailModal } from '../../components/StudentModals';
import { Spinner } from '../../components/ui/Spinner';

export default function TeacherOverallRecords() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useStudents({ search: query || undefined, pageSize: 20 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Overall Student Record"
        subtitle="Search by student name, ID or father name to view a complete academic profile."
        icon={<FileSearch className="h-5 w-5" />}
      />

      <Card className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Student Name, Student ID or Father Name…"
              className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-royal-500 focus:outline-none focus:ring-2 focus:ring-royal-100"
            />
          </div>
          <Button type="submit" size="lg" icon={<Search className="h-4 w-4" />}>Search</Button>
        </form>
      </Card>

      {isLoading && query ? (
        <Spinner />
      ) : data && query ? (
        <div className="mt-5">
          <p className="mb-3 text-sm text-slate-500">{data.total} result(s) found</p>
          {data.items.length === 0 ? (
            <Card className="p-10 text-center text-slate-500">No students match your search.</Card>
          ) : (
            <div className="grid gap-3">
              {data.items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-royal-300 hover:bg-royal-50/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-royal-50 text-base font-bold text-royal-600">
                    {s.name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.studentId} · {s.department?.name} · {s.semester?.name} · {s.session?.label}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-400">Enter a search term above to find a student record.</p>
      )}

      {selectedId && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
