import * as mm from "music-metadata-browser";

export interface ExtractedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  trackNumber?: number;
  discNumber?: number;
  year?: number;
  duration: number; // seconds
  bitrate?: number;
  format: string;
  fileSize: number;
  fileHash?: string;
  coverBlobUrl?: string;
  coverBlob?: Blob;
  hasEmbeddedArtwork: boolean;
}

/**
 * Intelligent file name parser fallback when ID3/audio tags are absent or empty
 */
function parseFilenameFallback(filename: string): {
  title: string;
  artist: string;
  album: string;
  trackNumber?: number;
} {
  // Strip extension
  const clean = filename.replace(/\.[^/.]+$/, "").trim();

  // Pattern: "01 - Artist - Title" or "01. Artist - Title"
  const trackNumMatch = clean.match(/^(\d{1,3})[\s._-]+(.+)$/);
  let remainder = clean;
  let trackNumber: number | undefined;

  if (trackNumMatch) {
    trackNumber = parseInt(trackNumMatch[1], 10);
    remainder = trackNumMatch[2].trim();
  }

  // Pattern: "Artist - Title"
  if (remainder.includes(" - ")) {
    const parts = remainder.split(" - ");
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(" - ").trim();
      return {
        artist: artist || "Unknown Artist",
        title: title || remainder,
        album: "Single",
        trackNumber,
      };
    }
  }

  // Pattern: "Artist _ Title"
  if (remainder.includes(" _ ")) {
    const parts = remainder.split(" _ ");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim() || "Unknown Artist",
        title: parts.slice(1).join(" ").trim() || remainder,
        album: "Single",
        trackNumber,
      };
    }
  }

  // Fallback to title as clean filename
  const formattedTitle = remainder
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: formattedTitle || "Unknown Track",
    artist: "Unknown Artist",
    album: "Soundify Library",
    trackNumber,
  };
}

/**
 * Fallback to read audio duration using the browser's HTMLAudioElement
 */
function getDurationFromAudioElement(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        audio.removeAttribute("src");
      };

      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        cleanup();
        resolve(!isNaN(dur) && isFinite(dur) ? Math.round(dur) : 0);
      };

      audio.onerror = () => {
        cleanup();
        resolve(0);
      };

      // Timeout fallback after 3 seconds
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 3000);
    } catch {
      resolve(0);
    }
  });
}

/**
 * Extracts rich metadata (ID3, Vorbis, MP4 tags, embedded cover art) from an audio file.
 */
export async function extractAudioMetadata(
  file: File
): Promise<ExtractedAudioMetadata> {
  const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
  const format = extMatch ? extMatch[1].toLowerCase() : "mp3";
  const fallback = parseFilenameFallback(file.name);

  let title = fallback.title;
  let artist = fallback.artist;
  let album = fallback.album;
  let albumArtist: string | undefined;
  let genre: string | undefined;
  let trackNumber: number | undefined = fallback.trackNumber;
  let discNumber: number | undefined;
  let year: number | undefined;
  let duration = 0;
  let bitrate: number | undefined;
  let coverBlobUrl: string | undefined;
  let coverBlob: Blob | undefined;
  let hasEmbeddedArtwork = false;

  try {
    const parsed = await mm.parseBlob(file, {
      duration: true,
      skipCovers: false,
    });

    const common = parsed.common;
    const formatInfo = parsed.format;

    if (common.title && common.title.trim()) {
      title = common.title.trim();
    }
    if (common.artist && common.artist.trim()) {
      artist = common.artist.trim();
    }
    if (common.album && common.album.trim()) {
      album = common.album.trim();
    }
    if (common.albumartist && common.albumartist.trim()) {
      albumArtist = common.albumartist.trim();
    }
    if (common.genre && common.genre.length > 0) {
      genre = common.genre.join(", ");
    }
    if (common.year) {
      year = common.year;
    }
    if (common.track?.no) {
      trackNumber = common.track.no;
    }
    if (common.disk?.no) {
      discNumber = common.disk.no;
    }

    if (formatInfo.duration && formatInfo.duration > 0) {
      duration = Math.round(formatInfo.duration);
    }
    if (formatInfo.bitrate) {
      bitrate = Math.round(formatInfo.bitrate / 1000); // kbps
    }

    // Extract Embedded Artwork
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      coverBlob = new Blob([pic.data as BlobPart], { type: pic.format });
      coverBlobUrl = URL.createObjectURL(coverBlob);
      hasEmbeddedArtwork = true;
    }
  } catch (err) {
    console.warn("Failed to extract ID3 tags via music-metadata-browser:", err);
  }

  // If duration was not found via metadata tags, use HTMLAudioElement
  if (!duration || duration <= 0) {
    duration = await getDurationFromAudioElement(file);
  }

  // Calculate SHA-256 file hash for duplicate detection
  let fileHash: string | undefined;
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const buffer = await file.slice(0, 5 * 1024 * 1024).arrayBuffer(); // Hash first 5MB or entire file for speed
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (err) {
    console.warn("Could not calculate file SHA-256 hash:", err);
  }

  return {
    title,
    artist,
    album,
    albumArtist,
    genre,
    trackNumber,
    discNumber,
    year,
    duration,
    bitrate,
    format,
    fileSize: file.size,
    fileHash,
    coverBlobUrl,
    coverBlob,
    hasEmbeddedArtwork,
  };
}
