import api from '@/lib/api';

export const backupService = {
  async list() {
    const res = await api.get('/backups');
    return res.data.data || [];
  },

  async create(includeMedia = true) {
    const res = await api.post('/backups', { includeMedia });
    return res.data.data;
  },

  async restore(fileName: string, confirmReplace = false) {
    const res = await api.post('/backups/restore', { fileName, confirmReplace });
    return res.data.data;
  },

  async exportLibrary() {
    const res = await api.get('/backups/export');
    const blob = new Blob([JSON.stringify(res.data.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'piggyplayer-library.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  async importLibrary(library: unknown, mode: 'merge' | 'replace' = 'merge') {
    const res = await api.post('/backups/import', { library, mode });
    return res.data.data;
  },
};
