import { Router } from 'express';
import {
  attendanceDates,
  attendanceSummary,
  deleteAttendance,
  listAttendance,
  markAttendance,
  updateAttendance,
  studentsForAttendance,
  studentAttendanceHistory,
  studentsByScope,
  markAttendanceByScope,
} from '../controllers/attendance.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listAttendance);
router.get('/summary', attendanceSummary);
router.get('/dates', attendanceDates);
router.get('/students', studentsForAttendance);
router.get('/history', studentAttendanceHistory);
router.get('/by-scope', studentsByScope);
router.post('/mark', markAttendance);
router.post('/mark-by-scope', requireAdmin(), markAttendanceByScope);
router.put('/:id', updateAttendance);
router.delete('/:id', requireAdmin(), deleteAttendance);

export default router;
