// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM novels ORDER BY created_at ASC");
    return NextResponse.json({ novels: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, slug, description, cover_text, boot_sequence } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "title and slug required" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO novels (id, title, slug, description, cover_text, boot_sequence)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        slug,
        description || "",
        cover_text || "",
        boot_sequence || "[]",
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM novels WHERE id = ?", args: [id] });
    return NextResponse.json({ novel: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create novel" }, { status: 500 });
  }
}
