import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  AssessmentConfig,
  Attendance,
  AttendanceSummaryItem,
  AuditLog,
  DashboardStats,
  Department,
  Enrollment,
  Marks,
  Paginated,
  Semester,
  Session,
  Student,
  Subject,
  TeacherUser,
  UploadedFile,
} from '../types';

// ---------- Departments ----------
export function useDepartments(all = false) {
  return useQuery({
    queryKey: ['departments', all],
    queryFn: () => api.get<{ success: boolean; items: Department[] }>(`/departments${all ? '?all=true' : ''}`),
  });
}

// ---------- Sessions ----------
export function useSessions(all = false) {
  return useQuery({
    queryKey: ['sessions', all],
    queryFn: () => api.get<{ success: boolean; items: Session[] }>(`/sessions${all ? '?all=true' : ''}`),
  });
}

// ---------- Semesters ----------
export function useSemesters(departmentId: number | undefined, all = false) {
  return useQuery({
    queryKey: ['semesters', departmentId, all],
    queryFn: () =>
      api.get<{ success: boolean; items: Semester[] }>(
        `/semesters?departmentId=${departmentId}${all ? '&all=true' : ''}`
      ),
    enabled: !!departmentId,
  });
}

// ---------- Subjects ----------
export function useSubjects(departmentId?: number, sessionId?: number, semesterId?: number) {
  const qs = new URLSearchParams();
  if (departmentId) qs.set('departmentId', String(departmentId));
  if (sessionId) qs.set('sessionId', String(sessionId));
  if (semesterId) qs.set('semesterId', String(semesterId));
  const query = qs.toString();
  return useQuery({
    queryKey: ['subjects', query],
    queryFn: () => api.get<{ success: boolean; items: Subject[] }>(`/subjects${query ? `?${query}` : ''}`),
  });
}

export function useSubject(id: number | undefined) {
  return useQuery({
    queryKey: ['subject', id],
    queryFn: () => api.get<{ success: boolean; item: Subject }>(`/subjects/${id}`),
    enabled: !!id,
  });
}

// ---------- Students ----------
export interface StudentQuery {
  departmentId?: number;
  sessionId?: number;
  semesterId?: number;
  search?: string;
  section?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export function useStudents(params: StudentQuery) {
  const qs = new URLSearchParams();
  (Object.entries(params) as [string, string | number | boolean | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  return useQuery({
    queryKey: ['students', query],
    queryFn: () => api.get<Paginated<Student>>(`/students?${query}`),
  });
}

export function useStudent(id: number | undefined) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () =>
      api.get<{
        success: boolean;
        item: Student;
        attendanceBySubject: Record<string, { total: number; present: number; absent: number; leave: number }>;
      }>(`/students/${id}`),
    enabled: !!id,
  });
}

// ---------- Attendance ----------
export function useAttendance(subjectId?: number, studentId?: number) {
  const qs = new URLSearchParams();
  if (subjectId) qs.set('subjectId', String(subjectId));
  if (studentId) qs.set('studentId', String(studentId));
  const query = qs.toString();
  return useQuery({
    queryKey: ['attendance', query],
    queryFn: () => api.get<{ success: boolean; items: Attendance[] }>(`/attendance${query ? `?${query}` : ''}`),
    enabled: !!subjectId || !!studentId,
  });
}

export function useAttendanceSummary(subjectId?: number) {
  return useQuery({
    queryKey: ['attendance-summary', subjectId],
    queryFn: () =>
      api.get<{ success: boolean; items: AttendanceSummaryItem[] }>(`/attendance/summary?subjectId=${subjectId}`),
    enabled: !!subjectId,
  });
}

export function useAttendanceStudents(subjectId?: number, date?: string) {
  const qs = new URLSearchParams();
  if (subjectId) qs.set('subjectId', String(subjectId));
  if (date) qs.set('date', date);
  const query = qs.toString();
  return useQuery({
    queryKey: ['attendance-students', query],
    queryFn: () => api.get<{ success: boolean; items: (Student & { attendanceStatus: string | null; attendanceId: number | null })[] }>(`/attendance/students?${query}`),
    enabled: !!subjectId && !!date,
  });
}

export function useStudentAttendanceHistory(studentId?: number, semesterId?: number) {
  const qs = new URLSearchParams();
  if (studentId) qs.set('studentId', String(studentId));
  if (semesterId) qs.set('semesterId', String(semesterId));
  const query = qs.toString();
  return useQuery({
    queryKey: ['attendance-history', query],
    queryFn: () => api.get<{ success: boolean; student: Student; records: Attendance[]; summary: { total: number; present: number; absent: number; leave: number } }>(`/attendance/history?${query}`),
    enabled: !!studentId,
  });
}

