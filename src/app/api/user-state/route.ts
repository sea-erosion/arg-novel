import { NextResponse } from "next/server";
import { db, getOrCreateUserState } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const novelId = url.searchParams.get("novel_id");

    if (!sessionId || !novelId) {
      return NextResponse.json({ error: "session_id and novel_id required" }, { status: 400 });
    }

    const state = await getOrCreateUserState(sessionId, novelId);
    return NextResponse.json({ state });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, novel_id, flags, progress, unlocked_entries, last_read_entry } = body;

    if (!session_id || !novel_id) {
      return NextResponse.json({ error: "session_id and novel_id required" }, { status: 400 });
    }

    await getOrCreateUserState(session_id, novel_id);

    // Build update
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (flags !== undefined) {
      updates.push("flags = ?");
      args.push(JSON.stringify(flags));
    }
    if (progress !== undefined) {
      updates.push("progress = ?");
      args.push(progress);
    }
    if (unlocked_entries !== undefined) {
      updates.push("unlocked_entries = ?");
      args.push(JSON.stringify(unlocked_entries));
    }
    if (last_read_entry !== undefined) {
      updates.push("last_read_entry = ?");
      args.push(last_read_entry);
    }

    updates.push("updated_at = datetime('now')");
    args.push(session_id, novel_id);

    if (updates.length > 1) {
      await db.execute({
        sql: `UPDATE user_state SET ${updates.join(", ")} WHERE session_id = ? AND novel_id = ?`,
        args,
      });
    }

    const updated = await db.execute({
      sql: "SELECT * FROM user_state WHERE session_id = ? AND novel_id = ?",
      args: [session_id, novel_id],
    });

    return NextResponse.json({ state: updated.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
  }
}
