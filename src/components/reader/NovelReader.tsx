"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BootSequence } from "@/components/terminal/BootSequence";
import { EntrySidebar } from "@/components/reader/EntrySidebar";
import { NovelRenderer } from "@/components/reader/NovelRenderer";
import { TerminalInput } from "@/components/terminal/TerminalInput";
import { StatusBar } from "@/components/ui/StatusBar";
import { getSessionId } from "@/lib/session";
import type { BootMessage, Entry, Novel } from "@/types";

interface NovelReaderProps {
  novel: Novel;
}

export function NovelReader({ novel }: NovelReaderProps) {
  const [phase, setPhase] = useState<"boot" | "reading">("boot");
  const [entries, setEntries] = useState<(Entry & { accessible?: boolean })[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean | string | number>>({});
  const [unlockedEntries, setUnlockedEntries] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [systemMessages, setSystemMessages] = useState<string[]>([]);

  // Boot messages from novel config
  const bootMessages: BootMessage[] = JSON.parse(novel.boot_sequence || "[]");

  // Initialize session
  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);

    // Load user state
    fetch(`/api/user-state?session_id=${sid}&novel_id=${novel.id}`)
      .then((r) => r.json())
      .then(({ state }) => {
        if (state) {
          setFlags(JSON.parse(state.flags || "{}"));
          setUnlockedEntries(JSON.parse(state.unlocked_entries || "[]"));
          setProgress(state.progress || 0);
        }
      })
      .catch(console.error);
  }, [novel.id]);

  // Load entries
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/entries?novel_id=${novel.id}&session_id=${sessionId}`)
      .then((r) => r.json())
      .then(({ entries }) => {
        setEntries(entries || []);
        // Auto-select first accessible entry
        const first = (entries || []).find(
          (e: Entry & { accessible?: boolean }) => !e.is_locked || e.accessible
        );
        if (first) setCurrentEntry(first);
      })
      .catch(console.error);
  }, [novel.id, sessionId]);

  const handleBootComplete = useCallback(() => {
    setPhase("reading");
  }, []);

  const handleSelectEntry = useCallback(
    async (entry: Entry) => {
      setCurrentEntry(entry);
      if (!unlockedEntries.includes(entry.id)) {
        // Mark as read and apply unlock flags
        try {
          const res = await fetch("/api/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              novel_id: novel.id,
              entry_id: entry.id,
            }),
          });
          const data = await res.json();
          setFlags(data.flags || {});
          setUnlockedEntries(data.unlocked_entries || []);
          setProgress(data.progress || 0);

          // Refresh entries in case new ones unlocked
          const entriesRes = await fetch(
            `/api/entries?novel_id=${novel.id}&session_id=${sessionId}`
          );
          const entriesData = await entriesRes.json();
          setEntries(entriesData.entries || []);
        } catch (e) {
          console.error(e);
        }
      }
    },
    [sessionId, novel.id, unlockedEntries]
  );

  const handleChoice = useCallback(
    async (choice: string, variable: string) => {
      // Record choice as flag
      const flagKey = `choice_${variable}_${choice.replace(/\s+/g, "_")}`;
      try {
        const res = await fetch("/api/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            novel_id: novel.id,
            flag_key: flagKey,
            flag_value: true,
          }),
        });
        const data = await res.json();
        setFlags(data.flags || {});
      } catch (e) {
        console.error(e);
      }
    },
    [sessionId, novel.id]
  );

  const handleInput = useCallback(
    async (input: string) => {
      setInputHistory((prev) => [input, ...prev].slice(0, 50));

      // Simple command parsing
      const cmd = input.toLowerCase().trim();

      // Check for unlock codes
      if (cmd.startsWith("unlock ") || cmd.startsWith("解除 ")) {
        const code = input.slice(cmd.startsWith("unlock ") ? 7 : 3).trim();
        try {
          const res = await fetch("/api/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              novel_id: novel.id,
              flag_key: `code_${code}`,
              flag_value: true,
            }),
          });
          const data = await res.json();
          setFlags(data.flags || {});
          setUnlockedEntries(data.unlocked_entries || []);
          setProgress(data.progress || 0);
          setSystemMessages((prev) => [
            ...prev,
            `>> コード "${code}" を処理しました`,
          ]);

          // Refresh entries
          const entriesRes = await fetch(
            `/api/entries?novel_id=${novel.id}&session_id=${sessionId}`
          );
          const entriesData = await entriesRes.json();
          setEntries(entriesData.entries || []);
        } catch (e) {
          console.error(e);
        }
        return;
      }

      if (cmd === "help" || cmd === "ヘルプ") {
        setSystemMessages((prev) => [
          ...prev,
          "利用可能なコマンド: help / clear / unlock <コード>",
        ]);
        return;
      }

      if (cmd === "clear" || cmd === "クリア") {
        setSystemMessages([]);
        return;
      }

      // Pass as message to current context
      setSystemMessages((prev) => [
        ...prev,
        `>> "${input}" — 認識できないコマンドです`,
      ]);
    },
    [sessionId, novel.id]
  );

  return (
    <>
      {/* Scanline overlay */}
      <div className="scanlines" />
      <div className="noise-overlay" />

      {/* Boot sequence */}
      <AnimatePresence>
        {phase === "boot" && (
          <BootSequence messages={bootMessages} onComplete={handleBootComplete} />
        )}
      </AnimatePresence>

      {/* Main UI */}
      {phase === "reading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col h-screen crt"
        >
          {/* Status bar */}
          <StatusBar
            title={novel.title}
            progress={progress}
            entryTitle={currentEntry?.title}
            entryType={currentEntry?.entry_type}
            sessionId={sessionId}
          />

          {/* Main layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <EntrySidebar
              entries={entries}
              currentEntryId={currentEntry?.id}
              unlockedEntries={unlockedEntries}
              onSelectEntry={handleSelectEntry}
            />

            {/* Reading area */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Entry header */}
              {currentEntry && (
                <div className="px-6 py-3 border-b border-border bg-surface-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted uppercase tracking-widest mr-2">
                        {currentEntry.entry_type}
                      </span>
                      <span className="text-primary text-sm font-bold">
                        {currentEntry.title}
                      </span>
                    </div>
                    {currentEntry.scp_class && (
                      <span
                        className={`text-xs px-2 py-0.5 border ${
                          currentEntry.scp_class === "Keter"
                            ? "border-error text-error"
                            : currentEntry.scp_class === "Euclid"
                            ? "border-warn text-warn"
                            : "border-primary text-primary"
                        }`}
                      >
                        ◈ {currentEntry.scp_class}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-hidden px-6 py-5">
                {currentEntry ? (
                  <NovelRenderer
                    key={currentEntry.id}
                    content={currentEntry.content}
                    entryType={currentEntry.entry_type}
                    onChoice={handleChoice}
                    corruptionLevel={flags["corruption_level"] as number || 0}
                    revealedFlags={flags}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                    <div className="text-center">
                      <div className="text-3xl mb-3 text-border">◈</div>
                      <div>エントリを選択してください</div>
                    </div>
                  </div>
                )}
              </div>

              {/* System messages */}
              <AnimatePresence>
                {systemMessages.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border px-4 py-2 bg-surface max-h-24 overflow-y-auto"
                  >
                    {systemMessages.slice(-3).map((msg, i) => (
                      <div key={i} className="text-xs text-dim font-mono">
                        {msg}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Terminal input */}
              <TerminalInput
                onSubmit={handleInput}
                history={inputHistory}
                placeholder="コマンドを入力... (help で一覧)"
              />
            </main>
          </div>
        </motion.div>
      )}
    </>
  );
}
