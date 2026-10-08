import { Request, Response, NextFunction } from 'express';
import { PlaylistService } from '../services/playlist.service';
import { AuthRequest } from '../types';

export class PlaylistController {
  static async listPlaylists(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlists = await PlaylistService.listPlaylists(req.user?.id);
      res.status(200).json({
        success: true,
        data: playlists,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPlaylistById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await PlaylistService.getPlaylistById(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        data: playlist,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createPlaylist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await PlaylistService.createPlaylist({
        name: req.body.name,
        description: req.body.description,
        coverUrl: req.body.coverUrl,
        userId: req.user?.id || null,
      });

      res.status(201).json({
        success: true,
        data: playlist,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePlaylist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await PlaylistService.updatePlaylist(
        req.params.id as string,
        req.body,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        data: playlist,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePlaylist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PlaylistService.deletePlaylist(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Playlist deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async addSong(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PlaylistService.addSong(
        req.params.id as string,
        req.body.songId,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeSong(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PlaylistService.removeSong(
        req.params.id as string,
        req.params.songId as string,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: 'Song removed from playlist',
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorderSongs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PlaylistService.reorderSongs(
        req.params.id as string,
        req.body.songIds,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: 'Playlist reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
