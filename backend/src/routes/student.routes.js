import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'school_admin', 'teacher'), StudentController.getAll);
router.get('/ranking', authorize('super_admin', 'school_admin', 'teacher'), StudentController.getRanking);
router.get('/:id', authorize('super_admin', 'school_admin', 'teacher'), StudentController.getById);
router.get('/:id/profile', authorize('super_admin', 'school_admin', 'teacher'), StudentController.getStudentProfile);
router.post('/', authorize('super_admin', 'school_admin'), StudentController.create);
router.put('/:id', authorize('super_admin', 'school_admin'), StudentController.update);
router.delete('/bulk', authorize('super_admin', 'school_admin'), StudentController.bulkDelete);
router.delete('/:id', authorize('super_admin', 'school_admin'), StudentController.delete);
router.post('/transition', authorize('super_admin', 'school_admin'), StudentController.transition);
router.post('/bulk-transition', authorize('super_admin', 'school_admin'), StudentController.bulkTransition);

export default router;
