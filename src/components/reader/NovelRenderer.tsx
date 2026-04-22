"use client";
// Edited: 2026-04-22

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { parseNovelContent } from "@/lib/parser";
import type { ParsedLine, ParsedSegment, CommandBranch } from "@/types";
import { InlineCard } from "@/components/ui/InlineCard";
import { CorruptedBlock } from "@/components/ui/GlitchText";

interface NovelRendererProps {
  content: string;
  entryType: string;
  onChoice?: (choice: string, variable: string) => void;
  onComplete?: () => void;
  /** Called when the reader submits a command on a command_input line */
  onCommandInput?: (input: string, variable: string, branches: CommandBranch[]) => void;
  /** Called when a command_input line enters the viewport and becomes the active prompt */
  onActivateCommandLine?: (lineIndex: number) => void;
  /** Index of the command_input line currently awaiting input, or null */
  pendingCommandLine?: number | null;
  corruptionLevel?: number;
  revealedFlags?: Record<string, boolean | string | number>;
}

// How many chars to reveal per tick for each line type
function getTypingSpeed(line: ParsedLine): number {
  switch (line.type) {
    case "system":    return 4;   // fast — machine-like
    case "char":      return 3;   // moderate — speech
    case "user_input":return 5;   // quick
    case "divider":   return 999; // instant
    case "blank":     return 999; // instant
    default:          return 3;
  }
}

// Interval (ms) between ticks
function getTickInterval(line: ParsedLine): number {
  switch (line.type) {
    case "system":    return 18;
    case "char":      return 28;
    case "user_input":return 20;
    default:          return 22;
  }
}

