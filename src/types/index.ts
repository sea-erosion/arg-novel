// Database types
export interface Novel {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_text: string;
  boot_sequence: string; // JSON array of boot messages
  created_at: string;
}

export interface Entry {
  id: string;
  novel_id: string;
  slug: string;
  title: string;
  content: string;
  entry_type: "diary" | "log" | "system" | "dialogue" | "scp_record";
  required_flags: string; // JSON array of required flags
  unlock_flags: string; // JSON flags to set on read
  order_index: number;
  is_locked: boolean;
  scp_class?: string; // For SCP-style records
  created_at: string;
}

export interface UserState {
  id: string;
  session_id: string;
  novel_id: string;
  flags: string; // JSON object
  progress: number;
  unlocked_entries: string; // JSON array of entry IDs
  last_read_entry?: string;
  created_at: string;
  updated_at: string;
}

export interface ScpRecord {
  id: string;
  record_id: string; // e.g. "KAI-001"
  name: string;
  classification: string; // Safe / Euclid / Keter
  description: string;
  containment_procedures: string;
  addenda?: string;
}

// Parser types
export type ColorName = "primary" | "secondary" | "accent" | "warn" | "error" | "text-dim";

export type ParsedSegment =
  | { type: "text"; content: string }
  | { type: "ruby"; base: string; reading: string }
  | { type: "tag_link"; id: string }
  | { type: "corrupted"; original: string; display: string }
  | { type: "color"; color: ColorName; content: ParsedSegment[] }
  | { type: "newline" }
  | { type: "divider" };

export type CommandBranch = {
  /** regex pattern string, or "*" for catch-all */
  pattern: string;
  /** flag key to set true when this branch matches */
  flag: string;
};

export type ParsedLine =
  | { type: "system"; content: ParsedSegment[] }
  | { type: "char"; speaker: string; content: ParsedSegment[] }
  | { type: "user_input"; prompt: ParsedSegment[] }
  | { type: "divider" }
  | { type: "prompt_prefix"; content: ParsedSegment[] }
  | { type: "paragraph"; content: ParsedSegment[] }
  | { type: "choice"; choices: string[]; variable: string }
  | { type: "blank" }
  | {
      type: "command_input";
      /** variable name (used as flag prefix) */
      variable: string;
      /** hint text shown in the input placeholder */
      hint: string;
      /** ordered branches; first match wins; "*" is catch-all */
      branches: CommandBranch[];
    };

// UI types
export interface BootMessage {
  text: string;
  type: "info" | "error" | "warn" | "success";
  delay: number;
}

export interface Flag {
  key: string;
  value: boolean | string | number;
}

export interface GameState {
  sessionId: string;
  novelId: string;
  flags: Record<string, boolean | string | number>;
  progress: number;
  unlockedEntries: string[];
  currentEntry?: string;
}
