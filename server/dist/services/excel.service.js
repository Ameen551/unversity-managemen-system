import ExcelJS from 'exceljs';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
export const STUDENT_IMPORT_HEADERS = ['Student Name', 'Father Name', 'Student ID / Roll Number', 'Section'];
const headerMap = new Map([
    ['student name', 'name'],
    ['studentname', 'name'],
    ['father name', 'fatherName'],
    ['fathername', 'fatherName'],
    ['father', 'fatherName'],
    ['student id', 'studentId'],
    ['roll number', 'studentId'],
    ['rollnumber', 'studentId'],
    ['roll no', 'studentId'],
    ['student no', 'studentId'],
    ['section', 'section'],
]);
function normalizeHeader(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
/** Keyword-based header detection (robust to label variations). */
function detectField(header) {
    if (headerMap.has(header))
        return headerMap.get(header);
    if (header.includes('student id') || header.includes('roll number') || header.includes('roll no'))
        return 'studentId';
    if (header.includes('father'))
        return 'fatherName';
    if (header.includes('student name') || header === 'name')
        return 'name';
    if (header.includes('section'))
        return 'section';
    return undefined;
}
/** Downloads: generate a sample Excel/CSV template for student import. */
export async function buildStudentTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.columns = STUDENT_IMPORT_HEADERS.map((h) => ({ header: h, width: 30 }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(['Ayesha Khan', 'Muhammad Khan', 'PHARM-2024-001', 'A']);
    sheet.addRow(['Ali Raza', 'Ahmed Raza', 'BSIT-2024-002', 'B']);
    sheet.getColumn(3).numFmt = '@';
    return workbook.xlsx.writeBuffer();
}
function normalizeRows(rows) {
    if (rows.length < 2) {
        throw errors.unprocessable('The file does not contain any student rows. Please use the sample template.');
    }
    const headers = rows[0].map(normalizeHeader);
    const mapped = [];
    for (let i = 0; i < headers.length; i++) {
        const key = detectField(headers[i]);
        if (key)
            mapped.push({ colIndex: i, field: key });
    }
    if (mapped.length < 2) {
        throw errors.unprocessable('Invalid file format. The file must contain columns: Student Name, Father Name, Student ID / Roll Number, Section.');
    }
    const nameCol = mapped.find((m) => m.field === 'name');
    const fatherCol = mapped.find((m) => m.field === 'fatherName');
    const idCol = mapped.find((m) => m.field === 'studentId');
    const sectionCol = mapped.find((m) => m.field === 'section');
    const parsed = [];
    for (let r = 1; r < rows.length; r++) {
        const raw = rows[r] ?? [];
        const cell = (col) => {
            const v = col ? raw[col.colIndex] : undefined;
            return v === null || v === undefined ? '' : String(v).trim();
        };
        const name = cell(nameCol);
        const fatherName = cell(fatherCol);
        const studentId = cell(idCol);
        const section = cell(sectionCol) || null;
        if (!name && !fatherName && !studentId)
            continue; // skip fully empty rows
        parsed.push({ row: r + 1, name, fatherName, studentId, section });
    }
    return parsed;
}
/**
 * Reads an uploaded file (xlsx or csv) into rows. Throws a friendly error
 * for invalid/unreadable files.
 */
export async function readUploadRows(buffer, filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    try {
        if (ext === 'csv') {
            return parseCsvText(buffer.toString('utf-8').replace(/^\uFEFF/, ''));
        }
        if (ext === 'xlsx' || ext === 'xls') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const firstSheet = workbook.worksheets[0];
            if (!firstSheet)
                throw new Error('empty');
            const rows = [];
            firstSheet.eachRow((row) => {
                const values = row.values;
                rows.push(values.slice(1));
            });
            return rows;
        }
    }
    catch {
        throw errors.unprocessable('Could not read the file. Please upload a valid .xlsx or .csv file.');
    }
    throw errors.unprocessable('Unsupported file type. Please upload a .xlsx or .csv file.');
}
/** Lightweight CSV parser handling quotes, commas and CRLF. */
function parseCsvText(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                field += ch;
            }
        }
        else if (ch === '"') {
            inQuotes = true;
        }
        else if (ch === ',') {
            row.push(field);
            field = '';
        }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            row.push(field);
            field = '';
            if (row.some((c) => c.trim() !== ''))
                rows.push(row);
            row = [];
        }
        else {
            field += ch;
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        if (row.some((c) => c.trim() !== ''))
            rows.push(row);
    }
    return rows;
}
/**
 * Imports students into a Department+Session+Semester. Validates each row,
 * prevents duplicate student IDs, and never touches existing records.
 */
