"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

export default function ShortcutsModal() {
  const { isShortcutsOpen, setIsShortcutsOpen } = useLibrary();

  if (!isShortcutsOpen) return null;

  const handleClose = () => {
    triggerHaptic("light");
    closeWithHistory(() => setIsShortcutsOpen(false));
  };

  const shortcuts = [
    { key: "Space", desc: "Play / Pause" },
    { key: "← / →", desc: "Seek backward / forward 5s" },
    { key: "↑ / ↓", desc: "Volume up / down 5%" },
    { key: "M", desc: "Toggle Mute" },
    { key: "N", desc: "Next Track" },
    { key: "P", desc: "Previous Track" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
      <div className="mobile-safe-bottom w-full max-w-sm bg-[#10141d] border border-[#232b38] rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 text-[#f5f7fa]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-2 md:hidden" />

        <div className="px-5 py-4 border-b border-[#1c232e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-[#181f2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-xs py-1"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-[#181f2a] border border-[#293444] rounded-lg font-mono text-[11px] text-blue-400 font-semibold shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
