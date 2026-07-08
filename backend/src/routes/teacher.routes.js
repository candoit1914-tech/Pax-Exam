import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'school_admin'), TeacherController.getAll);
router.post('/', authorize('super_admin', 'school_admin'), TeacherController.create);
router.put('/:id', authorize('super_admin', 'school_admin'), TeacherController.update);
router.delete('/:id', authorize('super_admin', 'school_admin'), TeacherController.delete);

export default router;
