"use client";

import { motion } from "framer-motion";
import type { Entry } from "@/types";

interface EntrySidebarProps {
  entries: (Entry & { accessible?: boolean })[];
  currentEntryId?: string;
  unlockedEntries: string[];
  onSelectEntry: (entry: Entry) => void;
}

const ENTRY_TYPE_ICONS: Record<string, string> = {
  diary: "◉",
  log: "◈",
  system: "◆",
  dialogue: "◇",
  scp_record: "▣",
};

export function EntrySidebar({
  entries,
  currentEntryId,
  unlockedEntries,
  onSelectEntry,
}: EntrySidebarProps) {
  return (
    <aside
      className="w-56 shrink-0 border-r border-border flex flex-col h-full"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-border bg-surface-2">
        <div className="text-xs text-muted uppercase tracking-widest mb-1">Index</div>
        <div className="text-primary text-xs font-bold">
          {unlockedEntries.length}/{entries.length} エントリ
        </div>
      </div>

      {/* Entry list */}
      <nav className="flex-1 overflow-y-auto py-1">
        {entries.map((entry, i) => {
          const isRead = unlockedEntries.includes(entry.id);
          const isCurrent = currentEntryId === entry.id;
          const isLocked = entry.is_locked && !entry.accessible;
          const icon = ENTRY_TYPE_ICONS[entry.entry_type] || "◉";

          return (
            <motion.button
              key={entry.id}
              onClick={() => !isLocked && onSelectEntry(entry)}
              disabled={isLocked}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 text-xs transition-all duration-150 relative ${
                isCurrent
                  ? "bg-primary-faint border-l-2 border-primary text-primary"
                  : isLocked
                  ? "cursor-not-allowed text-muted"
                  : isRead
                  ? "text-text-dim hover:bg-surface-2 hover:text-text border-l-2 border-transparent"
                  : "text-dim hover:bg-surface-2 hover:text-text-dim border-l-2 border-transparent"
              }`}
            >
              <span className={`shrink-0 mt-0.5 ${isCurrent ? "text-primary" : isLocked ? "text-muted" : "text-dim"}`}>
                {isLocked ? "▪" : icon}
              </span>
              <span className="flex-1 leading-4">
                <span className="block truncate">
                  {isLocked ? "????" : entry.title}
                </span>
                <span className={`text-xs ${isCurrent ? "text-primary-dim" : "text-muted"}`}>
                  {isLocked ? "[LOCKED]" : entry.entry_type.toUpperCase()}
                  {isRead && !isLocked && " ✓"}
                </span>
              </span>

              {/* Current indicator */}
              {isCurrent && (
                <motion.span
                  layoutId="entry-indicator"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-xs text-muted">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block" style={{
            animation: "blink-cursor 2s step-end infinite"
          }} />
          <span>ONLINE</span>
        </div>
      </div>
    </aside>
  );
}
