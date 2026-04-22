// Edited: 2026-04-22
import type { ParsedLine, ParsedSegment, ColorName, CommandBranch } from "@/types";

// Characters that trigger corruption display
const CORRUPTION_MARKER = "\\x00";
const TOFU_CHARS = ["\\uFFFD", "\\u0000", "\\u001A"];

/**
 * Parse inline segments: ruby, color, tag links, corrupted text
 */
export function parseInlineSegments(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Color: {c:colorname}text{/c}
    const colorMatch = remaining.match(/^([\s\S]*?)\{c:(primary|secondary|accent|warn|error|text-dim)\}([\s\S]*?)\{\/c\}/);
    if (colorMatch) {
      const [full, before, color, inner] = colorMatch;
      if (before) segments.push(...parseRubyAndLinks(before));
      segments.push({
        type: "color",
        color: color as ColorName,
        content: parseRubyAndLinks(inner),
      });
      remaining = remaining.slice(full.length);
      continue;
    }

    // Ruby: ｜base《reading》
    const rubyMatch = remaining.match(/^([\s\S]*?)｜([^《]+)《([^》]+)》/);
    if (rubyMatch) {
      const [full, before, base, reading] = rubyMatch;
      if (before) segments.push(...parseCorruptedSegments(before));
      segments.push({ type: "ruby", base, reading });
      remaining = remaining.slice(full.length);
      continue;
    }

    // Tag link: [[ID]]
    const tagMatch = remaining.match(/^([\s\S]*?)\[\[([^\]]+)\]\]/);
    if (tagMatch) {
      const [full, before, id] = tagMatch;
      if (before) segments.push(...parseCorruptedSegments(before));
      segments.push({ type: "tag_link", id: id.trim() });
      remaining = remaining.slice(full.length);
      continue;
    }

    // No more special syntax
    segments.push(...parseCorruptedSegments(remaining));
    break;
  }

  return segments;
}

/**
 * Parse ruby and tag links (used inside color blocks)
 */
function parseRubyAndLinks(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const rubyMatch = remaining.match(/^([\s\S]*?)｜([^《]+)《([^》]+)》/);
    if (rubyMatch) {
      const [full, before, base, reading] = rubyMatch;
      if (before) segments.push(...parseCorruptedSegments(before));
      segments.push({ type: "ruby", base, reading });
      remaining = remaining.slice(full.length);
      continue;
    }
    const tagMatch = remaining.match(/^([\s\S]*?)\[\[([^\]]+)\]\]/);
    if (tagMatch) {
      const [full, before, id] = tagMatch;
      if (before) segments.push(...parseCorruptedSegments(before));
      segments.push({ type: "tag_link", id: id.trim() });
      remaining = remaining.slice(full.length);
      continue;
    }
    segments.push(...parseCorruptedSegments(remaining));
    break;
  }
  return segments;
}

/**
 * Parse corrupted text (tofu/replacement chars)
 */
function parseCorruptedSegments(text: string): ParsedSegment[] {
  if (!text) return [];
  const parts = text.split(/([\u{FFFD}\u{25A0}\u{25A1}█▓▒░]+)/u);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (/^[\u{FFFD}\u{25A0}\u{25A1}█▓▒░]+$/u.test(part)) {
        return {
          type: "corrupted" as const,
          original: part,
          display: generateCorruptedDisplay(part.length),
        };
      }
      return { type: "text" as const, content: part };
    });
}

function generateCorruptedDisplay(len: number): string {
  const chars = "?#@$%^&*!~<>{}|";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Parse a full novel entry content into structured lines
 */
export function parseNovelContent(content: string): ParsedLine[] {
  const lines = content.split("\n");
  const parsed: ParsedLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim() === "") {
      parsed.push({ type: "blank" });
      continue;
    }

    if (/^[─━\-－＝=]{3,}/.test(line.trim())) {
      parsed.push({ type: "divider" });
      continue;
    }

    if (line.startsWith("＃")) {
      const content = line.slice(1).trim();
      parsed.push({ type: "system", content: parseInlineSegments(content) });
      continue;
    }

    if (line.startsWith("＄")) {
      const content = line.slice(1).trim();
      parsed.push({ type: "char", speaker: "diary_owner", content: parseInlineSegments(content) });
      continue;
    }

    if (line.startsWith(">>")) {
      const content = line.slice(2).trim();
      parsed.push({ type: "user_input", prompt: parseInlineSegments(content) });
      continue;
    }

    if (line.includes("＜") && line.includes("＞")) {
      const choices: string[] = [];
      const choiceRegex = /＜([^＞]+)＞/g;
      let m;
      while ((m = choiceRegex.exec(line)) !== null) {
        choices.push(m[1]);
      }
      if (choices.length > 0) {
        parsed.push({ type: "choice", choices, variable: "read_diary" });
        continue;
      }
    }

    // Command input: ？variable:hint｜pattern1=flag1｜pattern2=flag2｜*=fallback
    if (line.startsWith("？")) {
      const body = line.slice(1);
      const parts = body.split("｜");
      const [varHint, ...branchParts] = parts;
      const colonIdx = varHint.indexOf(":");
      const variable = colonIdx >= 0 ? varHint.slice(0, colonIdx).trim() : varHint.trim();
      const hint     = colonIdx >= 0 ? varHint.slice(colonIdx + 1).trim() : "";
      const branches: CommandBranch[] = branchParts
        .map((b) => {
          const eq = b.indexOf("=");
          if (eq < 0) return null;
          return { pattern: b.slice(0, eq).trim(), flag: b.slice(eq + 1).trim() };
        })
        .filter((b): b is CommandBranch => b !== null);
      parsed.push({ type: "command_input", variable, hint, branches });
      continue;
    }

    parsed.push({ type: "paragraph", content: parseInlineSegments(line) });
  }

  return parsed;
}

export function applyCorruption(
  content: string,
  corruptionLevel: number,
  unlockedFlags: Record<string, boolean | string | number>
): string {
  if (corruptionLevel === 0) return content;
  if (unlockedFlags["identity_revealed"]) return content;
  return content;
}

export function isEntryAccessible(
  requiredFlags: string[],
  userFlags: Record<string, boolean | string | number>
): boolean {
  return requiredFlags.every((flag) => !!userFlags[flag]);
}
