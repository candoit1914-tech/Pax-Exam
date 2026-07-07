import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', TeacherController.getAll);
router.post('/', TeacherController.create);
router.put('/:id', TeacherController.update);
router.delete('/:id', TeacherController.delete);

export default router;
