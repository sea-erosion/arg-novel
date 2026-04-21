"use client";

import { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  intensity?: "low" | "medium" | "high";
  active?: boolean;
}

const GLITCH_CHARS = "!@#$%^&*?<>{}[]|/\\~`";

export function GlitchText({ text, className = "", intensity = "low", active = true }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!active) {
      setDisplayText(text);
      return;
    }

    const probMap = { low: 0.01, medium: 0.05, high: 0.15 };
    const intervalMap = { low: 3000, medium: 1500, high: 500 };
    const prob = probMap[intensity];
    const interval = intervalMap[intensity];

    const timer = setInterval(() => {
      const glitched = text
        .split("")
        .map((char) =>
          Math.random() < prob
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : char
        )
        .join("");
      setDisplayText(glitched);

      // Quickly restore
      setTimeout(() => setDisplayText(text), 100);
    }, interval);

    return () => clearInterval(timer);
  }, [text, intensity, active]);

  return (
    <span className={className} data-text={text}>
      {displayText}
    </span>
  );
}

interface CorruptedBlockProps {
  length?: number;
  className?: string;
}

export function CorruptedBlock({ length = 8, className = "" }: CorruptedBlockProps) {
  const [chars, setChars] = useState(() => generateCorrupted(length));

  useEffect(() => {
    const timer = setInterval(() => {
      setChars(generateCorrupted(length));
    }, 200);
    return () => clearInterval(timer);
  }, [length]);

  return (
    <span
      className={`inline-block text-error font-bold ${className}`}
      style={{ letterSpacing: "0.05em" }}
      aria-label="[CORRUPTED DATA]"
    >
      {chars}
    </span>
  );
}

function generateCorrupted(len: number): string {
  const chars = "?#@$%^&*!~<>{}|░▒▓█▄▀";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
