// Edited: 2026-04-22
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

  // anomalies table (海蝕実体)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      record_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'Safe',
      threat_level TEXT NOT NULL DEFAULT 'Low',
      status TEXT NOT NULL DEFAULT 'active',
      description TEXT NOT NULL DEFAULT '',
      containment_procedures TEXT NOT NULL DEFAULT '',
      special_abilities TEXT,
      addenda TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // facilities table (施設)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      facility_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      area TEXT,
      description TEXT NOT NULL DEFAULT '',
      capacity TEXT,
      security_level TEXT NOT NULL DEFAULT '1',
      status TEXT NOT NULL DEFAULT 'operational',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // modules table (モジュール/装備)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      module_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      module_type TEXT NOT NULL DEFAULT 'tool',
      description TEXT NOT NULL DEFAULT '',
      specs TEXT,
      assigned_to TEXT,
      condition TEXT NOT NULL DEFAULT 'good',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // staff table (職員)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      staff_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'executor',
      division TEXT,
      rank TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      clearance_level INTEGER NOT NULL DEFAULT 1,
      profile TEXT NOT NULL DEFAULT '',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // incidents table (インシデントデータ)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      incident_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      incident_date TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'low',
      description TEXT NOT NULL DEFAULT '',
      involved_anomalies TEXT NOT NULL DEFAULT '[]',
      involved_staff TEXT NOT NULL DEFAULT '[]',
      outcome TEXT NOT NULL DEFAULT '',
      report TEXT,
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
