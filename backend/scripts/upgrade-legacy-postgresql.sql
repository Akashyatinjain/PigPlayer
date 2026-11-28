-- One-time upgrade for the legacy public schema initialized with Prisma db push.
-- Both SET NOT NULL statements must succeed before the remaining changes are applied.
BEGIN;

ALTER TABLE public."Song" ALTER COLUMN "audioRelativePath" SET NOT NULL;
ALTER TABLE public."Favorite" ALTER COLUMN "userId" SET NOT NULL;

CREATE TABLE public."AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AuthSession_userId_expiresAt_idx" ON public."AuthSession"("userId", "expiresAt");
CREATE INDEX "Song_createdAt_id_idx" ON public."Song"("createdAt", "id");
CREATE INDEX "Song_audioRelativePath_idx" ON public."Song"("audioRelativePath");
CREATE INDEX "Song_coverRelativePath_idx" ON public."Song"("coverRelativePath");
CREATE INDEX "Playlist_userId_updatedAt_idx" ON public."Playlist"("userId", "updatedAt");
CREATE INDEX "PlaylistSong_playlistId_position_idx" ON public."PlaylistSong"("playlistId", "position");
CREATE INDEX "PlaylistSong_songId_idx" ON public."PlaylistSong"("songId");
CREATE INDEX "Favorite_userId_createdAt_idx" ON public."Favorite"("userId", "createdAt");
CREATE INDEX "Favorite_songId_idx" ON public."Favorite"("songId");
CREATE INDEX "PlayHistory_userId_playedAt_idx" ON public."PlayHistory"("userId", "playedAt");
CREATE INDEX "PlayHistory_songId_idx" ON public."PlayHistory"("songId");

COMMIT;
