import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './auth/authStore';
import { RequireAuth } from './auth/RequireAuth';
import { tryRefresh } from './api/client';
import { TeacherLayout } from './layouts/TeacherLayout';
import { AdminLayout } from './layouts/AdminLayout';

import Login from './pages/auth/Login';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherDepartments from './pages/teacher/Departments';
import TeacherSessions from './pages/teacher/Sessions';
import TeacherSemesters from './pages/teacher/Semesters';
import TeacherStudentActions from './pages/teacher/StudentActions';
import TeacherStudents from './pages/teacher/Students';
import TeacherAddStudent from './pages/teacher/AddStudent';
import TeacherSubjects from './pages/teacher/Subjects';
import TeacherSubjectDetail from './pages/teacher/SubjectDetail';
import TeacherOverallRecords from './pages/teacher/OverallRecords';
import TeacherProfile from './pages/teacher/Profile';
import ScopePicker from './pages/teacher/ScopePicker';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminDepartments from './pages/admin/Departments';
import AdminSessions from './pages/admin/Sessions';
import AdminSemesters from './pages/admin/Semesters';
import AdminTeachers from './pages/admin/Teachers';
import AdminStudents from './pages/admin/Students';
import AdminSubjects from './pages/admin/Subjects';
import AdminAttendance from './pages/admin/Attendance';
import AdminMarks from './pages/admin/Marks';
import AdminReports from './pages/admin/Reports';
import AdminUploads from './pages/admin/Uploads';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminSettings from './pages/admin/Settings';

import { PageLoader } from './components/ui/Spinner';

function HomeRedirect() {
  const { user, status } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') {
      tryRefresh();
    }
  }, [status]);

  if (status === 'idle') return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN' || user.role === 'HOD') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/teacher/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Teacher portal */}
      <Route
        path="/teacher"
        element={
          <RequireAuth role="teacher">
            <TeacherLayout>
              <Outlet />
            </TeacherLayout>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="departments" element={<TeacherDepartments />} />
        <Route path="departments/:deptId/sessions" element={<TeacherSessions />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters" element={<TeacherSemesters />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters/:semesterId" element={<TeacherStudentActions />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters/:semesterId/students" element={<TeacherStudents />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters/:semesterId/add-student" element={<TeacherAddStudent />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters/:semesterId/subjects" element={<TeacherSubjects />} />
        <Route path="departments/:deptId/sessions/:sessionId/semesters/:semesterId/subjects/:subjectId" element={<TeacherSubjectDetail />} />
        <Route path="students" element={<ScopePicker target="students" />} />
        <Route path="subjects" element={<ScopePicker target="subjects" />} />
        <Route path="attendance" element={<ScopePicker target="attendance" />} />
        <Route path="marks" element={<ScopePicker target="marks" />} />
        <Route path="overall-records" element={<TeacherOverallRecords />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>

      {/* Admin portal */}
      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminLayout>
              <Outlet />
            </AdminLayout>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="semesters" element={<AdminSemesters />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="marks" element={<AdminMarks />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="uploads" element={<AdminUploads />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
