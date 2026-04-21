import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: "SELECT * FROM scp_records WHERE record_id = ?",
      args: [id],
    });
    if (!result.rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 });
  }
}
