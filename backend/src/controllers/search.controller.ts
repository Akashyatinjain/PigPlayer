import { Response, NextFunction } from 'express';
import { SongService } from '../services/song.service';
import { PlaylistService } from '../services/playlist.service';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../types';
import { searchQuerySchema } from '../validators/song.validator';

export class SearchController {
  static async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError('Invalid search query.', 400);
      const { q } = parsed.data;
      if (!q) {
        return res.status(200).json({
          success: true,
          data: {
            songs: [],
            playlists: [],
          },
        });
      }

      const [songsResult, matchedPlaylists] = await Promise.all([
        SongService.listSongs({ query: q, limit: 30 }),
        PlaylistService.searchPlaylists(q, req.user?.id, 20),
      ]);

      res.status(200).json({
        success: true,
        data: {
          songs: songsResult.songs,
          playlists: matchedPlaylists,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
