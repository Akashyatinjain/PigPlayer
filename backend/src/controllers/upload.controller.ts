import { Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';
import { SongService } from '../services/song.service';
import { MetadataService } from '../services/metadata.service';
import { ArtworkService } from '../services/artwork.service';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';
import { uploadSongSchema } from '../validators/song.validator';

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
      const artworkMime = ArtworkService.embeddedMime(metadata.picture);
      if (artworkMime && metadata.picture) {
        artworkPreview = `data:${artworkMime};base64,${metadata.picture.data.toString('base64')}`;
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
          hasEmbeddedArtwork: Boolean(artworkPreview),
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

      const parsed = uploadSongSchema.safeParse(req.body);
      if (!parsed.success) {
        const fields = parsed.error.issues.map((issue) => issue.path.join('.'));
        throw new AppError(`Invalid upload metadata: ${fields.join(', ')}`, 400);
      }
      const metadata = parsed.data;
      const { duplicatePolicy } = metadata;

      // Never trust a client-supplied hash: a forged value bypasses exact duplicate checks.
      const fileHash = await StorageService.hashBuffer(audioFile.buffer);

      const existingDup = duplicatePolicy === 'skip' ? await SongService.checkDuplicate({ fileHash }) : null;
      if (existingDup?.matchType === 'exact') {
        return res.status(200).json({
          success: true, data: existingDup.song, skipped: true, message: 'Duplicate detected and skipped',
        });
      }

      // Extract metadata locally if client did not send complete fields
      const extracted = await MetadataService.extractFromBuffer(
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype
      );

      const audioUpload = await StorageService.uploadAudio(
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype
      );
      writtenAudioPath = audioUpload.relativePath;

      let coverRelativePath: string | null = null;
      let coverFileName: string | null = null;

      if (coverFile) {
        const coverUpload = await StorageService.uploadArtwork(coverFile.buffer);
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

      const song = await SongService.createSong({
        title: metadata.title ?? extracted.title.slice(0, 512),
        artist: metadata.artist ?? extracted.artist.slice(0, 512),
        album: metadata.album ?? extracted.album?.slice(0, 512),
        albumArtist: metadata.albumArtist ?? extracted.albumArtist?.slice(0, 512),
        genre: metadata.genre ?? extracted.genre?.slice(0, 512),
        composer: metadata.composer ?? extracted.composer?.slice(0, 512),
        duration: metadata.duration ?? extracted.duration,
        trackNumber: metadata.trackNumber ?? extracted.trackNumber,
        discNumber: metadata.discNumber ?? extracted.discNumber,
        releaseYear: metadata.releaseYear ?? extracted.releaseYear,
        bitrate: metadata.bitrate ?? extracted.bitrate,
        audioRelativePath: audioUpload.relativePath,
        audioFileName: audioUpload.fileName,
        coverRelativePath,
        coverFileName,
        originalFileName: audioFile.originalname,
        fileSize: audioFile.size,
        mimeType: extracted.mimeType,
        fileHash,
        isDownloadable: metadata.isDownloadable,
      }, req.user?.id, {
        replaceHash: duplicatePolicy === 'replace',
        allowDuplicate: duplicatePolicy === 'keep',
        isAdmin: req.user?.role === 'admin',
      });
      writtenAudioPath = null;
      writtenCoverPath = null;

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
      let buffer = req.file?.buffer;
      if (!buffer) {
        const imageData = req.body?.imageData;
        if (typeof imageData !== 'string' || !imageData) throw new AppError('No artwork image provided', 400);
        const encoded = imageData.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
        buffer = Buffer.from(encoded, 'base64');
        if (buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
          throw new AppError('Invalid base64 artwork.', 400);
        }
      }

      const result = await StorageService.uploadArtwork(buffer);

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
