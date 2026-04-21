import type { ParsedLine, ParsedSegment } from "@/types";

// Characters that trigger corruption display
const CORRUPTION_MARKER = "\\x00";
const TOFU_CHARS = ["\\uFFFD", "\\u0000", "\\u001A"];

/**
 * Parse inline segments: ruby, tag links, corrupted text
 */
export function parseInlineSegments(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Ruby: ｜base《reading》
    const rubyMatch = remaining.match(/^([\s\S]*?)｜([^《]+)《([^》]+)》/);
    if (rubyMatch) {
      const [full, before, base, reading] = rubyMatch;
      if (before) {
        segments.push(...parseCorruptedSegments(before));
      }
      segments.push({ type: "ruby", base, reading });
      remaining = remaining.slice(full.length);
      continue;
    }

    // Tag link: [[ID]]
    const tagMatch = remaining.match(/^([\s\S]*?)\[\[([^\]]+)\]\]/);
    if (tagMatch) {
      const [full, before, id] = tagMatch;
      if (before) {
        segments.push(...parseCorruptedSegments(before));
      }
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
 * Parse corrupted text (tofu/replacement chars)
 */
function parseCorruptedSegments(text: string): ParsedSegment[] {
  // Look for sequences of replacement characters or known corruption patterns
  // In the source text: ██ or 文字化け patterns
  if (!text) return [];

  // Split on corrupted blocks (sequences of ??? or ■ or similar)
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

    // Blank line
    if (line.trim() === "") {
      parsed.push({ type: "blank" });
      continue;
    }

    // Divider line
    if (/^[─━\-－＝=]{3,}/.test(line.trim())) {
      parsed.push({ type: "divider" });
      continue;
    }

    // System message: ＃ ...
    if (line.startsWith("＃")) {
      const content = line.slice(1).trim();
      parsed.push({
        type: "system",
        content: parseInlineSegments(content),
      });
      continue;
    }

    // Character speech: ＄ ...
    if (line.startsWith("＄")) {
      const content = line.slice(1).trim();
      parsed.push({
        type: "char",
        speaker: "diary_owner",
        content: parseInlineSegments(content),
      });
      continue;
    }

    // User/reader response: >>...
    if (line.startsWith(">>")) {
      const content = line.slice(2).trim();
      parsed.push({
        type: "user_input",
        prompt: parseInlineSegments(content),
      });
      continue;
    }

    // Prompt prefix: ＜...＞ choices
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

    // Regular paragraph
    parsed.push({
      type: "paragraph",
      content: parseInlineSegments(line),
    });
  }

  return parsed;
}

/**
 * Apply corruption based on flags - replaces content with corrupted display
 */
export function applyCorruption(
  content: string,
  corruptionLevel: number,
  unlockedFlags: Record<string, boolean | string | number>
): string {
  if (corruptionLevel === 0) return content;

  // If flag "identity_revealed" is set, remove corruption
  if (unlockedFlags["identity_revealed"]) return content;

  return content;
}

/**
 * Check if an entry is accessible given current flags
 */
export function isEntryAccessible(
  requiredFlags: string[],
  userFlags: Record<string, boolean | string | number>
): boolean {
  return requiredFlags.every((flag) => !!userFlags[flag]);
}
