// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.execute({ sql: "SELECT * FROM scp_records WHERE id = ?", args: [id] });
    if (!result.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { record_id, name, classification, description, containment_procedures, addenda } = body;

    await db.execute({
      sql: `UPDATE scp_records SET record_id=?, name=?, classification=?, description=?, containment_procedures=?, addenda=? WHERE id=?`,
      args: [record_id, name, classification, description, containment_procedures, addenda || null, id],
    });

    const result = await db.execute({ sql: "SELECT * FROM scp_records WHERE id = ?", args: [id] });
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update SCP record" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.execute({ sql: "DELETE FROM scp_records WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
