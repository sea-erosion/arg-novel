// Edited: 2026-04-22
import { NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";

export async function POST() {
  try {
    await initializeDatabase();
    return NextResponse.json({ success: true, message: "Migration complete" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed", detail: String(error) }, { status: 500 });
  }
}
