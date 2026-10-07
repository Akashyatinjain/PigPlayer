import { Router } from 'express';
import { PlaylistController } from '../controllers/playlist.controller';
import { optionalAuth, authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addSongToPlaylistSchema,
  reorderPlaylistSchema,
} from '../validators/playlist.validator';

const router = Router();

router.get('/', optionalAuth, PlaylistController.listPlaylists);
router.get('/:id', PlaylistController.getPlaylistById);
router.post('/', optionalAuth, validateBody(createPlaylistSchema), PlaylistController.createPlaylist);
router.put('/:id', optionalAuth, validateBody(updatePlaylistSchema), PlaylistController.updatePlaylist);
router.delete('/:id', optionalAuth, PlaylistController.deletePlaylist);

router.post('/:id/songs', optionalAuth, validateBody(addSongToPlaylistSchema), PlaylistController.addSong);
router.delete('/:id/songs/:songId', optionalAuth, PlaylistController.removeSong);
router.put('/:id/reorder', optionalAuth, validateBody(reorderPlaylistSchema), PlaylistController.reorderSongs);

export default router;
