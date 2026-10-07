import { FavoriteRepository } from '../repositories/favorite.repository';

export class FavoriteService {
  static async listFavorites(userId?: string) {
    return FavoriteRepository.findByUser(userId);
  }

  static async addFavorite(songId: string, userId?: string) {
    return FavoriteRepository.addFavorite(songId, userId);
  }

  static async removeFavorite(songId: string, userId?: string) {
    return FavoriteRepository.removeFavorite(songId, userId);
  }

  static async isFavorite(songId: string, userId?: string) {
    return FavoriteRepository.isFavorite(songId, userId);
  }
}
