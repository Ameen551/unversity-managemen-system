import { Router } from 'express';
import {
  createTeacher,
  deleteTeacher,
  listTeachers,
  resetTeacherPassword,
  updateTeacher,
} from '../controllers/teacher.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin());

router.get('/', listTeachers);
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.post('/:id/reset-password', resetTeacherPassword);
router.delete('/:id', deleteTeacher);

export default router;
