import { Response, NextFunction } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { AuthRequest } from '../types';

export class FavoriteController {
  static async listFavorites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const favorites = await FavoriteService.listFavorites(req.user?.id);
      res.status(200).json({
        success: true,
        data: favorites.map((f) => f.song),
      });
    } catch (error) {
      next(error);
    }
  }

  static async addFavorite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await FavoriteService.addFavorite(req.params.songId as string, req.user?.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFavorite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await FavoriteService.removeFavorite(req.params.songId as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Removed from favorites',
      });
    } catch (error) {
      next(error);
    }
  }
}
