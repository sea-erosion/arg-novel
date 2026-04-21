import { NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const result = await db.execute("SELECT * FROM novels ORDER BY created_at DESC");
    return NextResponse.json({ novels: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 });
  }
}
