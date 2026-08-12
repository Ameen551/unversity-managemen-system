import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { autoEnrollStudent } from '../services/enrollment.service';
import { isAdminRole } from '../config/env';
import { getPagination, paginate } from '../utils/pagination';
const studentSchema = z.object({
    name: z.string().min(2, 'Student name is required.'),
    fatherName: z.string().min(1, 'Father name is required.'),
    studentId: z.string().min(1, 'Student ID / Roll Number is required.').transform((v) => v.trim()),
    admissionNumber: z.string().optional().nullable(),
    section: z.string().max(20).optional().nullable(),
    departmentId: z.number().int().positive(),
    sessionId: z.number().int().positive(),
    semesterId: z.number().int().positive(),
    photo: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    cnic: z.string().optional().nullable(),
});
const studentUpdateSchema = studentSchema.partial();
export const listStudents = asyncHandler(async (req, res) => {
    const q = req.query;
    const departmentId = q.departmentId ? Number(q.departmentId) : undefined;
    const sessionId = q.sessionId ? Number(q.sessionId) : undefined;
    const semesterId = q.semesterId ? Number(q.semesterId) : undefined;
    const section = q.section || undefined;
    const search = q.search?.trim();
    const sort = q.sort || 'studentId';
    const where = {};
    if (departmentId)
        where.departmentId = departmentId;
    if (sessionId)
        where.sessionId = sessionId;
    if (semesterId)
        where.semesterId = semesterId;
    if (section)
        where.section = section;
    if (isAdminRole(req.user.role) && q.includeDeleted === 'true') {
        // admin may view soft-deleted records
    }
    else {
        where.isDeleted = false;
    }
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { studentId: { contains: search } },
            { fatherName: { contains: search } },
        ];
    }
    const orderBy = [];
    const sortable = ['name', 'studentId', 'fatherName', 'section', 'createdAt'];
    if (sortable.includes(sort)) {
        orderBy.push({ [sort]: q.order === 'desc' ? 'desc' : 'asc' });
    }
    else {
        orderBy.push({ studentId: 'asc' });
    }
    const p = getPagination(q);
    const [total, items] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
            where,
            orderBy,
            skip: p.skip,
            take: p.take,
            include: {
                department: true,
                session: true,
                semester: true,
                marks: true,
                _count: { select: { enrollments: true } },
            },
        }),
    ]);
    res.json({ success: true, ...paginate(items, total, p) });
});
export const getStudent = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({
        where: { id },
        include: {
            department: true,
            session: true,
            semester: true,
            createdBy: { select: { id: true, fullName: true } },
            marks: true,
            enrollments: { include: { subject: true } },
            attendance: true,
        },
    });
    if (!student)
        throw errors.notFound('Student not found.');
    // Attendance summary per subject + overall
    const attendanceBySubject = await prisma.attendance.groupBy({
        by: ['subjectId', 'status'],
        where: { studentId: id },
        _count: { _all: true },
    });
    const summaryMap = new Map();
    for (const row of attendanceBySubject) {
        const entry = summaryMap.get(row.subjectId) ?? { total: 0, present: 0, absent: 0, leave: 0 };
        entry.total += row._count._all;
        if (row.status === 'PRESENT')
            entry.present += row._count._all;
        if (row.status === 'ABSENT')
            entry.absent += row._count._all;
        if (row.status === 'LEAVE')
            entry.leave += row._count._all;
        summaryMap.set(row.subjectId, entry);
    }
    res.json({
        success: true,
        item: student,
        attendanceBySubject: Object.fromEntries(summaryMap),
    });
});
async function ensureScopeValid(data) {
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
}
export const createStudent = asyncHandler(async (req, res) => {
    const data = studentSchema.parse(req.body);
    await ensureScopeValid(data);
    const existing = await prisma.student.findUnique({ where: { studentId: data.studentId } });
    if (existing) {
        throw errors.conflict(`Student ID "${data.studentId}" already exists. Please use a unique ID.`);
    }
    const student = await prisma.student.create({
        data: {
            name: data.name,
            fatherName: data.fatherName,
            studentId: data.studentId,
            admissionNumber: data.admissionNumber ?? null,
            section: data.section ?? null,
            departmentId: data.departmentId,
            sessionId: data.sessionId,
            semesterId: data.semesterId,
            photo: data.photo ?? null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            gender: data.gender ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            address: data.address ?? null,
            cnic: data.cnic ?? null,
            createdById: req.user.id,
        },
    });
    const enrolled = await autoEnrollStudent(student.id, data.departmentId, data.sessionId, data.semesterId);
    await logAudit(req, {
        action: 'CREATE',
        entityType: 'Student',
        entityId: student.id,
        description: `Added student "${student.name}" (${student.studentId})`,
        meta: { autoEnrolledSubjects: enrolled },
    });
    res.status(201).json({
        success: true,
        item: student,
        message: enrolled > 0
            ? `Student added and enrolled in ${enrolled} subject(s).`
            : 'Student added successfully.',
    });
});
export const updateStudent = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = studentUpdateSchema.parse(req.body);
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Student not found.');
    if (data.studentId && data.studentId !== existing.studentId) {
        const clash = await prisma.student.findUnique({ where: { studentId: data.studentId } });
        if (clash)
            throw errors.conflict(`Student ID "${data.studentId}" already exists.`);
    }
    if (data.departmentId || data.sessionId || data.semesterId) {
        const merged = {
            departmentId: data.departmentId ?? existing.departmentId,
            sessionId: data.sessionId ?? existing.sessionId,
            semesterId: data.semesterId ?? existing.semesterId,
            // minimal fake for schema check
        };
        await ensureScopeValid(merged);
    }
    const student = await prisma.student.update({
        where: { id },
        data: {
            name: data.name,
            fatherName: data.fatherName,
            studentId: data.studentId,
            admissionNumber: data.admissionNumber,
            section: data.section,
            departmentId: data.departmentId,
            sessionId: data.sessionId,
            semesterId: data.semesterId,
            photo: data.photo,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            gender: data.gender,
            phone: data.phone,
            email: data.email,
            address: data.address,
            cnic: data.cnic,
        },
    });
    await logAudit(req, {
        action: 'UPDATE',
        entityType: 'Student',
        entityId: id,
        description: `Updated student "${student.name}" (${student.studentId})`,
    });
    res.json({ success: true, item: student, message: 'Student updated successfully.' });
});
/** Soft delete — admin only. Teachers never reach this route (RBAC). */
export const deleteStudent = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Student not found.');
    if (existing.isDeleted)
        throw errors.badRequest('Student is already deleted.');
    const student = await prisma.student.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
    });
    await logAudit(req, {
        action: 'DELETE',
        entityType: 'Student',
        entityId: id,
        description: `Soft-deleted student "${student.name}" (${student.studentId})`,
    });
    res.json({ success: true, message: 'Student removed. You can restore it anytime.' });
});
/** Restore — admin only. */
export const restoreStudent = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Student not found.');
    if (!existing.isDeleted)
        throw errors.badRequest('Student is not deleted.');
    const student = await prisma.student.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null },
    });
    await logAudit(req, {
        action: 'RESTORE',
        entityType: 'Student',
        entityId: id,
        description: `Restored student "${student.name}" (${student.studentId})`,
    });
    res.json({ success: true, item: student, message: 'Student restored successfully.' });
});
