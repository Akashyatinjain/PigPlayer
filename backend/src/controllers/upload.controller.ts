import { Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';
import { SongService } from '../services/song.service';
import { MetadataService } from '../services/metadata.service';
import { ArtworkService } from '../services/artwork.service';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

export class UploadController {
  /**
   * Analyze audio locally: metadata + artwork + hash (no DB write).
   */
  static async analyze(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const audioFile = req.file;
      if (!audioFile) {
        throw new AppError('No audio file provided', 400);
      }
      const validation = StorageService.validateAudioBuffer(audioFile.buffer, audioFile.originalname);
      if (!validation.ok) throw new AppError(validation.reason || 'Invalid audio file', 400);

      const [metadata, fileHash] = await Promise.all([
        MetadataService.extractFromBuffer(
          audioFile.buffer,
          audioFile.originalname,
          audioFile.mimetype
        ),
        StorageService.hashBuffer(audioFile.buffer),
      ]);

      let artworkPreview: string | null = null;
      if (metadata.picture) {
        artworkPreview = `data:${metadata.picture.format};base64,${metadata.picture.data.toString('base64')}`;
      }

      const duplicate = await SongService.checkDuplicate({
        fileHash,
        title: metadata.title,
        artist: metadata.artist,
      });

      res.status(200).json({
        success: true,
        data: {
          metadata: {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            albumArtist: metadata.albumArtist,
            genre: metadata.genre,
            trackNumber: metadata.trackNumber,
            discNumber: metadata.discNumber,
            releaseYear: metadata.releaseYear,
            composer: metadata.composer,
            duration: metadata.duration,
            bitrate: metadata.bitrate,
            mimeType: metadata.mimeType || audioFile.mimetype,
          },
          fileHash,
          fileSize: audioFile.size,
          fileName: audioFile.originalname,
          artworkPreview,
          hasEmbeddedArtwork: Boolean(metadata.picture),
          duplicate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload audio (+ optional cover), extract metadata if needed, create song record.
   * Supports duplicatePolicy: skip | replace | keep
   */
  static async uploadSongFile(req: AuthRequest, res: Response, next: NextFunction) {
    let writtenAudioPath: string | null = null;
    let writtenCoverPath: string | null = null;

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const audioFile = files?.audio?.[0] || (req.file?.fieldname === 'audio' ? req.file : undefined);
      const coverFile = files?.cover?.[0] || (req.file?.fieldname === 'cover' ? req.file : undefined);

      if (!audioFile) {
        throw new AppError('No audio file provided', 400);
      }
      const validation = StorageService.validateAudioBuffer(audioFile.buffer, audioFile.originalname);
      if (!validation.ok) throw new AppError(validation.reason || 'Invalid audio file', 400);
      if (coverFile && coverFile.size > 10 * 1024 * 1024) {
        throw new AppError('Cover artwork must be 10 MB or smaller.', 413);
      }

      const requestedPolicy = String(req.body.duplicatePolicy || 'skip');
      if (!['skip', 'replace', 'keep'].includes(requestedPolicy)) {
        throw new AppError('duplicatePolicy must be skip, replace, or keep', 400);
      }
      const duplicatePolicy = requestedPolicy as 'skip' | 'replace' | 'keep';

      // Never trust a client-supplied hash: a forged value bypasses exact duplicate checks.
      const fileHash = await StorageService.hashBuffer(audioFile.buffer);

      const existingDup = await SongService.checkDuplicate({ fileHash });
      if (existingDup?.matchType === 'exact') {
        if (duplicatePolicy === 'skip') {
          return res.status(200).json({
            success: true,
            data: existingDup.song,
            skipped: true,
            message: 'Duplicate detected — skipped',
          });
        }
      }

      // Extract metadata locally if client did not send complete fields
      const extracted = await MetadataService.extractFromBuffer(
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype
      );

      const title = req.body.title || extracted.title;
      const artist = req.body.artist || extracted.artist;

      const audioUpload = await StorageService.uploadAudio(
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype
      );
      writtenAudioPath = audioUpload.relativePath;

      let coverRelativePath: string | null = null;
      let coverFileName: string | null = null;

      if (coverFile) {
        const coverUpload = await StorageService.uploadArtwork(
          coverFile.buffer,
          coverFile.originalname,
          coverFile.mimetype
        );
        coverRelativePath = coverUpload.relativePath;
        coverFileName = coverUpload.fileName;
        writtenCoverPath = coverRelativePath;
      } else if (extracted.picture) {
        const embedded = await ArtworkService.saveEmbedded(extracted.picture);
        if (embedded) {
          coverRelativePath = embedded.relativePath;
          coverFileName = embedded.fileName;
          writtenCoverPath = coverRelativePath;
        }
      }

      const song = await SongService.createSong(
          {
            title,
            artist,
            album: req.body.album ?? extracted.album,
            albumArtist: req.body.albumArtist ?? extracted.albumArtist,
            genre: req.body.genre ?? extracted.genre,
            duration: req.body.duration
              ? Number(req.body.duration)
              : extracted.duration,
            trackNumber: req.body.trackNumber
              ? Number(req.body.trackNumber)
              : extracted.trackNumber,
            discNumber: req.body.discNumber
              ? Number(req.body.discNumber)
              : extracted.discNumber,
            releaseYear: req.body.releaseYear
              ? Number(req.body.releaseYear)
              : extracted.releaseYear,
            composer: req.body.composer ?? extracted.composer,
            audioRelativePath: audioUpload.relativePath,
            audioFileName: audioUpload.fileName,
            coverRelativePath,
            coverFileName,
            originalFileName: audioFile.originalname,
            fileSize: audioFile.size,
            mimeType: audioFile.mimetype || extracted.mimeType,
            fileHash,
            bitrate: req.body.bitrate
              ? Number(req.body.bitrate)
              : extracted.bitrate,
            isDownloadable:
              req.body.isDownloadable !== undefined
                ? req.body.isDownloadable === 'true' ||
                  req.body.isDownloadable === true
                : true,
          },
          req.user?.id,
          {
            replaceHash: duplicatePolicy === 'replace',
            allowDuplicate: duplicatePolicy === 'keep',
          }
        );

      return res.status(201).json({
        success: true,
        data: song,
      });
    } catch (error) {
      // Clean files on failures at every stage, including metadata/artwork processing.
      if (writtenAudioPath) await StorageService.deleteAudio(writtenAudioPath);
      if (writtenCoverPath) await StorageService.deleteArtwork(writtenCoverPath);
      next(error);
    }
  }

  static async uploadArtwork(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file && !req.body.imageData) {
        throw new AppError('No artwork image provided', 400);
      }
      if (req.file && req.file.size > 10 * 1024 * 1024) {
        throw new AppError('Artwork must be 10 MB or smaller.', 413);
      }
      if (typeof req.body.imageData === 'string' && req.body.imageData.length > 14 * 1024 * 1024) {
        throw new AppError('Artwork must be 10 MB or smaller.', 413);
      }

      let buffer: Buffer;
      let filename = 'cover.jpg';
      let mimeType = 'image/jpeg';

      if (req.file) {
        buffer = req.file.buffer;
        filename = req.file.originalname;
        mimeType = req.file.mimetype;
      } else {
        const matches = String(req.body.imageData).match(
          /^data:([A-Za-z-+\/]+);base64,(.+)$/
        );
        if (matches) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(String(req.body.imageData), 'base64');
        }
      }

      const result = await StorageService.uploadArtwork(buffer, filename, mimeType);

      res.status(200).json({
        success: true,
        data: {
          coverUrl: result.relativePath,
          coverRelativePath: result.relativePath,
          coverFileName: result.fileName,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
