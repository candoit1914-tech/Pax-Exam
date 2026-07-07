import { Router } from 'express';
import { ScoreController } from '../controllers/score.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', ScoreController.getAll);
router.get('/term-report', ScoreController.getTermReport);
router.get('/:id', ScoreController.getById);
router.post('/', ScoreController.upsert);
router.post('/bulk', ScoreController.bulkUpsert);
router.delete('/:id', ScoreController.delete);

export default router;
