"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

export default function ShortcutsModal() {
  const { isShortcutsOpen, setIsShortcutsOpen } = useLibrary();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: "Space", desc: "Play / Pause" },
    { key: "← / →", desc: "Seek backward / forward 5s" },
    { key: "↑ / ↓", desc: "Volume up / down 5%" },
    { key: "M", desc: "Toggle Mute" },
    { key: "N", desc: "Next Track" },
    { key: "P", desc: "Previous Track" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-wide">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-xs py-1"
            >
              <span className="text-slate-600 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-md font-mono text-[11px] text-slate-900 font-semibold shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
