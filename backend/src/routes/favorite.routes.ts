import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, FavoriteController.listFavorites);
router.post('/:songId', optionalAuth, FavoriteController.addFavorite);
router.delete('/:songId', optionalAuth, FavoriteController.removeFavorite);

export default router;
