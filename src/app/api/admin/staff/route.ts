// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/adminCrud";

export async function GET() {
  return listRecords("staff", "staff_id");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.staff_id || !body.name) {
    return NextResponse.json({ error: "staff_id and name are required" }, { status: 400 });
  }
  return createRecord("staff", body);
}
