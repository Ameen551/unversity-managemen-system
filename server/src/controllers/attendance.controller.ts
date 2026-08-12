import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { isAdminRole } from '../config/env';

const dateSchema = z.coerce.date();

const markSchema = z.object({
  subjectId: z.number().int().positive(),
  date: dateSchema,
  lectureNo: z.number().int().min(1).optional(),
  records: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
      })
    )
    .min(1, 'At least one attendance record is required.'),
});

const updateSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
  date: dateSchema.optional(),
  lectureNo: z.number().int().min(1).optional(),
});

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
  const studentId = q.studentId ? Number(q.studentId) : undefined;

  const where: Record<string, unknown> = {};
  if (subjectId) where.subjectId = subjectId;
  if (studentId) where.studentId = studentId;
  if (q.date) {
    const start = new Date(q.date as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.date = { gte: start, lt: end };
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'desc' }, { lectureNo: 'asc' }, { studentId: 'asc' }],
    include: {
      student: { select: { id: true, name: true, studentId: true, section: true } },
      subject: { select: { id: true, name: true, code: true } },
      markedBy: { select: { id: true, fullName: true } },
    },
  });
  res.json({ success: true, items: records });
});

export const attendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
  const studentId = q.studentId ? Number(q.studentId) : undefined;

  const where: Record<string, unknown> = {};
  if (subjectId) where.subjectId = subjectId;
  if (studentId) where.studentId = studentId;

  const rows = await prisma.attendance.groupBy({
    by: ['studentId', 'status'],
    where,
    _count: { _all: true },
  });

  const students = await prisma.enrollment.findMany({
    where: subjectId ? { subjectId } : { studentId },
    include: { student: true },
  });

  const map = new Map<number, { total: number; present: number; absent: number; leave: number }>();
  for (const row of rows) {
    const entry = map.get(row.studentId) ?? { total: 0, present: 0, absent: 0, leave: 0 };
    entry.total += row._count._all;
    if (row.status === 'PRESENT') entry.present += row._count._all;
    if (row.status === 'ABSENT') entry.absent += row._count._all;
    if (row.status === 'LEAVE') entry.leave += row._count._all;
    map.set(row.studentId, entry);
  }

  const summary = students
    .map((en) => {
      const s = map.get(en.studentId) ?? { total: 0, present: 0, absent: 0, leave: 0 };
      const percentage = s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0;
      return { student: en.student, ...s, percentage };
    })
    .sort((a, b) => a.student.studentId.localeCompare(b.student.studentId));

  res.json({ success: true, items: summary });
});

/** Bulk mark attendance for a subject/date/lecture. Teachers and admins. */
export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const data = markSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
  if (!subject) throw errors.notFound('Subject not found.');

  const lectureNo = data.lectureNo ?? 1;

  const results = [];
  for (const rec of data.records) {
    const student = await prisma.student.findUnique({ where: { id: rec.studentId } });
    if (!student || student.isDeleted) {
      results.push({ studentId: rec.studentId, status: 'skipped', reason: 'Student not found' });
      continue;
    }
    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_subjectId_date_lectureNo: {
          studentId: rec.studentId,
          subjectId: data.subjectId,
          date: data.date,
          lectureNo,
        },
      },
    });
    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: rec.status, markedById: req.user!.id },
      });
      results.push({ studentId: rec.studentId, status: 'updated', id: updated.id });
    } else {
      const created = await prisma.attendance.create({
        data: {
          studentId: rec.studentId,
          subjectId: data.subjectId,
          date: data.date,
          lectureNo,
          status: rec.status,
          markedById: req.user!.id,
        },
      });
      results.push({ studentId: rec.studentId, status: 'created', id: created.id });
    }
  }

  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Attendance',
    entityId: subject.id,
    description: `Marked attendance for "${subject.name}" on ${data.date.toISOString().slice(0, 10)} (lecture ${lectureNo})`,
    meta: { records: results.length },
  });
  res.json({ success: true, message: 'Attendance saved successfully.', results });
});

