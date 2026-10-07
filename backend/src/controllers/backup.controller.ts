import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service';
import { AppError } from '../middleware/error.middleware';

export class BackupController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const backups = await BackupService.listBackups();
      res.status(200).json({ success: true, data: backups });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const includeMedia = req.body?.includeMedia !== false;
      const backup = await BackupService.createBackup({ includeMedia });
      res.status(201).json({ success: true, data: backup });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName, confirmReplace } = req.body || {};
      if (!fileName) throw new AppError('fileName is required', 400);
      const result = await BackupService.restoreBackup(
        String(fileName),
        Boolean(confirmReplace)
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async exportLibrary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BackupService.exportLibraryJson();
      res.setHeader('Content-Disposition', 'attachment; filename="soundify-library.json"');
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async importLibrary(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = req.body?.mode === 'replace' ? 'replace' : 'merge';
      const payload = req.body?.library || req.body;
      const result = await BackupService.importLibraryJson(payload, mode);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
