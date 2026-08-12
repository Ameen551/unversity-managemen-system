import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { isAdminRole } from '../config/env';
export const dashboardStats = asyncHandler(async (req, res) => {
    const isAdmin = isAdminRole(req.user.role);
    const [departments, sessions, semesters, teachers, students, subjects, attendance, marks, uploads, recentStudents,] = await Promise.all([
        prisma.department.count({ where: { isActive: true } }),
        prisma.session.count({ where: { isActive: true } }),
        prisma.semester.count({ where: { isActive: true } }),
        isAdmin ? prisma.user.count({ where: { role: 'TEACHER' } }) : 0,
        prisma.student.count({ where: { isDeleted: false } }),
        prisma.subject.count({ where: { isActive: true } }),
        prisma.attendance.count(),
        prisma.marks.count(),
        isAdmin ? prisma.uploadedFile.count() : 0,
        prisma.student.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { department: { select: { name: true } }, semester: { select: { name: true } } },
        }),
    ]);
    res.json({
        success: true,
        stats: {
            departments,
            sessions,
            semesters,
            teachers,
            students,
            subjects,
            attendance,
            marks,
            uploads,
            isAdmin,
        },
        recentStudents,
    });
});
