import { Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service';
import { AuthRequest } from '../types';

export class BackupController {
  static async list(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const backups = await BackupService.listBackups();
      res.status(200).json({ success: true, data: backups });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const includeMedia = req.body?.includeMedia !== false;
      const backup = await BackupService.createBackup({ includeMedia });
      res.status(201).json({ success: true, data: backup });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { fileName, confirmReplace } = req.body || {};
      const result = await BackupService.restoreBackup(
        fileName,
        confirmReplace ?? false,
        req.user!.id
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async exportLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await BackupService.exportLibraryJson(req.user!.id);
      res.setHeader('Content-Disposition', 'attachment; filename="piggyplayer-library.json"');
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async importLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mode = req.body?.mode === 'replace' ? 'replace' : 'merge';
      const payload = req.body?.library || req.body;
      const result = await BackupService.importLibraryJson(payload, mode, req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
