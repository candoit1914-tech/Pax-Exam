import { Router } from 'express';
import { ClassController } from '../controllers/class.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'school_admin', 'teacher'), ClassController.getAll);
router.get('/:id', authorize('super_admin', 'school_admin', 'teacher'), ClassController.getById);
router.post('/', authorize('super_admin', 'school_admin'), ClassController.create);
router.put('/:id', authorize('super_admin', 'school_admin'), ClassController.update);
router.delete('/:id', authorize('super_admin', 'school_admin'), ClassController.delete);

export default router;
