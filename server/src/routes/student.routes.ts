import { Router } from 'express';
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  restoreStudent,
  updateStudent,
} from '../controllers/student.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);

// Delete & restore are admin-only (teachers must never permanently delete).
router.delete('/:id', requireAdmin(), deleteStudent);
router.post('/:id/restore', requireAdmin(), restoreStudent);

export default router;
