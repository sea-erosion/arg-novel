"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { findCommand, suggestCommands, COMMANDS } from "@/lib/terminal-commands";
import type { OutputLine } from "@/lib/terminal-commands";

// ─── types ────────────────────────────────────────────────────
type HistoryEntry = {
  input?: string;   // undefined = system output (no prompt prefix)
  lines: OutputLine[];
};

const DEFAULT_STATE = {
  flags: {} as Record<string, boolean>,
  accessLevel: 1,
  division: "未配属",
  sessionId: "TERM-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
};

// ─── color map ────────────────────────────────────────────────
const COLOR: Record<string, string> = {
  primary:   "var(--color-primary)",
  secondary: "var(--color-secondary)",
  warn:      "var(--color-warn)",
  error:     "var(--color-error)",
  dim:       "var(--color-text-dim)",
  accent:    "var(--color-accent)",
  text:      "var(--color-text)",
};

function Line({ line }: { line: OutputLine }) {
  const color = COLOR[line.color ?? "text"] ?? COLOR.text;
  return (
    <div
      className={line.blink ? "blink-line" : ""}
      style={{
        color,
        whiteSpace: line.pre ? "pre" : "normal",
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        lineHeight: "1.6",
        padding: "0.5px 0",
        wordBreak: "break-all",
      }}
    >
      {line.text === "" ? "\u00A0" : line.text}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────
export default function TerminalPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [suggestion, setSuggestion] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(DEFAULT_STATE);

  // Boot message
  useEffect(() => {
    const boot: OutputLine[] = [
      { text: "╔══════════════════════════════════════════════════════╗", color: "primary" },
      { text: "║  KAI-TERMINAL v2.3.1-emergency                      ║", color: "primary" },
      { text: "║  海蝕現象収束機関 九重支部 — 内部端末システム        ║", color: "primary" },
      { text: "╚══════════════════════════════════════════════════════╝", color: "primary" },
      { text: "" },
      { text: `  セッションID: ${stateRef.current.sessionId}`, color: "dim" },
      { text: `  アクセスレベル: ${stateRef.current.accessLevel}`, color: "dim" },
      { text: "" },
      { text: "  [警告] 外部ネットワーク遮断中", color: "warn" },
      { text: "  [警告] 個人情報プロテクト適用中", color: "warn" },
      { text: "" },
      { text: '  "help" でコマンド一覧を表示', color: "dim" },
      { text: '  Tab: 補完  ↑↓: 履歴  Ctrl+L: クリア', color: "dim" },
      { text: "" },
    ];
    setHistory([{ lines: boot }]);
    inputRef.current?.focus();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Tab completion suggestion
  useEffect(() => {
    if (!input.trim() || input.includes(" ")) {
      setSuggestion("");
      return;
    }
    const matches = suggestCommands(input);
    setSuggestion(matches[0]?.name ?? "");
  }, [input]);

  const runCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const [cmd, ...args] = trimmed.split(/\s+/);
    const def = findCommand(cmd);

    let resultLines: OutputLine[];
    let clear = false;

    if (!def) {
      resultLines = [
        { text: `コマンドが見つかりません: ${cmd}`, color: "error" },
        { text: `  ヒント: "help" でコマンド一覧  Tab で補完`, color: "dim" },
      ];
    } else {
      const result = def.run(args, stateRef.current);
      resultLines = result.lines;
      clear = result.clear ?? false;
    }

    const entry: HistoryEntry = { input: trimmed, lines: resultLines };

    if (clear) {
      setHistory([{ lines: resultLines }]);
    } else {
      setHistory((prev) => [...prev, entry]);
    }

    setCmdHistory((prev) => [trimmed, ...prev].slice(0, 100));
    setHistIdx(-1);
    setInput("");
    setSuggestion("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runCommand(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) setInput(suggestion + " ");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(newIdx);
      setInput(cmdHistory[newIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = Math.max(histIdx - 1, -1);
      setHistIdx(newIdx);
      setInput(newIdx === -1 ? "" : cmdHistory[newIdx] ?? "");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
      setInput("");
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setHistory((prev) => [...prev, {
        input: input,
        lines: [{ text: "^C", color: "warn" }],
      }]);
      setInput("");
    }
  }, [input, suggestion, histIdx, cmdHistory, runCommand]);

  // Click anywhere → focus input
  const focusInput = () => inputRef.current?.focus();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", fontFamily: "var(--font-mono)" }}
      onClick={focusInput}
    >
      {/* Overlays */}
      <div className="scanlines" />
      <div className="noise-overlay" />

      {/* Header bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2 border-b z-10 relative"
        style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border-bright)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--color-primary)", fontSize: "0.75rem", letterSpacing: "0.15em" }}>
            KAI-TERMINAL
          </span>
          <span style={{ color: "var(--color-text-dim)", fontSize: "0.65rem" }}>
            v2.3.1-emergency
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "var(--color-warn)", fontSize: "0.65rem" }}>
            ● OFFLINE
          </span>
          <Link
            href="/"
            style={{ color: "var(--color-text-dim)", fontSize: "0.65rem", textDecoration: "none" }}
            className="hover:text-primary transition-colors"
          >
            [← 戻る]
          </Link>
        </div>
      </div>

      {/* Output area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 relative z-10"
        style={{ minHeight: 0 }}
      >
        {history.map((entry, ei) => (
          <div key={ei} className="mb-1">
            {/* Input echo */}
            {entry.input !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "2px" }}>
                <span style={{ color: "var(--color-primary)", fontSize: "0.8rem", userSelect: "none" }}>
                  &gt;&gt;
                </span>
                <span style={{ color: "var(--color-secondary)", fontSize: "0.8rem" }}>
                  {entry.input}
                </span>
              </div>
            )}
            {/* Output lines */}
            {entry.lines.map((line, li) => (
              <Line key={li} line={line} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 relative z-10"
        style={{ borderTop: `1px solid var(--color-border-bright)`, background: "var(--color-surface-2)" }}
        onClick={(e) => { e.stopPropagation(); focusInput(); }}
      >
        {/* Tab suggestion */}
        {suggestion && suggestion !== input.trim() && (
          <div
            style={{
              padding: "2px 16px",
              fontSize: "0.65rem",
              color: "var(--color-text-dim)",
              borderBottom: `1px solid var(--color-border)`,
            }}
          >
            Tab → <span style={{ color: "var(--color-primary)" }}>{suggestion}</span>
            {" "}— {COMMANDS.find((c) => c.name === suggestion)?.summary}
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-3">
          <span style={{ color: "var(--color-primary)", fontSize: "0.8rem", userSelect: "none", flexShrink: 0 }}>
            &gt;&gt;
          </span>
          <div style={{ position: "relative", flex: 1 }}>
            {/* Ghost suggestion overlay */}
            {suggestion && input && suggestion.startsWith(input) && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                  color: "transparent",
                  pointerEvents: "none",
                  whiteSpace: "pre",
                }}
              >
                {input}
                <span style={{ color: "var(--color-text-dim)" }}>
                  {suggestion.slice(input.length)}
                </span>
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%",
                background: "transparent",
                outline: "none",
                border: "none",
                color: "var(--color-secondary)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                caretColor: "var(--color-primary)",
                position: "relative",
                zIndex: 1,
              }}
              placeholder="コマンドを入力... (help / Tab補完 / ↑↓履歴)"
            />
          </div>
          {input && (
            <button
              onClick={(e) => { e.stopPropagation(); runCommand(input); }}
              style={{
                fontSize: "0.65rem",
                color: "var(--color-secondary)",
                border: `1px solid var(--color-secondary)`,
                padding: "2px 8px",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              EXEC
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink-line {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .blink-line { animation: blink-line 1s step-end infinite; }
      `}</style>
    </div>
  );
}
