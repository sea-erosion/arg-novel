// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.execute({ sql: "SELECT * FROM novels WHERE id = ?", args: [id] });
    if (!result.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ novel: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, slug, description, cover_text, boot_sequence } = body;

    await db.execute({
      sql: `UPDATE novels SET title=?, slug=?, description=?, cover_text=?, boot_sequence=? WHERE id=?`,
      args: [title, slug, description, cover_text, boot_sequence, id],
    });

    const result = await db.execute({ sql: "SELECT * FROM novels WHERE id = ?", args: [id] });
    return NextResponse.json({ novel: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update novel" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.execute({ sql: "DELETE FROM entries WHERE novel_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM novels WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
