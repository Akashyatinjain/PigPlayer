-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "albumArtist" TEXT,
    "genre" TEXT,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistSong" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "songId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationPlayed" DOUBLE PRECISION,

    CONSTRAINT "PlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Song_title_idx" ON "Song"("title");

-- CreateIndex
CREATE INDEX "Song_artist_idx" ON "Song"("artist");

-- CreateIndex
CREATE INDEX "Song_album_idx" ON "Song"("album");

-- CreateIndex
CREATE INDEX "Song_genre_idx" ON "Song"("genre");

-- CreateIndex
CREATE INDEX "Song_fileHash_idx" ON "Song"("fileHash");

-- CreateIndex
CREATE INDEX "Song_createdAt_id_idx" ON "Song"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Song_audioRelativePath_idx" ON "Song"("audioRelativePath");

-- CreateIndex
CREATE INDEX "Song_coverRelativePath_idx" ON "Song"("coverRelativePath");

-- CreateIndex
CREATE INDEX "Playlist_userId_updatedAt_idx" ON "Playlist"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PlaylistSong_playlistId_position_idx" ON "PlaylistSong"("playlistId", "position");

-- CreateIndex
CREATE INDEX "PlaylistSong_songId_idx" ON "PlaylistSong"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistSong_playlistId_songId_key" ON "PlaylistSong"("playlistId", "songId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_songId_idx" ON "Favorite"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_songId_key" ON "Favorite"("userId", "songId");

-- CreateIndex
CREATE INDEX "PlayHistory_playedAt_idx" ON "PlayHistory"("playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_userId_playedAt_idx" ON "PlayHistory"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_songId_idx" ON "PlayHistory"("songId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistSong" ADD CONSTRAINT "PlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistSong" ADD CONSTRAINT "PlaylistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