export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Attendance record not found.');

  const updated = await prisma.attendance.update({
    where: { id },
    data: { status: data.status, date: data.date, lectureNo: data.lectureNo, markedById: req.user!.id },
  });
  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'Attendance',
    entityId: id,
    description: `Corrected attendance for student #${existing.studentId} to ${data.status}`,
  });
  res.json({ success: true, item: updated, message: 'Attendance corrected.' });
});

/** Delete a single attendance record — admin only (RBAC at route level). */
export const deleteAttendance = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Attendance record not found.');

  await prisma.attendance.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'Attendance',
    entityId: id,
    description: `Deleted attendance record for student #${existing.studentId}`,
  });
  res.json({ success: true, message: 'Attendance record deleted.' });
});

/** Date list helper for a subject (distinct dates marked). */
export const attendanceDates = asyncHandler(async (req: Request, res: Response) => {
  const subjectId = Number(req.query.subjectId);
  if (!subjectId) throw errors.badRequest('subjectId is required.');
  const rows = await prisma.attendance.findMany({
    where: { subjectId },
    select: { date: true, lectureNo: true },
    distinct: ['date', 'lectureNo'],
    orderBy: { date: 'desc' },
  });
  res.json({ success: true, items: rows });
});

/** Get enrolled students for a subject with their attendance status for a given date. */
export const studentsForAttendance = asyncHandler(async (req: Request, res: Response) => {
  const subjectId = Number(req.query.subjectId);
  const dateStr = req.query.date as string | undefined;
  if (!subjectId) throw errors.badRequest('subjectId is required.');

  let date: Date | undefined;
  if (dateStr) {
    date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { subjectId },
    include: {
      student: {
        select: { id: true, name: true, studentId: true, section: true, fatherName: true, departmentId: true, sessionId: true, semesterId: true },
      },
    },
    orderBy: { student: { studentId: 'asc' } },
  });

  const students = enrollments.map((e) => e.student);

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const existing = await prisma.attendance.findMany({
      where: { subjectId, date: { gte: start, lt: end } },
      select: { studentId: true, status: true, id: true, lectureNo: true },
    });

    const statusMap = new Map<number, { status: string; id: number; lectureNo: number }>();
    for (const rec of existing) {
      statusMap.set(rec.studentId, { status: rec.status, id: rec.id, lectureNo: rec.lectureNo });
    }

    const enriched = students.map((s) => {
      const att = statusMap.get(s.id);
      return { ...s, attendanceStatus: att?.status ?? null, attendanceId: att?.id ?? null };
    });

    return res.json({ success: true, items: enriched });
  }

  res.json({ success: true, items: students.map((s) => ({ ...s, attendanceStatus: null, attendanceId: null })) });
});

/** Get attendance history for a specific student. */
export const studentAttendanceHistory = asyncHandler(async (req: Request, res: Response) => {
  const studentId = Number(req.query.studentId);
  const semesterId = req.query.semesterId ? Number(req.query.semesterId) : undefined;
  if (!studentId) throw errors.badRequest('studentId is required.');

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, studentId: true, section: true, semesterId: true, departmentId: true, sessionId: true },
  });
  if (!student) throw errors.notFound('Student not found.');

  const where: Record<string, unknown> = { studentId };
  if (semesterId) {
    const subjectIds = (await prisma.subject.findMany({ where: { semesterId }, select: { id: true } })).map((s) => s.id);
    where.subjectId = { in: subjectIds };
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'desc' }, { lectureNo: 'asc' }],
    include: {
      subject: { select: { id: true, name: true, code: true } },
    },
  });

  const summary = { total: records.length, present: 0, absent: 0, leave: 0 };
  for (const r of records) {
    if (r.status === 'PRESENT') summary.present++;
    else if (r.status === 'ABSENT') summary.absent++;
    else if (r.status === 'LEAVE') summary.leave++;
  }

  res.json({ success: true, student, records, summary });
});

const scopeMarkSchema = z.object({
  departmentId: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  semesterId: z.number().int().positive(),
  date: dateSchema,
  lectureNo: z.number().int().min(1).optional(),
  records: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
      })
    )
    .min(1, 'At least one attendance record is required.'),
});

/**
 * List all students for a scope (dept/session/semester) with their attendance status for a given date.
 * This is the main endpoint for the admin attendance interface — no subject selection required.
 */
