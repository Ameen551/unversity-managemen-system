import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
const upsertSchema = z.object({
    subjectId: z.number().int().positive(),
    assessmentType: z.enum(['MID_TERM', 'FINAL_TERM']),
    records: z
        .array(z.object({
        studentId: z.number().int().positive(),
        obtainedMarks: z.number().min(0, 'Obtained marks cannot be negative.'),
        totalMarks: z.number().min(1, 'Total marks must be at least 1.'),
    }))
        .min(1, 'At least one marks record is required.'),
});
const updateSchema = z.object({
    obtainedMarks: z.number().min(0, 'Obtained marks cannot be negative.'),
    totalMarks: z.number().min(1, 'Total marks must be at least 1.'),
});
export const listMarks = asyncHandler(async (req, res) => {
    const q = req.query;
    const subjectId = q.subjectId ? Number(q.subjectId) : undefined;
    const studentId = q.studentId ? Number(q.studentId) : undefined;
    const assessmentType = q.assessmentType;
    const where = {};
    if (subjectId)
        where.subjectId = subjectId;
    if (studentId)
        where.studentId = studentId;
    if (assessmentType)
        where.assessmentType = assessmentType;
    const marks = await prisma.marks.findMany({
        where,
        orderBy: [{ studentId: 'asc' }, { assessmentType: 'asc' }],
        include: {
            student: { select: { id: true, name: true, studentId: true, section: true } },
            subject: { select: { id: true, name: true, code: true } },
            updatedBy: { select: { id: true, fullName: true } },
        },
    });
    res.json({ success: true, items: marks });
});
/** Upsert marks for a batch of students in one subject + assessment type. */
export const upsertMarks = asyncHandler(async (req, res) => {
    const data = upsertSchema.parse(req.body);
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject)
        throw errors.notFound('Subject not found.');
    const results = [];
    for (const rec of data.records) {
        if (rec.obtainedMarks > rec.totalMarks) {
            throw errors.badRequest(`Obtained marks (${rec.obtainedMarks}) cannot exceed total marks (${rec.totalMarks}).`);
        }
        const student = await prisma.student.findUnique({ where: { id: rec.studentId } });
        if (!student || student.isDeleted) {
            results.push({ studentId: rec.studentId, status: 'skipped', reason: 'Student not found' });
            continue;
        }
        const existing = await prisma.marks.findUnique({
            where: {
                studentId_subjectId_assessmentType: {
                    studentId: rec.studentId,
                    subjectId: data.subjectId,
                    assessmentType: data.assessmentType,
                },
            },
        });
        if (existing) {
            const updated = await prisma.marks.update({
                where: { id: existing.id },
                data: { obtainedMarks: rec.obtainedMarks, totalMarks: rec.totalMarks, updatedById: req.user.id },
            });
            results.push({ studentId: rec.studentId, status: 'updated', id: updated.id });
        }
        else {
            const created = await prisma.marks.create({
                data: {
                    studentId: rec.studentId,
                    subjectId: data.subjectId,
                    assessmentType: data.assessmentType,
                    obtainedMarks: rec.obtainedMarks,
                    totalMarks: rec.totalMarks,
                    updatedById: req.user.id,
                },
            });
            results.push({ studentId: rec.studentId, status: 'created', id: created.id });
        }
    }
    await logAudit(req, {
        action: 'CREATE',
        entityType: 'Marks',
        entityId: subject.id,
        description: `Saved ${data.assessmentType === 'MID_TERM' ? 'Mid Term' : 'Final Term'} marks for "${subject.name}"`,
        meta: { records: results.length },
    });
    res.json({ success: true, message: 'Marks saved successfully.', results });
});
export const updateMarks = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    if (data.obtainedMarks > data.totalMarks) {
        throw errors.badRequest('Obtained marks cannot exceed total marks.');
    }
    const existing = await prisma.marks.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Marks record not found.');
    const updated = await prisma.marks.update({
        where: { id },
        data: { obtainedMarks: data.obtainedMarks, totalMarks: data.totalMarks, updatedById: req.user.id },
    });
    await logAudit(req, {
        action: 'UPDATE',
        entityType: 'Marks',
        entityId: id,
        description: `Corrected marks for student #${existing.studentId}`,
    });
    res.json({ success: true, item: updated, message: 'Marks corrected.' });
});
/** Delete a marks record — admin only (RBAC at route level). */
export const deleteMarks = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.marks.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Marks record not found.');
    await prisma.marks.delete({ where: { id } });
    await logAudit(req, {
        action: 'DELETE',
        entityType: 'Marks',
        entityId: id,
        description: `Deleted marks record for student #${existing.studentId}`,
    });
    res.json({ success: true, message: 'Marks record deleted.' });
});
export const listAssessmentConfigs = asyncHandler(async (_req, res) => {
    const configs = await prisma.assessmentConfig.findMany({
        where: { isActive: true },
        orderBy: [{ departmentId: 'asc' }, { assessmentType: 'asc' }],
        include: { department: { select: { id: true, name: true } } },
    });
    res.json({ success: true, items: configs });
});