export function NovelRenderer({
  content,
  entryType,
  onChoice,
  onComplete,
  onCommandInput,
  onActivateCommandLine,
  pendingCommandLine = null,
  corruptionLevel = 0,
  revealedFlags = {},
}: NovelRendererProps) {
  const [lines, setLines] = useState<ParsedLine[]>([]);
  // revealed[i] = number of plain-text chars revealed in line i (-1 = not started, Infinity = done)
  const [revealed, setRevealed] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const completedRef = useRef(false); // fire onComplete only once per content

  // Parse on content change
  useEffect(() => {
    const parsed = parseNovelContent(content);
    setLines(parsed);
    setRevealed(new Array(parsed.length).fill(-1));
    rowRefs.current = new Array(parsed.length).fill(null);
    completedRef.current = false;
    // Clear any running timers from previous content
    activeTimers.current.forEach((t) => clearInterval(t));
    activeTimers.current.clear();
  }, [content]);

  // Detect when all lines are fully revealed
  useEffect(() => {
    if (completedRef.current) return;
    if (lines.length === 0) return;
    if (revealed.length !== lines.length) return;
    const allDone = revealed.every((r) => r === Infinity);
    if (allDone) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [revealed, lines, onComplete]);

  // Start typing animation for line i
  const startTyping = useCallback(
    (i: number, line: ParsedLine) => {
      // Already started or finished
      if (activeTimers.current.has(i)) return;
      setRevealed((prev) => {
        if (prev[i] !== -1) return prev; // already started
        const next = [...prev];
        next[i] = 0;
        return next;
      });

      const fullText = getPlainLength(line);
      // Instant lines
      if (fullText === 0 || getTypingSpeed(line) >= 999) {
        setRevealed((prev) => {
          const next = [...prev];
          next[i] = Infinity;
          return next;
        });
        return;
      }

      const speed = getTypingSpeed(line);
      const interval = getTickInterval(line);

      const timer = setInterval(() => {
        setRevealed((prev) => {
          const cur = prev[i] === -1 ? 0 : prev[i];
          const next = [...prev];
          const newVal = Math.min(cur + speed, fullText);
          next[i] = newVal;
          if (newVal >= fullText) {
            clearInterval(timer);
            activeTimers.current.delete(i);
            next[i] = Infinity;
          }
          return next;
        });
      }, interval);

      activeTimers.current.set(i, timer);
    },
    []
  );

  // Set up IntersectionObserver after lines are set
  useLayoutEffect(() => {
    if (lines.length === 0) return;

    const observers: IntersectionObserver[] = [];

    lines.forEach((line, i) => {
      const el = rowRefs.current[i];
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startTyping(i, line);
              if (line.type === "command_input") {
                onActivateCommandLine?.(i);
              }
              obs.disconnect(); // fire once
            }
          });
        },
        {
          root: containerRef.current,
          // Trigger when top edge of row enters the scroll container
          rootMargin: "0px 0px -8px 0px",
          threshold: 0,
        }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      activeTimers.current.forEach((t) => clearInterval(t));
      activeTimers.current.clear();
    };
  }, [lines, startTyping]);

  return (
    <div
      ref={containerRef}
      className="font-mono text-sm leading-7 space-y-0.5 overflow-y-auto"
      style={{ height: "calc(100vh - 220px)" }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          ref={(el) => { rowRefs.current[i] = el; }}
        >
          <RenderLine
            line={line}
            revealedChars={revealed[i] ?? -1}
            onChoice={onChoice}
            onCommandInput={onCommandInput}
            isActiveCommandLine={pendingCommandLine === i}
            corruptionLevel={corruptionLevel}
            revealedFlags={revealedFlags}
          />
        </div>
      ))}
      {/* Bottom padding so last line can scroll fully into view */}
      <div style={{ height: "40vh" }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Count total plain-text characters in a line (for typing progress) */
function getPlainLength(line: ParsedLine): number {
  if (line.type === "blank" || line.type === "divider" || line.type === "choice" || line.type === "command_input") return 0;
  const segs = "content" in line ? line.content : "prompt" in line ? line.prompt : [];
  return (segs as ParsedSegment[]).reduce((sum, seg) => {
    if (seg.type === "text") return sum + seg.content.length;
    if (seg.type === "ruby") return sum + seg.base.length;
    if (seg.type === "corrupted") return sum + (seg.original.length || 4);
    if (seg.type === "tag_link") return sum + seg.id.length + 4; // "▶ ID"
    return sum;
  }, 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// RenderLine
// ──────────────────────────────────────────────────────────────────────────────

interface RenderLineProps {
  line: ParsedLine;
  /** chars revealed so far; -1 = not started (invisible), Infinity = complete */
  revealedChars: number;
  onChoice?: (choice: string, variable: string) => void;
  onCommandInput?: (input: string, variable: string, branches: CommandBranch[]) => void;
  isActiveCommandLine?: boolean;
  corruptionLevel: number;
  revealedFlags: Record<string, boolean | string | number>;
}

function RenderLine({
  line,
  revealedChars,
  onChoice,
  onCommandInput,
  isActiveCommandLine = false,
  corruptionLevel,
  revealedFlags,
}: RenderLineProps) {
  // Not yet in viewport — reserve height so scroll works correctly
  if (revealedChars === -1) {
    return <div className="h-7 w-full" aria-hidden />;
  }

  switch (line.type) {
    case "blank":
      return <div className="h-3" />;

    case "divider":
      return (
        <div className="py-2 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted text-xs tracking-widest">──</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      );

    case "system":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-warn shrink-0 select-none">＃</span>
          <span className="text-warn">
            <RenderSegments
              segments={line.content}
              revealedChars={revealedChars}
              corruptionLevel={corruptionLevel}
              flags={revealedFlags}
            />
          </span>
        </div>
      );

    case "char":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-primary-dim shrink-0 select-none">＄</span>
          <span className="text-text">
            <RenderSegments
              segments={line.content}
              revealedChars={revealedChars}
              corruptionLevel={corruptionLevel}
              flags={revealedFlags}
            />
          </span>
        </div>
      );

    case "user_input":
      return (
        <div className="flex items-start gap-2 py-0.5 pl-4">
          <span className="text-secondary shrink-0 select-none">&gt;&gt;</span>
          <span className="text-secondary italic">
            <RenderSegments
              segments={line.prompt}
              revealedChars={revealedChars}
              corruptionLevel={corruptionLevel}
              flags={revealedFlags}
            />
          </span>
        </div>
      );

    case "choice":
      // Show choices only once their line is fully revealed
      return revealedChars === Infinity ? (
        <ChoiceButtons
          choices={line.choices}
          variable={line.variable}
          onChoice={onChoice}
        />
      ) : null;

    case "command_input":
      // Only show once this line is in viewport (revealedChars !== -1)
      return revealedChars !== -1 ? (
        <CommandInputLine
          variable={line.variable}
          hint={line.hint}
          branches={line.branches}
          isActive={isActiveCommandLine}
          onSubmit={onCommandInput}
        />
      ) : <div className="h-7 w-full" aria-hidden />;

    case "paragraph":
      return (
        <div className="py-0.5 leading-7 text-text-dim">
          <RenderSegments
            segments={line.content}
            revealedChars={revealedChars}
            corruptionLevel={corruptionLevel}
            flags={revealedFlags}
          />
        </div>
      );

    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RenderSegments — slices each segment according to revealedChars budget
// ──────────────────────────────────────────────────────────────────────────────

function RenderSegments({
  segments,
  revealedChars,
  corruptionLevel,
  flags,
}: {
  segments: ParsedSegment[];
  /** remaining budget of chars to show; Infinity = show all */
  revealedChars: number;
  corruptionLevel: number;
  flags: Record<string, boolean | string | number>;
}) {
  let budget = revealedChars; // chars left to reveal
  const done = budget === Infinity;

  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (done || budget <= 0) {
      // After budget runs out: render remaining segs as invisible placeholders
      // so the line's layout doesn't shift once complete
      if (!done) {
        nodes.push(
          <span key={i} className="invisible select-none" aria-hidden>
            <SegmentFull seg={seg} flags={flags} />
          </span>
        );
      } else {
        nodes.push(
          <span key={i}>
            <SegmentFull seg={seg} flags={flags} />
          </span>
        );
      }
      continue;
    }

    const segLen = segmentLength(seg);

    if (budget >= segLen) {
      // Full segment revealed
      nodes.push(
        <span key={i}>
          <SegmentFull seg={seg} flags={flags} />
        </span>
      );
      budget -= segLen;
    } else {
      // Partial segment — only text/ruby can be partial; links/corrupted flip whole
      nodes.push(
        <span key={i}>
          <SegmentPartial seg={seg} chars={budget} flags={flags} />
        </span>
      );
      // Invisible remainder so layout stays stable
      nodes.push(
        <span key={`${i}-rest`} className="invisible select-none" aria-hidden>
          <SegmentRemainder seg={seg} chars={budget} flags={flags} />
        </span>
      );
      budget = 0;
    }
  }

  // Blinking cursor at the active typing position
  const isTyping = !done && revealedChars > 0;

  return (
    <>
      {nodes}
      {isTyping && (
        <span
          className="inline-block w-1.5 h-[1em] bg-primary align-text-bottom ml-px"
          style={{ animation: "blink-cursor 0.7s step-end infinite" }}
          aria-hidden
        />
      )}
    </>
  );
}

function segmentLength(seg: ParsedSegment): number {
  switch (seg.type) {
    case "text":      return seg.content.length;
    case "ruby":      return seg.base.length;
    case "corrupted": return seg.original.length || 4;
    case "tag_link":  return seg.id.length + 4;
    default:          return 0;
  }
}

function SegmentFull({
  seg,
  flags,
}: {
  seg: ParsedSegment;
  flags: Record<string, boolean | string | number>;
}) {
  const COLOR_MAP: Record<string, string> = {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",
    accent: "var(--color-accent)",
    warn: "var(--color-warn)",
    error: "var(--color-error)",
    "text-dim": "var(--color-text-dim)",
  };

  switch (seg.type) {
    case "text":
      return <>{seg.content}</>;
    case "ruby":
      return (
        <ruby>
          {seg.base}
          <rt>{seg.reading}</rt>
        </ruby>
      );
    case "tag_link":
      return <InlineCard id={seg.id} />;
    case "color":
      return (
        <span style={{ color: COLOR_MAP[seg.color] ?? "inherit" }}>
          {seg.content.map((inner, i) => (
            <span key={i}><SegmentFull seg={inner} flags={flags} /></span>
          ))}
        </span>
      );
    case "corrupted":
      if (flags["identity_revealed"]) {
        return <span className="text-primary-dim">{seg.original}</span>;
      }
      return <CorruptedBlock length={seg.original.length || 4} />;
    default:
      return null;
  }
}

function SegmentPartial({
  seg,
  chars,
  flags,
}: {
  seg: ParsedSegment;
  chars: number;
  flags: Record<string, boolean | string | number>;
}) {
  switch (seg.type) {
    case "text":
      return <>{seg.content.slice(0, chars)}</>;
    case "ruby":
      // Show base chars partially; rt only when base is complete
      return (
        <ruby>
          {seg.base.slice(0, chars)}
          {chars >= seg.base.length && <rt>{seg.reading}</rt>}
        </ruby>
      );
    case "corrupted":
    case "tag_link":
      // Atomic — either show or don't
      return null;
    default:
      return null;
  }
}

function SegmentRemainder({
  seg,
  chars,
  flags,
}: {
  seg: ParsedSegment;
  chars: number;
  flags: Record<string, boolean | string | number>;
}) {
  switch (seg.type) {
    case "text":
      return <>{seg.content.slice(chars)}</>;
    case "ruby":
      return (
        <ruby>
          {seg.base.slice(chars)}
          <rt>{seg.reading}</rt>
        </ruby>
      );
    case "corrupted":
    case "tag_link":
      return <SegmentFull seg={seg} flags={flags} />;
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ChoiceButtons
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// CommandInputLine — inline input prompt activated when this line is reached
// ──────────────────────────────────────────────────────────────────────────────

function CommandInputLine({
  variable,
  hint,
  branches,
  isActive,
  onSubmit,
}: {
  variable: string;
  hint: string;
  branches: CommandBranch[];
  isActive: boolean;
  onSubmit?: (input: string, variable: string, branches: CommandBranch[]) => void;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when this line becomes active
  useEffect(() => {
    if (isActive && !submitted) {
      inputRef.current?.focus();
    }
  }, [isActive, submitted]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || submitted) return;
    setSubmitted(trimmed);
    onSubmit?.(trimmed, variable, branches);
  }

  if (submitted) {
    // Show the submitted command as a frozen user_input line
    return (
      <div className="flex items-start gap-2 py-0.5 pl-4">
        <span className="text-secondary shrink-0 select-none">&gt;&gt;</span>
        <span className="text-secondary italic">{submitted}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-1.5 pl-4"
      style={{ opacity: isActive ? 1 : 0.35, transition: "opacity 0.3s" }}
    >
      <span
        className="shrink-0 select-none"
        style={{ color: isActive ? "var(--color-secondary)" : "var(--color-muted)" }}
      >
        &gt;&gt;
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={!isActive}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder={isActive ? (hint || "コマンドを入力...") : "[LOCKED]"}
        autoComplete="off"
        spellCheck={false}
        className="flex-1 bg-transparent outline-none text-sm font-mono"
        style={{
          color: "var(--color-secondary)",
          caretColor: "var(--color-primary)",
        }}
      />
      {isActive && value && (
        <button
          onClick={handleSubmit}
          className="text-xs px-2 py-0.5 border transition-colors"
          style={{
            borderColor: "var(--color-secondary)",
            color: "var(--color-secondary)",
          }}
        >
          SEND
        </button>
      )}
    </div>
  );
}

function ChoiceButtons({
  choices,
  variable,
  onChoice,
}: {
  choices: string[];
  variable: string;
  onChoice?: (c: string, v: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="py-3 flex flex-wrap gap-2 pl-4">
      {choices.map((choice, i) => (
        <button
          key={i}
          disabled={!!selected}
          onClick={() => {
            setSelected(choice);
            onChoice?.(choice, variable);
          }}
          className={`px-4 py-1.5 border text-sm transition-all duration-200 ${
            selected === choice
              ? "border-primary bg-primary-faint text-primary"
              : selected
              ? "border-border text-muted cursor-not-allowed"
              : "border-border-bright text-text-dim hover:border-primary hover:text-primary hover:bg-primary-faint"
          }`}
        >
          ＜{choice}＞
        </button>
      ))}
    </div>
  );
}
