export type Role = 'ADMIN' | 'HOD' | 'TEACHER';

export interface User {
  id: number;
  username: string;
  role: Role;
  fullName: string;
  departmentId: number | null;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { students: number; subjects: number; semesters: number };
}

export interface Session {
  id: number;
  label: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  _count?: { students: number; subjects: number };
}

export interface Semester {
  id: number;
  name: string;
  number: number;
  departmentId: number;
  isActive: boolean;
  department?: { id: number; name: string };
  _count?: { students: number; subjects: number };
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  creditHours: number;
  description: string | null;
  departmentId: number;
  sessionId: number;
  semesterId: number;
  teacherId: number | null;
  isActive: boolean;
  department?: Department;
  session?: Session;
  semester?: Semester;
  teacher?: { id: number; fullName: string; employeeId: string | null };
  _count?: { enrollments: number; attendance: number; marks: number };
  enrollments?: Enrollment[];
}

export interface Student {
  id: number;
  name: string;
  fatherName: string;
  studentId: string;
  admissionNumber: string | null;
  section: string | null;
  departmentId: number;
  sessionId: number;
  semesterId: number;
  photo: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnic: string | null;
  isDeleted: boolean;
  createdAt: string;
  department?: Department;
  session?: Session;
  semester?: Semester;
  marks?: Marks[];
  _count?: { enrollments: number };
  enrollments?: Enrollment[];
  attendance?: Attendance[];
  createdBy?: { id: number; fullName: string };
}

export interface Enrollment {
  id: number;
  studentId: number;
  subjectId: number;
  student?: Student;
  subject?: Subject;
}

export interface Attendance {
  id: number;
  studentId: number;
  subjectId: number;
  date: string;
  lectureNo: number;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  markedBy?: { id: number; fullName: string };
  student?: { id: number; name: string; studentId: string; section: string | null };
  subject?: { id: number; name: string; code: string };
}

export interface AttendanceSummaryItem {
  student: { id: number; name: string; studentId: string; section: string | null };
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface Marks {
  id: number;
  studentId: number;
  subjectId: number;
  assessmentType: 'SESSIONAL' | 'MID_TERM' | 'ASSIGNMENT' | 'FINAL_TERM' | 'PRACTICAL' | 'VIVA';
  obtainedMarks: number;
  totalMarks: number;
  remarks: string | null;
  updatedBy?: { id: number; fullName: string };
  student?: { id: number; name: string; studentId: string; section: string | null };
  subject?: { id: number; name: string; code: string };
}

export interface AssessmentConfig {
  id: number;
  assessmentType: 'SESSIONAL' | 'MID_TERM' | 'ASSIGNMENT' | 'FINAL_TERM' | 'PRACTICAL' | 'VIVA';
  label: string;
  defaultTotal: number;
  allowedTotals: string;
  editable: boolean;
  departmentId: number | null;
  isActive: boolean;
  department?: { id: number; name: string };
}

export interface UploadedFile {
  id: number;
  originalName: string;
  fileType: string;
  status: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  departmentId: number;
  sessionId: number;
  semesterId: number;
  createdAt: string;
  uploadedBy?: { id: number; fullName: string };
}

export interface AuditLog {
  id: number;
  userId: number | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  meta: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: number; fullName: string; username: string };
}

export interface TeacherUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  departmentId: number | null;
  department?: { id: number; name: string };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  employeeId: string | null;
  phone: string | null;
  designation: string | null;
  qualification: string | null;
  photo: string | null;
  _count?: { createdStudents: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  departments: number;
  sessions: number;
  semesters: number;
  teachers: number;
  students: number;
  subjects: number;
  attendance: number;
  marks: number;
  uploads: number;
  isAdmin: boolean;
}
