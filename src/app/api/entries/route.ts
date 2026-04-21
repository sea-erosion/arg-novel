import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const novelId = url.searchParams.get("novel_id");
    const sessionId = url.searchParams.get("session_id");

    if (!novelId) {
      return NextResponse.json({ error: "novel_id required" }, { status: 400 });
    }

    // Get user state flags to determine access
    let userFlags: Record<string, boolean | string | number> = {};
    if (sessionId) {
      const stateResult = await db.execute({
        sql: "SELECT flags FROM user_state WHERE session_id = ? AND novel_id = ?",
        args: [sessionId, novelId],
      });
      if (stateResult.rows.length > 0) {
        userFlags = JSON.parse(stateResult.rows[0].flags as string || "{}");
      }
    }

    const result = await db.execute({
      sql: "SELECT * FROM entries WHERE novel_id = ? ORDER BY order_index ASC",
      args: [novelId],
    });

    // Check access for each entry
    const entries = result.rows.map((entry) => {
      const requiredFlags: string[] = JSON.parse(entry.required_flags as string || "[]");
      const accessible = requiredFlags.every((f) => !!userFlags[f]);
      return {
        ...entry,
        accessible,
        // Hide content of locked entries
        content: accessible || !entry.is_locked
          ? entry.content
          : "[LOCKED - ACCESS DENIED]",
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}
