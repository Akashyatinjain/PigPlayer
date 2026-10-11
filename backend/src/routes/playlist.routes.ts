import { Router } from 'express';
import { PlaylistController } from '../controllers/playlist.controller';
import { optionalAuth, requireMutationAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addSongToPlaylistSchema,
  reorderPlaylistSchema,
} from '../validators/playlist.validator';

const router = Router();

router.get('/', optionalAuth, PlaylistController.listPlaylists);
router.get('/:id', optionalAuth, PlaylistController.getPlaylistById);
router.post('/', requireMutationAuth, validateBody(createPlaylistSchema), PlaylistController.createPlaylist);
router.put('/:id', requireMutationAuth, validateBody(updatePlaylistSchema), PlaylistController.updatePlaylist);
router.delete('/:id', requireMutationAuth, PlaylistController.deletePlaylist);

router.post('/:id/songs', requireMutationAuth, validateBody(addSongToPlaylistSchema), PlaylistController.addSong);
router.delete('/:id/songs/:songId', requireMutationAuth, PlaylistController.removeSong);
router.put('/:id/reorder', requireMutationAuth, validateBody(reorderPlaylistSchema), PlaylistController.reorderSongs);

export default router;
