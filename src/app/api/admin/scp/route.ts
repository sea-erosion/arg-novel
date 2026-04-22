// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM scp_records ORDER BY record_id ASC");
    return NextResponse.json({ records: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch SCP records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { record_id, name, classification = "Safe", description, containment_procedures, addenda } = body;

    if (!record_id || !name || !description || !containment_procedures) {
      return NextResponse.json({ error: "record_id, name, description, containment_procedures required" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO scp_records (id, record_id, name, classification, description, containment_procedures, addenda)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, record_id, name, classification, description, containment_procedures, addenda || null],
    });

    const result = await db.execute({ sql: "SELECT * FROM scp_records WHERE id = ?", args: [id] });
    return NextResponse.json({ record: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create SCP record" }, { status: 500 });
  }
}
