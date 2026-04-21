import { createClient } from "@libsql/client";
import path from "path";

const dbPath = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "novel.db")}`;

export const db = createClient({ url: dbPath });

export async function initializeDatabase() {
  // novels table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      cover_text TEXT NOT NULL,
      boot_sequence TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // entries table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      entry_type TEXT NOT NULL DEFAULT 'diary',
      required_flags TEXT NOT NULL DEFAULT '[]',
      unlock_flags TEXT NOT NULL DEFAULT '{}',
      order_index INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      scp_class TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id),
      UNIQUE(novel_id, slug)
    )
  `);

  // user_state table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_state (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      flags TEXT NOT NULL DEFAULT '{}',
      progress INTEGER NOT NULL DEFAULT 0,
      unlocked_entries TEXT NOT NULL DEFAULT '[]',
      last_read_entry TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, novel_id)
    )
  `);

  // scp_records table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scp_records (
      id TEXT PRIMARY KEY,
      record_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'Safe',
      description TEXT NOT NULL,
      containment_procedures TEXT NOT NULL,
      addenda TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log("Database initialized.");
}

export async function getOrCreateUserState(
  sessionId: string,
  novelId: string
) {
  const existing = await db.execute({
    sql: "SELECT * FROM user_state WHERE session_id = ? AND novel_id = ?",
    args: [sessionId, novelId],
  });

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const { v4: uuidv4 } = await import("uuid");
  const id = uuidv4();

  await db.execute({
    sql: `INSERT INTO user_state (id, session_id, novel_id, flags, progress, unlocked_entries)
          VALUES (?, ?, ?, '{}', 0, '[]')`,
    args: [id, sessionId, novelId],
  });

  const created = await db.execute({
    sql: "SELECT * FROM user_state WHERE id = ?",
    args: [id],
  });
  return created.rows[0];
}
