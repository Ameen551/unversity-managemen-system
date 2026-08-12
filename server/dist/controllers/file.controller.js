import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { buildStudentTemplate, importStudents, readUploadRows } from '../services/excel.service';
export const uploadDir = path.resolve(process.cwd(), env.uploadDir);
export const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) {
            cb(null, true);
        }
        else {
            cb(errors.unprocessable('Only .xlsx, .xls and .csv files are allowed.'));
        }
    },
}).single('file');
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
export const uploadPhotoMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_IMAGE_EXT.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(errors.unprocessable('Only .jpg, .jpeg, .png and .webp images are allowed.'));
        }
    },
}).single('photo');
export const uploadPhoto = asyncHandler(async (req, res) => {
    if (!req.file)
        throw errors.badRequest('No photo was uploaded.');
    const { type, id } = req.body;
    if (!type || !id)
        throw errors.badRequest('type and id are required.');
    const storedName = `${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
    await fs.mkdir(path.join(uploadDir, 'photos'), { recursive: true });
    await fs.writeFile(path.join(uploadDir, 'photos', storedName), req.file.buffer);
    const photoUrl = `/api/files/photo/${storedName}`;
    if (type === 'student') {
        await prisma.student.update({ where: { id: Number(id) }, data: { photo: photoUrl } });
    }
    else if (type === 'teacher') {
        await prisma.user.update({ where: { id: Number(id) }, data: { photo: photoUrl } });
    }
    res.json({ success: true, photoUrl });
});
export const servePhoto = asyncHandler(async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadDir, 'photos', fileName);
    try {
        await fs.access(filePath);
    }
    catch {
        throw errors.notFound('Photo not found.');
    }
    res.sendFile(filePath);
});
const importSchema = z.object({
    departmentId: z.coerce.number().int().positive(),
    sessionId: z.coerce.number().int().positive(),
    semesterId: z.coerce.number().int().positive(),
});
export const getTemplate = asyncHandler(async (_req, res) => {
    const buffer = await buildStudentTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student-import-template.xlsx"');
    res.send(Buffer.from(buffer));
});
export const importStudentsHandler = asyncHandler(async (req, res) => {
    if (!req.file)
        throw errors.badRequest('No file was uploaded.');
    const body = importSchema.parse(req.body);
    const rows = await readUploadRows(req.file.buffer, req.file.originalname);
    const result = await importStudents(rows, body.departmentId, body.sessionId, body.semesterId);
    const storedName = `${crypto.randomUUID()}-${req.file.originalname}`;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, storedName), req.file.buffer);
    const status = result.errorCount === 0 ? 'COMPLETED' : result.successCount > 0 ? 'PARTIAL' : 'FAILED';
    const uploaded = await prisma.uploadedFile.create({
        data: {
            originalName: req.file.originalname,
            storedName,
            fileType: path.extname(req.file.originalname).toLowerCase() === '.csv' ? 'CSV' : 'XLSX',
            status,
            rowCount: result.successCount + result.errorCount,
            successCount: result.successCount,
            errorCount: result.errorCount,
            departmentId: body.departmentId,
            sessionId: body.sessionId,
            semesterId: body.semesterId,
            uploadedById: req.user.id,
        },
    });
    await logAudit(req, {
        action: 'IMPORT',
        entityType: 'UploadedFile',
        entityId: uploaded.id,
        description: `Imported student file "${req.file.originalname}" (${result.successCount} ok, ${result.errorCount} errors)`,
        meta: result.issues,
    });
    res.status(201).json({
        success: true,
        message: result.errorCount === 0
            ? `Successfully imported ${result.successCount} student(s).`
            : `Imported ${result.successCount} student(s) with ${result.errorCount} issue(s).`,
        uploaded,
        result,
    });
});
export const listUploads = asyncHandler(async (req, res) => {
    const uploads = await prisma.uploadedFile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            uploadedBy: { select: { id: true, fullName: true } },
        },
    });
    res.json({ success: true, items: uploads });
});
export const downloadUpload = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file)
        throw errors.notFound('Uploaded file not found.');
    const filePath = path.join(uploadDir, file.storedName);
    try {
        await fs.access(filePath);
    }
    catch {
        throw errors.notFound('The physical file is no longer available on the server.');
    }
    res.download(filePath, file.originalName);
});
