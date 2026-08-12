import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { autoEnrollSubject } from '../services/enrollment.service';
import { isAdminRole } from '../config/env';
const subjectSchema = z.object({
    name: z.string().min(2, 'Subject name must be at least 2 characters.'),
    code: z.string().min(1, 'Subject code is required.').transform((v) => v.trim()),
    creditHours: z.number().int().min(1).max(20).optional(),
    description: z.string().optional().nullable(),
    departmentId: z.number().int().positive(),
    sessionId: z.number().int().positive(),
    semesterId: z.number().int().positive(),
    teacherId: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional(),
});
const subjectUpdateSchema = subjectSchema.partial();
export const listSubjects = asyncHandler(async (req, res) => {
    const { departmentId, sessionId, semesterId } = req.query;
    const where = {};
    if (departmentId)
        where.departmentId = Number(departmentId);
    if (sessionId)
        where.sessionId = Number(sessionId);
    if (semesterId)
        where.semesterId = Number(semesterId);
    if (!isAdminRole(req.user.role) || req.query.all !== 'true')
        where.isActive = true;
    const subjects = await prisma.subject.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
            department: true,
            session: true,
            semester: true,
            teacher: { select: { id: true, fullName: true, employeeId: true } },
            _count: { select: { enrollments: true, attendance: true, marks: true } },
        },
    });
    res.json({ success: true, items: subjects });
});
export const getSubject = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const subject = await prisma.subject.findUnique({
        where: { id },
        include: {
            department: true,
            session: true,
            semester: true,
            enrollments: { include: { student: true } },
        },
    });
    if (!subject)
        throw errors.notFound('Subject not found.');
    res.json({ success: true, item: subject });
});
export const createSubject = asyncHandler(async (req, res) => {
    const data = subjectSchema.parse(req.body);
    const [department, session, semester] = await Promise.all([
        prisma.department.findUnique({ where: { id: data.departmentId } }),
        prisma.session.findUnique({ where: { id: data.sessionId } }),
        prisma.semester.findUnique({ where: { id: data.semesterId } }),
    ]);
    if (!department)
        throw errors.notFound('Department not found.');
    if (!session)
        throw errors.notFound('Session not found.');
    if (!semester)
        throw errors.notFound('Semester not found.');
    if (semester.departmentId !== department.id) {
        throw errors.badRequest('The selected semester does not belong to the selected department.');
    }
    const existing = await prisma.subject.findUnique({
        where: { code_departmentId_sessionId_semesterId: { code: data.code, departmentId: data.departmentId, sessionId: data.sessionId, semesterId: data.semesterId } },
    });
    if (existing) {
        throw errors.conflict(`A subject with code "${data.code}" already exists for this department, session and semester.`);
    }
    const subject = await prisma.subject.create({
        data: {
            name: data.name,
            code: data.code,
            creditHours: data.creditHours ?? 3,
            description: data.description ?? null,
            departmentId: data.departmentId,
            sessionId: data.sessionId,
            semesterId: data.semesterId,
            teacherId: data.teacherId ?? null,
            isActive: data.isActive ?? true,
        },
    });
    const enrolled = await autoEnrollSubject(subject.id, data.departmentId, data.sessionId, data.semesterId);
    await logAudit(req, {
        action: 'CREATE',
        entityType: 'Subject',
        entityId: subject.id,
        description: `Created subject "${subject.name}" (${subject.code})`,
        meta: { autoEnrolledStudents: enrolled },
    });
    res.status(201).json({
        success: true,
        item: subject,
        message: enrolled > 0
            ? `Subject created and ${enrolled} student(s) enrolled automatically.`
            : 'Subject created successfully.',
    });
});
export const updateSubject = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = subjectUpdateSchema.parse(req.body);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Subject not found.');
    const subject = await prisma.subject.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            creditHours: data.creditHours,
            description: data.description,
            departmentId: data.departmentId,
            sessionId: data.sessionId,
            semesterId: data.semesterId,
            teacherId: data.teacherId,
            isActive: data.isActive,
        },
    });
    await logAudit(req, {
        action: 'UPDATE',
        entityType: 'Subject',
        entityId: id,
        description: `Updated subject "${subject.name}"`,
    });
    res.json({ success: true, item: subject, message: 'Subject updated successfully.' });
});
export const deleteSubject = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Subject not found.');
    const refs = await prisma.enrollment.count({ where: { subjectId: id } });
    if (refs > 0) {
        throw errors.conflict('This subject has student enrollments. Remove enrollments first or deactivate it.');
    }
    await prisma.subject.delete({ where: { id } });
    await logAudit(req, {
        action: 'DELETE',
        entityType: 'Subject',
        entityId: id,
        description: `Deleted subject "${existing.name}"`,
    });
    res.json({ success: true, message: 'Subject deleted successfully.' });
});
