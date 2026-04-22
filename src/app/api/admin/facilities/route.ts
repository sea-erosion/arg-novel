// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/adminCrud";

export async function GET() {
  return listRecords("facilities", "facility_id");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.facility_id || !body.name) {
    return NextResponse.json({ error: "facility_id and name are required" }, { status: 400 });
  }
  return createRecord("facilities", body);
}
