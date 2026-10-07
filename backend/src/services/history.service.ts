import { HistoryRepository } from '../repositories/history.repository';

export class HistoryService {
  static async listHistory(userId?: string) {
    return HistoryRepository.findByUser(userId);
  }

  static async recordPlay(songId: string, userId?: string, durationPlayed?: number) {
    return HistoryRepository.recordPlay(songId, userId, durationPlayed);
  }

  static async clearHistory(userId?: string) {
    return HistoryRepository.clearHistory(userId);
  }
}
