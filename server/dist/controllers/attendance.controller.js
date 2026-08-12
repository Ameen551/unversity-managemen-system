import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
const dateSchema = z.coerce.date();
const markSchema = z.object({
    subjectId: z.number().int().positive(),
    date: dateSchema,
    lectureNo: z.number().int().min(1).optional(),
    records: z
        .array(z.object({
        studentId: z.number().int().positive(),
        status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
    }))
        .min(1, 'At least one attendance record is required.'),
});
const updateSchema = z.object({
    status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
    date: dateSchema.optional(),
    lectureNo: z.number().int().min(1).optional(),
});
export const listAttendance = asyncHandler(async (req, res) => {
    const q = req.query;
    const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
    const studentId = q.studentId ? Number(q.studentId) : undefined;
    const where = {};
    if (subjectId)
        where.subjectId = subjectId;
    if (studentId)
        where.studentId = studentId;
    if (q.date) {
        const start = new Date(q.date);
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
export const attendanceSummary = asyncHandler(async (req, res) => {
    const q = req.query;
    const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
    const studentId = q.studentId ? Number(q.studentId) : undefined;
    const where = {};
    if (subjectId)
        where.subjectId = subjectId;
    if (studentId)
        where.studentId = studentId;
    const rows = await prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where,
        _count: { _all: true },
    });
    const students = await prisma.enrollment.findMany({
        where: subjectId ? { subjectId } : { studentId },
        include: { student: true },
    });
    const map = new Map();
    for (const row of rows) {
        const entry = map.get(row.studentId) ?? { total: 0, present: 0, absent: 0, leave: 0 };
        entry.total += row._count._all;
        if (row.status === 'PRESENT')
            entry.present += row._count._all;
        if (row.status === 'ABSENT')
            entry.absent += row._count._all;
        if (row.status === 'LEAVE')
            entry.leave += row._count._all;
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
export const markAttendance = asyncHandler(async (req, res) => {
    const data = markSchema.parse(req.body);
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject)
        throw errors.notFound('Subject not found.');
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
                data: { status: rec.status, markedById: req.user.id },
            });
            results.push({ studentId: rec.studentId, status: 'updated', id: updated.id });
        }
        else {
            const created = await prisma.attendance.create({
                data: {
                    studentId: rec.studentId,
                    subjectId: data.subjectId,
                    date: data.date,
                    lectureNo,
                    status: rec.status,
                    markedById: req.user.id,
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
export const updateAttendance = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Attendance record not found.');
    const updated = await prisma.attendance.update({
        where: { id },
        data: { status: data.status, date: data.date, lectureNo: data.lectureNo, markedById: req.user.id },
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
export const deleteAttendance = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Attendance record not found.');
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
export const attendanceDates = asyncHandler(async (req, res) => {
    const subjectId = Number(req.query.subjectId);
    if (!subjectId)
        throw errors.badRequest('subjectId is required.');
    const rows = await prisma.attendance.findMany({
        where: { subjectId },
        select: { date: true, lectureNo: true },
        distinct: ['date', 'lectureNo'],
        orderBy: { date: 'desc' },
    });
    res.json({ success: true, items: rows });
});
