import { prisma } from '../config/db';

/**
 * Auto-enroll every student of a Department+Session+Semester into a subject
 * and every subject into a newly created student's program context.
 * Dedupes against existing enrollments — safe to call repeatedly.
 */
export async function autoEnrollSubject(
  subjectId: number,
  departmentId: number,
  sessionId: number,
  semesterId: number
): Promise<number> {
  const students = await prisma.student.findMany({
    where: { departmentId, sessionId, semesterId, isDeleted: false },
    select: { id: true },
  });
  if (students.length === 0) return 0;

  const existing = await prisma.enrollment.findMany({
    where: { subjectId, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true },
  });
  const existingSet = new Set(existing.map((e) => e.studentId));
  const newData = students
    .filter((s) => !existingSet.has(s.id))
    .map((s) => ({ studentId: s.id, subjectId }));

  if (newData.length > 0) {
    await prisma.enrollment.createMany({ data: newData });
  }
  return newData.length;
}

export async function autoEnrollStudent(
  studentId: number,
  departmentId: number,
  sessionId: number,
  semesterId: number
): Promise<number> {
  const subjects = await prisma.subject.findMany({
    where: { departmentId, sessionId, semesterId, isActive: true },
    select: { id: true },
  });
  if (subjects.length === 0) return 0;

  const existing = await prisma.enrollment.findMany({
    where: { studentId, subjectId: { in: subjects.map((s) => s.id) } },
    select: { subjectId: true },
  });
  const existingSet = new Set(existing.map((e) => e.subjectId));
  const newData = subjects
    .filter((s) => !existingSet.has(s.id))
    .map((s) => ({ studentId, subjectId: s.id }));

  if (newData.length > 0) {
    await prisma.enrollment.createMany({ data: newData });
  }
  return newData.length;
}
