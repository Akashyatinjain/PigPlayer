import { Request, Response, NextFunction } from 'express';
import { SongService } from '../services/song.service';
import { MediaService } from '../services/media.service';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';
import { songListQuerySchema } from '../validators/song.validator';

export class SongController {
  static async listSongs(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = songListQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError('Invalid song filter or pagination parameters.', 400);
      const { q, genre, page, limit } = parsed.data;
      const result = await SongService.listSongs({
        query: q,
        genre,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result.songs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSongById(req: Request, res: Response, next: NextFunction) {
    try {
      const song = await SongService.getSongById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: song,
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkDuplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileHash, title, artist } = req.body;
      const duplicate = await SongService.checkDuplicate({
        fileHash: fileHash ? String(fileHash) : undefined,
        title: title ? String(title) : undefined,
        artist: artist ? String(artist) : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          isDuplicate: Boolean(duplicate),
          duplicate: duplicate || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSong(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const song = await SongService.createSong(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: song,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSong(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const song = await SongService.updateSong(
        req.params.id as string,
        req.body,
        req.user?.id,
        req.user?.role === 'admin'
      );
      res.status(200).json({
        success: true,
        data: song,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSong(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await SongService.deleteSong(
        req.params.id as string,
        req.user?.id,
        req.user?.role === 'admin'
      );
      res.status(200).json({
        success: true,
        message: 'Song deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAllSongs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await SongService.deleteAllSongs();
      res.status(200).json({
        success: true,
        message: 'All songs deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async streamAudio(req: Request, res: Response, next: NextFunction) {
    try {
      await MediaService.streamAudio(req, res);
    } catch (error) {
      next(error);
    }
  }

  static async streamArtwork(req: Request, res: Response, next: NextFunction) {
    try {
      await MediaService.streamArtwork(req, res);
    } catch (error) {
      next(error);
    }
  }

  static async downloadSong(req: Request, res: Response, next: NextFunction) {
    try {
      await MediaService.downloadAudio(req, res);
    } catch (error) {
      next(error);
    }
  }

  static async libraryStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await SongService.getLibraryStats(req.user?.id);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
