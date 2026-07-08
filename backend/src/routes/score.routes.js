import { Router } from 'express';
import { ScoreController } from '../controllers/score.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.getAll);
router.get('/term-report', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.getTermReport);
router.get('/:id', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.getById);
router.post('/', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.upsert);
router.post('/bulk', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.bulkUpsert);
router.delete('/:id', authorize('super_admin', 'school_admin', 'teacher'), ScoreController.delete);

export default router;
