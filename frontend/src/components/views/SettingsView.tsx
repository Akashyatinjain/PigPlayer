"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  HardDrive,
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Archive,
  Music2,
  Heart,
  History,
  Disc3,
  Users,
  LogOut,
} from "lucide-react";
import { songService } from "@/services/song.service";
import { backupService } from "@/services/backup.service";
import { historyService } from "@/services/history.service";
import { useLibrary } from "@/context/LibraryContext";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

interface LibraryStats {
  totalSongs: number;
  totalArtists: number;
  totalAlbums: number;
  totalPlaylists: number;
  favoriteSongs: number;
  listeningHistoryCount: number;
  storageUsed: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function SettingsView() {
  const { refreshLibrary, deleteAllSongs } = useLibrary();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [backups, setBackups] = useState<
    Array<{ fileName: string; size: number; createdAt: string }>
  >([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [s, b] = await Promise.all([
        songService.getStats(),
        backupService.list(),
      ]);
      setStats(s);
      setBackups(b);
    } catch {
      setMessage("Could not load settings — is the backend running?");
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      await load();
      await refreshLibrary();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#090a0f] tracking-tight">Profile & settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Local library, backups, and storage — everything stays on this machine.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-blue-500">
            {isAuthenticated && user ? user.name.charAt(0).toUpperCase() : "G"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{isAuthenticated && user ? user.name : "Listening as guest"}</p>
            <p className="truncate text-xs text-slate-500">{isAuthenticated && user ? user.email : "Your library stays on this device"}</p>
          </div>
          {isAuthenticated && <button type="button" onClick={() => logout()} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>}
          {!isAuthenticated && <Link href="/login" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-blue-500 hover:bg-blue-50">Sign in</Link>}
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      {/* Storage location */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Storage Location</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Local data directory</p>
            <p className="text-xs text-slate-500 font-mono mt-1 break-all">
              ./data/piggyplayer.db · ./data/audio · ./data/artwork · ./data/backups
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Library Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Songs", value: stats?.totalSongs ?? "—", icon: Music2 },
            { label: "Artists", value: stats?.totalArtists ?? "—", icon: Users },
            { label: "Albums", value: stats?.totalAlbums ?? "—", icon: Disc3 },
            { label: "Playlists", value: stats?.totalPlaylists ?? "—", icon: Database },
            { label: "Favorites", value: stats?.favoriteSongs ?? "—", icon: Heart },
            { label: "History", value: stats?.listeningHistoryCount ?? "—", icon: History },
            {
              label: "Storage",
              value: stats ? formatBytes(stats.storageUsed) : "—",
              icon: HardDrive,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-1"
            >
              <item.icon className="w-4 h-4 text-blue-600" />
              <p className="text-lg font-bold text-slate-900">{item.value}</p>
              <p className="text-[11px] text-slate-500 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Backup / Export */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Backup & Portability</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          <ActionRow
            icon={Archive}
            title="Create backup"
            desc="Zip SQLite + media into data/backups"
            busy={busy === "backup"}
            onClick={() =>
              run("backup", async () => {
                const b = await backupService.create(true);
                setMessage(`Backup created: ${b.fileName}`);
              })
            }
          />
          <ActionRow
            icon={Download}
            title="Export library JSON"
            desc="Metadata only — songs, playlists, favorites, history"
            busy={busy === "export"}
            onClick={() =>
              run("export", async () => {
                await backupService.exportLibrary();
                setMessage("Library JSON downloaded");
              })
            }
          />
          <ActionRow
            icon={Upload}
            title="Import library JSON"
            desc="Merge metadata from a previous export"
            busy={busy === "import"}
            onClick={() => fileRef.current?.click()}
          />
          <ActionRow
            icon={Trash2}
            title="Clear listening history"
            desc="Removes recently played entries only"
            busy={busy === "history"}
            danger
            onClick={() =>
              run("history", async () => {
                if (!confirm("Clear all listening history?")) return;
                await historyService.clearHistory();
                setMessage("History cleared");
              })
            }
          />
          <ActionRow
            icon={RefreshCw}
            title="Refresh library"
            desc="Reload songs, playlists, and favorites from SQLite"
            busy={busy === "refresh"}
            onClick={() =>
              run("refresh", async () => {
                await refreshLibrary();
                setMessage("Library refreshed");
              })
            }
          />
          <ActionRow
            icon={Trash2}
            title="Delete all songs"
            desc="Permanently wipe all songs from the library and storage"
            danger
            busy={busy === "delete-all"}
            onClick={() =>
              run("delete-all", async () => {
                if (!confirm("Are you sure you want to delete ALL songs? This action cannot be undone.")) return;
                await deleteAllSongs();
                setMessage("All songs deleted");
              })
            }
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            run("import", async () => {
              const text = await file.text();
              const json = JSON.parse(text);
              const result = await backupService.importLibrary(json, "merge");
              setMessage(`Imported ${result.importedSongs} songs`);
            });
            e.target.value = "";
          }}
        />
      </section>

      {/* Existing backups */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Local Backups</h2>
        {backups.length === 0 ? (
          <p className="text-sm text-slate-500">No backups yet.</p>
        ) : (
          <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {backups.map((b) => (
              <li key={b.fileName} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{b.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(b.size)} · {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  disabled={busy === `restore-${b.fileName}`}
                  onClick={() => {
                    if (
                      !confirm(
                        "Restore this backup? A safety copy of the current database will be kept. Confirm again to apply."
                      )
                    )
                      return;
                    run(`restore-${b.fileName}`, async () => {
                      const preview = await backupService.restore(b.fileName, false);
                      if (preview.preview) {
                        const ok = confirm(
                          "Preview OK. Apply restore now? Backend may need a restart afterward."
                        );
                        if (!ok) return;
                        await backupService.restore(b.fileName, true);
                        setMessage("Backup restored");
                      }
                    });
                  }}
                  className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  desc,
  onClick,
  busy,
  danger,
}: {
  icon: typeof Archive;
  title: string;
  desc: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors disabled:opacity-60"
    >
      <Icon className={`w-5 h-5 shrink-0 ${danger ? "text-red-500" : "text-blue-600"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? "text-red-700" : "text-slate-800"}`}>
          {busy ? "Working…" : title}
        </p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </button>
  );
}
