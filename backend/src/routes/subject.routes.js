import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'school_admin', 'teacher'), SubjectController.getAll);
router.get('/:id', authorize('super_admin', 'school_admin', 'teacher'), SubjectController.getById);
router.post('/', authorize('super_admin', 'school_admin'), SubjectController.create);
router.put('/:id', authorize('super_admin', 'school_admin'), SubjectController.update);
router.delete('/:id', authorize('super_admin', 'school_admin'), SubjectController.delete);

export default router;
