import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { buildCsvReport, buildReportWorkbook, type ReportRow } from '../services/excel.service';

function resolveFormat(q: Record<string, string | undefined>): 'excel' | 'csv' {
  const f = q.format;
  if (f === 'csv') return 'csv';
  return 'excel';
}

function respondReport(res: Response, filename: string, format: 'excel' | 'csv', columns: string[], rows: ReportRow[]): void {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('\uFEFF' + buildCsvReport(columns, rows));
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  void buildReportWorkbook(filename, columns, rows).then((buf) => res.send(Buffer.from(buf)));
}

export const exportStudents = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const departmentId = q.departmentId ? Number(q.departmentId) : undefined;
  const sessionId = q.sessionId ? Number(q.sessionId) : undefined;
  const semesterId = q.semesterId ? Number(q.semesterId) : undefined;
  const format = resolveFormat(q);

  const where: Record<string, unknown> = { isDeleted: false };
  if (departmentId) where.departmentId = departmentId;
  if (sessionId) where.sessionId = sessionId;
  if (semesterId) where.semesterId = semesterId;

  const students = await prisma.student.findMany({
    where,
    orderBy: { studentId: 'asc' },
    include: { department: true, session: true, semester: true },
  });

  const columns = ['Student ID', 'Name', 'Father Name', 'Section', 'Department', 'Session', 'Semester'];
  const rows: ReportRow[] = students.map((s) => ({
    'Student ID': s.studentId,
    Name: s.name,
    'Father Name': s.fatherName,
    Section: s.section ?? '',
    Department: s.department.name,
    Session: s.session.label,
    Semester: s.semester.name,
  }));

  await logAudit(req, { action: 'EXPORT', entityType: 'Student', description: 'Exported student list' });
  respondReport(res, 'students-list', format, columns, rows);
});

export const exportMarks = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
  const departmentId = q.departmentId ? Number(q.departmentId) : undefined;
  const sessionId = q.sessionId ? Number(q.sessionId) : undefined;
  const semesterId = q.semesterId ? Number(q.semesterId) : undefined;
  const format = resolveFormat(q);

  if (!subjectId && !departmentId) {
    throw errors.badRequest('Provide a subjectId or departmentId to export marks.');
  }

  const subjectFilter: Record<string, unknown> = {};
  if (subjectId) subjectFilter.id = subjectId;
  if (departmentId) subjectFilter.departmentId = departmentId;
  if (sessionId) subjectFilter.sessionId = sessionId;
  if (semesterId) subjectFilter.semesterId = semesterId;

  const subjects = await prisma.subject.findMany({
    where: subjectFilter,
    include: {
      department: true,
      semester: true,
      session: true,
      marks: { include: { student: true } },
    },
  });

  const columns = ['Student ID', 'Name', 'Subject', 'Code', 'Assessment', 'Obtained Marks', 'Total Marks', 'Percentage'];
  const rows: ReportRow[] = subjects.flatMap((sub) =>
    sub.marks.map((m) => ({
      'Student ID': m.student.studentId,
      Name: m.student.name,
      Subject: sub.name,
      Code: sub.code,
      Assessment: m.assessmentType === 'MID_TERM' ? 'Mid Term' : 'Final Term',
      'Obtained Marks': m.obtainedMarks,
      'Total Marks': m.totalMarks,
      Percentage: m.totalMarks > 0 ? `${Math.round((m.obtainedMarks / m.totalMarks) * 1000) / 10}%` : '',
    }))
  );

  await logAudit(req, { action: 'EXPORT', entityType: 'Marks', description: 'Exported marks report' });
  respondReport(res, 'marks-report', format, columns, rows);
});

export const exportAttendance = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
  const format = resolveFormat(q);

  if (!subjectId) throw errors.badRequest('Provide a subjectId to export attendance.');

  const records = await prisma.attendance.findMany({
    where: { subjectId },
    orderBy: [{ studentId: 'asc' }, { date: 'asc' }],
    include: { student: true, subject: true },
  });

  const columns = ['Student ID', 'Name', 'Subject', 'Date', 'Lecture', 'Status'];
  const rows: ReportRow[] = records.map((a) => ({
    'Student ID': a.student.studentId,
    Name: a.student.name,
    Subject: a.subject.name,
    Date: a.date.toISOString().slice(0, 10),
    Lecture: a.lectureNo,
    Status: a.status,
  }));

  await logAudit(req, { action: 'EXPORT', entityType: 'Attendance', description: 'Exported attendance report' });
  respondReport(res, 'attendance-report', format, columns, rows);
});

export const exportOverall = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const search = q.search?.trim();
  const format = resolveFormat(q);

  const where: Record<string, unknown> = { isDeleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { studentId: { contains: search } },
      { fatherName: { contains: search } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { studentId: 'asc' },
    include: {
      department: true,
      session: true,
      semester: true,
      marks: true,
      attendance: true,
    },
  });

  const columns = [
    'Student ID',
    'Name',
    'Father Name',
    'Department',
    'Session',
    'Semester',
    'Section',
    'Mid Term Obtained',
    'Mid Term Total',
    'Final Term Obtained',
    'Final Term Total',
    'Total Classes',
    'Present',
    'Absent',
    'Attendance %',
  ];

  const rows: ReportRow[] = students.map((s) => {
    const mid = s.marks.filter((m) => m.assessmentType === 'MID_TERM');
    const fin = s.marks.filter((m) => m.assessmentType === 'FINAL_TERM');
    const sum = (arr: { obtainedMarks: number; totalMarks: number }[]) => arr.reduce((a, b) => a + b.obtainedMarks, 0);
    const sumTotal = (arr: { totalMarks: number }[]) => arr.reduce((a, b) => a + b.totalMarks, 0);
    const present = s.attendance.filter((a) => a.status === 'PRESENT').length;
    const total = s.attendance.length;
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
    return {
      'Student ID': s.studentId,
      Name: s.name,
      'Father Name': s.fatherName,
      Department: s.department.name,
      Session: s.session.label,
      Semester: s.semester.name,
      Section: s.section ?? '',
      'Mid Term Obtained': sum(mid),
      'Mid Term Total': sumTotal(mid),
      'Final Term Obtained': sum(fin),
      'Final Term Total': sumTotal(fin),
      'Total Classes': total,
      Present: present,
      Absent: total - present,
      'Attendance %': percentage,
    };
  });

  await logAudit(req, { action: 'EXPORT', entityType: 'Student', description: 'Exported overall records report' });
  respondReport(res, 'overall-records', format, columns, rows);
});
