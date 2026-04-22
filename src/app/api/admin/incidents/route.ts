// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/adminCrud";

export async function GET() {
  return listRecords("incidents", "incident_date");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.incident_id || !body.name) {
    return NextResponse.json({ error: "incident_id and name are required" }, { status: 400 });
  }
  return createRecord("incidents", body);
}
