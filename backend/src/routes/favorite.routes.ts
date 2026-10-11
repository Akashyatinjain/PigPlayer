import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { optionalAuth, requireMutationAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, FavoriteController.listFavorites);
router.post('/:songId', requireMutationAuth, FavoriteController.addFavorite);
router.delete('/:songId', requireMutationAuth, FavoriteController.removeFavorite);

export default router;
