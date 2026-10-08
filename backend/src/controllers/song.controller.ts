import { Request, Response, NextFunction } from 'express';
import { SongService } from '../services/song.service';
import { MediaService } from '../services/media.service';
import { AuthRequest } from '../types';

export class SongController {
  static async listSongs(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, genre, page, limit } = req.query;
      const result = await SongService.listSongs({
        query: q ? String(q) : undefined,
        genre: genre ? String(genre) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
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
      const song = await SongService.updateSong(req.params.id as string, req.body);
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
      await SongService.deleteSong(req.params.id as string);
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

  static async libraryStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SongService.getLibraryStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
