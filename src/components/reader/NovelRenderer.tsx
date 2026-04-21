"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseNovelContent } from "@/lib/parser";
import type { ParsedLine, ParsedSegment } from "@/types";
import { InlineCard } from "@/components/ui/InlineCard";
import { CorruptedBlock } from "@/components/ui/GlitchText";

interface NovelRendererProps {
  content: string;
  entryType: string;
  onChoice?: (choice: string, variable: string) => void;
  corruptionLevel?: number;
  revealedFlags?: Record<string, boolean | string | number>;
}

export function NovelRenderer({
  content,
  entryType,
  onChoice,
  corruptionLevel = 0,
  revealedFlags = {},
}: NovelRendererProps) {
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseNovelContent(content);
    setLines(parsed);
    setVisibleCount(0);
    setIsStreaming(true);

    // Stream lines in
    let i = 0;
    const tick = () => {
      i++;
      setVisibleCount(i);
      if (i < parsed.length) {
        const delay = getLineDelay(parsed[i]);
        setTimeout(tick, delay);
      } else {
        setIsStreaming(false);
      }
    };

    const t = setTimeout(tick, 100);
    return () => clearTimeout(t);
  }, [content]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="font-mono text-sm leading-7 space-y-0.5 overflow-y-auto"
      style={{ maxHeight: "calc(100vh - 220px)" }}
    >
      {lines.slice(0, visibleCount).map((line, i) => (
        <AnimatePresence key={i}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <RenderLine
              line={line}
              onChoice={onChoice}
              corruptionLevel={corruptionLevel}
              revealedFlags={revealedFlags}
            />
          </motion.div>
        </AnimatePresence>
      ))}

      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary" style={{
          animation: "blink-cursor 0.8s step-end infinite",
          verticalAlign: "text-bottom",
        }} />
      )}
    </div>
  );
}

function getLineDelay(line: ParsedLine): number {
  switch (line.type) {
    case "divider": return 300;
    case "system": return 80;
    case "char": return 60;
    case "blank": return 30;
    default: return 50;
  }
}

interface RenderLineProps {
  line: ParsedLine;
  onChoice?: (choice: string, variable: string) => void;
  corruptionLevel: number;
  revealedFlags: Record<string, boolean | string | number>;
}

function RenderLine({ line, onChoice, corruptionLevel, revealedFlags }: RenderLineProps) {
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
            <RenderSegments segments={line.content} corruptionLevel={corruptionLevel} flags={revealedFlags} />
          </span>
        </div>
      );

    case "char":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-primary-dim shrink-0 select-none">＄</span>
          <span className="text-text">
            <RenderSegments segments={line.content} corruptionLevel={corruptionLevel} flags={revealedFlags} />
          </span>
        </div>
      );

    case "user_input":
      return (
        <div className="flex items-start gap-2 py-0.5 pl-4">
          <span className="text-secondary shrink-0 select-none">&gt;&gt;</span>
          <span className="text-secondary italic">
            <RenderSegments segments={line.prompt} corruptionLevel={corruptionLevel} flags={revealedFlags} />
          </span>
        </div>
      );

    case "choice":
      return (
        <ChoiceButtons
          choices={line.choices}
          variable={line.variable}
          onChoice={onChoice}
        />
      );

    case "paragraph":
      return (
        <div className="py-0.5 leading-7 text-text-dim">
          <RenderSegments segments={line.content} corruptionLevel={corruptionLevel} flags={revealedFlags} />
        </div>
      );

    default:
      return null;
  }
}

function RenderSegments({
  segments,
  corruptionLevel,
  flags,
}: {
  segments: ParsedSegment[];
  corruptionLevel: number;
  flags: Record<string, boolean | string | number>;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "text":
            return <span key={i}>{seg.content}</span>;

          case "ruby":
            return (
              <ruby key={i}>
                {seg.base}
                <rt>{seg.reading}</rt>
              </ruby>
            );

          case "tag_link":
            return <InlineCard key={i} id={seg.id} />;

          case "corrupted":
            // If identity_revealed flag is set, try to show partial restoration
            if (flags["identity_revealed"]) {
              return (
                <span key={i} className="text-primary-dim">
                  {seg.original}
                </span>
              );
            }
            return (
              <CorruptedBlock
                key={i}
                length={seg.original.length || 4}
              />
            );

          default:
            return null;
        }
      })}
    </>
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
