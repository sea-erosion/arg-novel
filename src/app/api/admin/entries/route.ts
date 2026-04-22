// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const novelId = url.searchParams.get("novel_id");

    const sql = novelId
      ? "SELECT * FROM entries WHERE novel_id = ? ORDER BY order_index ASC"
      : "SELECT * FROM entries ORDER BY order_index ASC";
    const args = novelId ? [novelId] : [];

    const result = await db.execute({ sql, args });
    return NextResponse.json({ entries: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      novel_id, slug, title, content = "",
      entry_type = "diary", required_flags = "[]",
      unlock_flags = "{}", order_index = 0,
      is_locked = 0, scp_class = null,
    } = body;

    if (!novel_id || !slug || !title) {
      return NextResponse.json({ error: "novel_id, slug, title required" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO entries (id, novel_id, slug, title, content, entry_type, required_flags, unlock_flags, order_index, is_locked, scp_class)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, novel_id, slug, title, content, entry_type, required_flags, unlock_flags, order_index, is_locked, scp_class],
    });

    const result = await db.execute({ sql: "SELECT * FROM entries WHERE id = ?", args: [id] });
    return NextResponse.json({ entry: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
