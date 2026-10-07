import { Request, Response, NextFunction } from 'express';
import { SongService } from '../services/song.service';
import { PlaylistService } from '../services/playlist.service';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return res.status(200).json({
          success: true,
          data: {
            songs: [],
            playlists: [],
          },
        });
      }

      const [songsResult, playlists] = await Promise.all([
        SongService.listSongs({ query: q, limit: 30 }),
        PlaylistService.listPlaylists(),
      ]);

      const matchedPlaylists = playlists.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      );

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
