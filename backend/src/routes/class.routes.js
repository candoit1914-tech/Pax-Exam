import { Router } from 'express';
import { ClassController } from '../controllers/class.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', ClassController.getAll);
router.get('/:id', ClassController.getById);
router.post('/', ClassController.create);
router.put('/:id', ClassController.update);
router.delete('/:id', ClassController.delete);

export default router;
