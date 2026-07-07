import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', SubjectController.getAll);
router.get('/:id', SubjectController.getById);
router.post('/', SubjectController.create);
router.put('/:id', SubjectController.update);
router.delete('/:id', SubjectController.delete);

export default router;
