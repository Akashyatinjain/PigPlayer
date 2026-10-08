import { Router } from 'express';
import { SongController } from '../controllers/song.controller';
import { requireMutationAuth, requireProductionAdmin } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createSongSchema,
  updateSongSchema,
  checkDuplicateSchema,
} from '../validators/song.validator';

const router = Router();

router.get('/', SongController.listSongs);
router.get('/stats', SongController.libraryStats);
router.post('/check-duplicate', validateBody(checkDuplicateSchema), SongController.checkDuplicate);
router.get('/:id/audio', SongController.streamAudio);
router.get('/:id/artwork', SongController.streamArtwork);
router.get('/:id/download', SongController.downloadSong);
router.get('/:id', SongController.getSongById);
router.post('/', requireMutationAuth, validateBody(createSongSchema), SongController.createSong);
router.put('/:id', requireMutationAuth, validateBody(updateSongSchema), SongController.updateSong);
router.delete('/all', requireProductionAdmin, SongController.deleteAllSongs);
router.delete('/', requireProductionAdmin, SongController.deleteAllSongs);
router.delete('/:id', requireMutationAuth, SongController.deleteSong);

export default router;
