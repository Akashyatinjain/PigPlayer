CREATE TABLE IF NOT EXISTS "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

CREATE INDEX IF NOT EXISTS "Song_createdAt_id_idx" ON "Song"("createdAt", "id");

CREATE INDEX IF NOT EXISTS "Song_audioRelativePath_idx" ON "Song"("audioRelativePath");

CREATE INDEX IF NOT EXISTS "Song_coverRelativePath_idx" ON "Song"("coverRelativePath");

CREATE INDEX IF NOT EXISTS "Playlist_userId_updatedAt_idx" ON "Playlist"("userId", "updatedAt");

CREATE INDEX IF NOT EXISTS "PlaylistSong_playlistId_position_idx" ON "PlaylistSong"("playlistId", "position");

CREATE INDEX IF NOT EXISTS "PlaylistSong_songId_idx" ON "PlaylistSong"("songId");

CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Favorite_songId_idx" ON "Favorite"("songId");

CREATE INDEX IF NOT EXISTS "PlayHistory_userId_playedAt_idx" ON "PlayHistory"("userId", "playedAt");

CREATE INDEX IF NOT EXISTS "PlayHistory_songId_idx" ON "PlayHistory"("songId");
