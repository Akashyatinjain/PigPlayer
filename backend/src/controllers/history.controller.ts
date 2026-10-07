import { Response, NextFunction } from 'express';
import { HistoryService } from '../services/history.service';
import { AuthRequest } from '../types';

export class HistoryController {
  static async listHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const history = await HistoryService.listHistory(req.user?.id);
      res.status(200).json({
        success: true,
        data: history.map((h) => ({
          ...h.song,
          historyId: h.id,
          songId: h.songId,
          playedAt: h.playedAt,
          durationPlayed: h.durationPlayed,
          song: h.song,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordPlay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { songId, durationPlayed } = req.body;
      if (!songId) {
        return res.status(400).json({ success: false, message: 'songId is required' });
      }

      const history = await HistoryService.recordPlay(
        songId,
        req.user?.id,
        durationPlayed != null ? Number(durationPlayed) : undefined
      );
      res.status(201).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await HistoryService.clearHistory(req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Listening history cleared',
      });
    } catch (error) {
      next(error);
    }
  }
}