export function useStudentsByScope(departmentId?: number, sessionId?: number, semesterId?: number, date?: string) {
  const qs = new URLSearchParams();
  if (departmentId) qs.set('departmentId', String(departmentId));
  if (sessionId) qs.set('sessionId', String(sessionId));
  if (semesterId) qs.set('semesterId', String(semesterId));
  if (date) qs.set('date', date);
  const query = qs.toString();
  return useQuery({
    queryKey: ['students-by-scope', query],
    queryFn: () => api.get<{ success: boolean; items: (Student & { attendanceStatus: string | null; attendanceId: number | null })[] }>(`/attendance/by-scope?${query}`),
    enabled: !!departmentId && !!sessionId && !!semesterId,
  });
}

export function useMarkAttendanceByScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      departmentId: number;
      sessionId: number;
      semesterId: number;
      date: string;
      lectureNo?: number;
      records: { studentId: number; status: 'PRESENT' | 'ABSENT' | 'LEAVE' }[];
    }) => api.post('/attendance/mark-by-scope', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students-by-scope'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
  });
}

// ---------- Marks ----------
export function useMarks(subjectId?: number, studentId?: number, assessmentType?: string) {
  const qs = new URLSearchParams();
  if (subjectId) qs.set('subjectId', String(subjectId));
  if (studentId) qs.set('studentId', String(studentId));
  if (assessmentType) qs.set('assessmentType', assessmentType);
  const query = qs.toString();
  return useQuery({
    queryKey: ['marks', query],
    queryFn: () => api.get<{ success: boolean; items: Marks[] }>(`/marks${query ? `?${query}` : ''}`),
    enabled: !!subjectId || !!studentId,
  });
}

export function useAssessmentConfigs() {
  return useQuery({
    queryKey: ['assessment-configs'],
    queryFn: () => api.get<{ success: boolean; items: AssessmentConfig[] }>(`/settings`),
  });
}

// ---------- Dashboard / teachers / audit / uploads ----------
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      api.get<{ success: boolean; stats: DashboardStats; recentStudents: Student[] }>(`/dashboard/stats`),
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get<{ success: boolean; items: TeacherUser[] }>(`/teachers`),
  });
}

export function useAuditLogs(params: { page?: number; pageSize?: number; action?: string; search?: string }) {
  const qs = new URLSearchParams();
  (Object.entries(params) as [string, string | number | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => api.get<Paginated<AuditLog>>(`/audit-logs?${query}`),
  });
}

export function useUploads() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: () => api.get<{ success: boolean; items: UploadedFile[] }>(`/files`),
  });
}

export function useEnrollments(params: { studentId?: number; subjectId?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.studentId) qs.set('studentId', String(params.studentId));
  if (params.subjectId) qs.set('subjectId', String(params.subjectId));
  const query = qs.toString();
  return useQuery({
    queryKey: ['enrollments', query],
    queryFn: () => api.get<{ success: boolean; items: Enrollment[] }>(`/enrollments${query ? `?${query}` : ''}`),
    enabled: !!params.studentId || !!params.subjectId,
  });
}

// ---------- Shared invalidation helper ----------
export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[][]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };
}

// ---------- Mutations ----------
export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Department>) => api.post('/departments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Department> }) => api.put(`/departments/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Session>) => api.post('/sessions', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Session> }) => api.put(`/sessions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Semester>) => api.post('/semesters', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Semester> }) => api.put(`/semesters/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/semesters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Subject>) => api.post('/subjects', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Subject> }) => api.put(`/subjects/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Student>) => api.post('/students', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Student> }) => api.put(`/students/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student'] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/students/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useRestoreStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/students/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.upload('/files/import', formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['uploads'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      subjectId: number;
      date: string;
      lectureNo?: number;
      records: { studentId: number; status: 'PRESENT' | 'ABSENT' | 'LEAVE' }[];
    }) => api.post('/attendance/mark', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
  });
}

export function useUpsertMarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      subjectId: number;
      assessmentType: 'MID_TERM' | 'FINAL_TERM';
      records: { studentId: number; obtainedMarks: number; totalMarks: number }[];
    }) => api.post('/marks/upsert', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marks'] }),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      username: string;
      fullName: string;
      email?: string | null;
      departmentId?: number | null;
    }) => api.post('/teachers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.put(`/teachers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useResetTeacherPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword?: string }) =>
      api.post(`/teachers/${id}/reset-password`, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/teachers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/attendance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
  });
}

export function useDeleteMarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/marks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marks'] }),
  });
}

export function useDeleteUploadedFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }),
  });
}

export function useUploadGeneralFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.upload<{ message: string; item: UploadedFile }>('/files/upload', formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}
