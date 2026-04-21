import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await db.execute({
      sql: "SELECT * FROM novels WHERE slug = ?",
      args: [slug],
    });
    if (!result.rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ novel: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch novel" }, { status: 500 });
  }
}
