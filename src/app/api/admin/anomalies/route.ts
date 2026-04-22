// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/adminCrud";

export async function GET() {
  return listRecords("anomalies", "record_id");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.record_id || !body.name) {
    return NextResponse.json({ error: "record_id and name are required" }, { status: 400 });
  }
  return createRecord("anomalies", body);
}
