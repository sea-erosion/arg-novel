"use client";

import { motion } from "framer-motion";

interface StatusBarProps {
  title: string;
  progress: number;
  entryTitle?: string;
  entryType?: string;
  sessionId?: string;
}

export function StatusBar({
  title,
  progress,
  entryTitle,
  entryType,
  sessionId,
}: StatusBarProps) {
  return (
    <div
      className="border-b border-border bg-surface-2 px-4 py-2 flex items-center gap-4 text-xs font-mono"
      style={{ minHeight: "36px" }}
    >
      {/* Device name */}
      <span className="text-primary font-bold tracking-wider shrink-0">{title}</span>

      <span className="text-border-bright select-none">|</span>

      {/* Entry info */}
      {entryTitle && (
        <>
          <span className="text-dim truncate max-w-48">
            {entryType && (
              <span className="text-muted mr-1">[{entryType.toUpperCase()}]</span>
            )}
            {entryTitle}
          </span>
          <span className="text-border-bright select-none">|</span>
        </>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted">復元率</span>
        <div className="w-20 h-1.5 bg-surface overflow-hidden border border-border">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-primary-dim tabular-nums">{progress}%</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session ID */}
      {sessionId && (
        <span className="text-muted truncate max-w-24">
          SID:{sessionId.slice(0, 8)}
        </span>
      )}

      {/* Live indicator */}
      <span className="flex items-center gap-1 text-primary shrink-0">
        <span
          className="w-1.5 h-1.5 bg-primary rounded-full"
          style={{ animation: "blink-cursor 2s step-end infinite" }}
        />
        LIVE
      </span>
    </div>
  );
}