export async function importStudents(rows, departmentId, sessionId, semesterId) {
    const parsed = normalizeRows(rows);
    const result = { successCount: 0, errorCount: 0, duplicateCount: 0, issues: [] };
    if (parsed.length === 0) {
        throw errors.unprocessable('No valid student rows found in the file.');
    }
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department)
        throw errors.notFound('Department not found.');
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session)
        throw errors.notFound('Session not found.');
    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!semester)
        throw errors.notFound('Semester not found.');
    if (semester.departmentId !== department.id) {
        throw errors.badRequest('The selected semester does not belong to the selected department.');
    }
    const existingIds = await prisma.student.findMany({ select: { studentId: true } });
    const existingSet = new Set(existingIds.map((s) => s.studentId));
    const seenInFile = new Set();
    for (const rec of parsed) {
        if (!rec.name || !rec.studentId || !rec.fatherName) {
            result.errorCount++;
            result.issues.push({ row: rec.row, reason: 'Missing required fields (name, father name, student ID).' });
            continue;
        }
        const upperId = rec.studentId.toUpperCase();
        if (existingSet.has(upperId) || existingSet.has(rec.studentId)) {
            result.errorCount++;
            result.duplicateCount++;
            result.issues.push({ row: rec.row, reason: `Student ID "${rec.studentId}" already exists in the system.` });
            continue;
        }
        if (seenInFile.has(rec.studentId)) {
            result.errorCount++;
            result.issues.push({ row: rec.row, reason: `Duplicate Student ID "${rec.studentId}" within the file.` });
            continue;
        }
        seenInFile.add(rec.studentId);
        try {
            await prisma.student.create({
                data: {
                    name: rec.name,
                    fatherName: rec.fatherName,
                    studentId: rec.studentId,
                    section: rec.section,
                    departmentId,
                    sessionId,
                    semesterId,
                },
            });
            result.successCount++;
        }
        catch {
            result.errorCount++;
            result.issues.push({ row: rec.row, reason: 'Could not save this row.' });
        }
    }
    // Auto-enroll imported students into subjects of the same scope.
    const subjects = await prisma.subject.findMany({
        where: { departmentId, sessionId, semesterId, isActive: true },
        select: { id: true },
    });
    if (subjects.length > 0) {
        const importedStudents = await prisma.student.findMany({
            where: { departmentId, sessionId, semesterId, isDeleted: false },
            select: { id: true },
        });
        const existingEnrollments = await prisma.enrollment.findMany({
            where: {
                studentId: { in: importedStudents.map((s) => s.id) },
                subjectId: { in: subjects.map((s) => s.id) },
            },
            select: { studentId: true, subjectId: true },
        });
        const pairSet = new Set(existingEnrollments.map((e) => `${e.studentId}:${e.subjectId}`));
        const data = importedStudents.flatMap((s) => subjects
            .filter((sub) => !pairSet.has(`${s.id}:${sub.id}`))
            .map((sub) => ({ studentId: s.id, subjectId: sub.id })));
        if (data.length > 0) {
            await prisma.enrollment.createMany({ data });
        }
    }
    return result;
}
export async function buildReportWorkbook(sheetName, columns, rows) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
    sheet.columns = columns.map((c) => ({ header: c, width: 24 }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    for (const r of rows) {
        sheet.addRow(columns.map((c) => r[c] ?? ''));
    }
    return workbook.xlsx.writeBuffer();
}
export function buildCsvReport(columns, rows) {
    const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map(escape).join(',')];
    for (const r of rows) {
        lines.push(columns.map((c) => escape(r[c])).join(','));
    }
    return lines.join('\r\n');
}
