import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { session_id, novel_id, flag_key, flag_value, entry_id } = await req.json();

    if (!session_id || !novel_id) {
      return NextResponse.json({ error: "session_id and novel_id required" }, { status: 400 });
    }

    // Get current state
    const stateResult = await db.execute({
      sql: "SELECT * FROM user_state WHERE session_id = ? AND novel_id = ?",
      args: [session_id, novel_id],
    });

    if (!stateResult.rows.length) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    const state = stateResult.rows[0];
    const flags: Record<string, boolean | string | number> = JSON.parse(state.flags as string || "{}");
    const unlockedEntries: string[] = JSON.parse(state.unlocked_entries as string || "[]");

    // Set flag
    if (flag_key !== undefined) {
      flags[flag_key] = flag_value ?? true;
    }

    // Mark entry as read/unlocked
    if (entry_id && !unlockedEntries.includes(entry_id)) {
      unlockedEntries.push(entry_id);

      // Get entry's unlock_flags
      const entryResult = await db.execute({
        sql: "SELECT unlock_flags FROM entries WHERE id = ?",
        args: [entry_id],
      });

      if (entryResult.rows.length > 0) {
        const unlockFlags = JSON.parse(entryResult.rows[0].unlock_flags as string || "{}");
        Object.assign(flags, unlockFlags);
      }
    }

    const progress = Math.min(
      100,
      Math.round((unlockedEntries.length / Math.max(1, await getTotalEntries(novel_id))) * 100)
    );

    await db.execute({
      sql: `UPDATE user_state SET flags = ?, unlocked_entries = ?, progress = ?,
            last_read_entry = ?, updated_at = datetime('now')
            WHERE session_id = ? AND novel_id = ?`,
      args: [
        JSON.stringify(flags),
        JSON.stringify(unlockedEntries),
        progress,
        entry_id || (state.last_read_entry as string) || null,
        session_id,
        novel_id,
      ],
    });

    return NextResponse.json({ flags, unlocked_entries: unlockedEntries, progress });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
  }
}

async function getTotalEntries(novelId: string): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM entries WHERE novel_id = ?",
    args: [novelId],
  });
  return (result.rows[0]?.count as number) || 1;
}
