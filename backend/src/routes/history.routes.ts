import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, HistoryController.listHistory);
router.post('/', optionalAuth, HistoryController.recordPlay);
router.delete('/', optionalAuth, HistoryController.clearHistory);

export default router;
