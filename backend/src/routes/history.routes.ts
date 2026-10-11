import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller';
import { optionalAuth, requireMutationAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, HistoryController.listHistory);
router.post('/', requireMutationAuth, HistoryController.recordPlay);
router.delete('/', requireMutationAuth, HistoryController.clearHistory);

export default router;
