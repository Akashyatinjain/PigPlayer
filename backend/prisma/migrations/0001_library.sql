CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "albumArtist" TEXT,
    "genre" TEXT,
    "duration" REAL NOT NULL DEFAULT 0,
    "trackNumber" INTEGER,
    "discNumber" INTEGER,
    "releaseYear" INTEGER,
    "composer" TEXT,
    "audioFileName" TEXT,
    "audioRelativePath" TEXT NOT NULL,
    "coverFileName" TEXT,
    "coverRelativePath" TEXT,
    "audioUrl" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "bitrate" INTEGER,
    "originalFileName" TEXT,
    "isDownloadable" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Song_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlaylistSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaylistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlayHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "songId" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationPlayed" REAL,
    CONSTRAINT "PlayHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE INDEX IF NOT EXISTS "Song_title_idx" ON "Song"("title");

CREATE INDEX IF NOT EXISTS "Song_artist_idx" ON "Song"("artist");

CREATE INDEX IF NOT EXISTS "Song_album_idx" ON "Song"("album");

CREATE INDEX IF NOT EXISTS "Song_genre_idx" ON "Song"("genre");

CREATE INDEX IF NOT EXISTS "Song_fileHash_idx" ON "Song"("fileHash");

CREATE UNIQUE INDEX IF NOT EXISTS "PlaylistSong_playlistId_songId_key" ON "PlaylistSong"("playlistId", "songId");

CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_songId_key" ON "Favorite"("userId", "songId");

CREATE INDEX IF NOT EXISTS "PlayHistory_playedAt_idx" ON "PlayHistory"("playedAt");