export const studentsByScope = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = Number(req.query.departmentId);
  const sessionId = Number(req.query.sessionId);
  const semesterId = Number(req.query.semesterId);
  const dateStr = req.query.date as string | undefined;

  if (!departmentId || !sessionId || !semesterId) {
    throw errors.badRequest('departmentId, sessionId and semesterId are required.');
  }

  const students = await prisma.student.findMany({
    where: { departmentId, sessionId, semesterId, isDeleted: false },
    select: { id: true, name: true, studentId: true, section: true, fatherName: true, departmentId: true, sessionId: true, semesterId: true },
    orderBy: { studentId: 'asc' },
  });

  if (!dateStr) {
    return res.json({ success: true, items: students.map((s) => ({ ...s, attendanceStatus: null, attendanceId: null })) });
  }

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  // Find subjects for this scope
  const subjectIds = (await prisma.subject.findMany({
    where: { departmentId, sessionId, semesterId },
    select: { id: true },
  })).map((s) => s.id);

  // Get all attendance records for these students on this date across all subjects
  const existing = await prisma.attendance.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      date: { gte: date, lt: end },
      ...(subjectIds.length > 0 ? { subjectId: { in: subjectIds } } : {}),
    },
    select: { studentId: true, status: true, id: true, subjectId: true },
    orderBy: { id: 'desc' },
  });

  // Build status map — take the most recent record per student
  const statusMap = new Map<number, { status: string; id: number; subjectId: number }>();
  for (const rec of existing) {
    if (!statusMap.has(rec.studentId)) {
      statusMap.set(rec.studentId, { status: rec.status, id: rec.id, subjectId: rec.subjectId });
    }
  }

  const enriched = students.map((s) => {
    const att = statusMap.get(s.id);
    return { ...s, attendanceStatus: att?.status ?? null, attendanceId: att?.id ?? null };
  });

  res.json({ success: true, items: enriched });
});

/**
 * Mark attendance for students in a scope (dept/session/semester).
 * Automatically finds or uses an existing subject for the scope.
 * Upserts: if attendance already exists for the same student+subject+date, it updates.
 */
export const markAttendanceByScope = asyncHandler(async (req: Request, res: Response) => {
  const data = scopeMarkSchema.parse(req.body);

  // Find or create a subject for this scope to satisfy the unique constraint
  let subject = await prisma.subject.findFirst({
    where: { departmentId: data.departmentId, sessionId: data.sessionId, semesterId: data.semesterId },
  });
  if (!subject) {
    // Auto-create a "General" subject for this scope
    subject = await prisma.subject.create({
      data: {
        name: 'General',
        code: `GEN-${data.departmentId}-${data.semesterId}`,
        creditHours: 0,
        departmentId: data.departmentId,
        sessionId: data.sessionId,
        semesterId: data.semesterId,
        isActive: true,
      },
    });
  }

  const lectureNo = data.lectureNo ?? 1;
  const results = [];

  for (const rec of data.records) {
    const student = await prisma.student.findUnique({ where: { id: rec.studentId } });
    if (!student || student.isDeleted) {
      results.push({ studentId: rec.studentId, status: 'skipped', reason: 'Student not found' });
      continue;
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_subjectId_date_lectureNo: {
          studentId: rec.studentId,
          subjectId: subject.id,
          date: data.date,
          lectureNo,
        },
      },
    });

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: rec.status, markedById: req.user!.id },
      });
      results.push({ studentId: rec.studentId, status: 'updated', id: updated.id });
    } else {
      const created = await prisma.attendance.create({
        data: {
          studentId: rec.studentId,
          subjectId: subject.id,
          date: data.date,
          lectureNo,
          status: rec.status,
          markedById: req.user!.id,
        },
      });
      results.push({ studentId: rec.studentId, status: 'created', id: created.id });
    }
  }

  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Attendance',
    entityId: subject.id,
    description: `Marked attendance for ${results.filter((r) => r.status === 'created' || r.status === 'updated').length} student(s) on ${data.date.toISOString().slice(0, 10)}`,
    meta: { records: results.length, departmentId: data.departmentId, sessionId: data.sessionId, semesterId: data.semesterId },
  });

  res.json({ success: true, message: 'Attendance saved successfully.', results });
});
