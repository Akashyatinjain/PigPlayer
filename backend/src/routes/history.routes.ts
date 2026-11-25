import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller';
import { optionalAuth, requireMutationAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

router.get('/', optionalAuth, HistoryController.listHistory);
router.post('/', requireMutationAuth, validateBody(z.object({
  songId: z.string().trim().min(1).max(191),
  durationPlayed: z.number().finite().nonnegative().nullish(),
})), HistoryController.recordPlay);
router.delete('/', requireMutationAuth, HistoryController.clearHistory);

export default router;
