// Edited: 2026-04-22
// Generic CRUD helpers for data record tables
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export type TableName = "anomalies" | "facilities" | "modules" | "staff" | "incidents";

export async function listRecords(table: TableName, orderBy = "created_at") {
  try {
    const result = await db.execute(`SELECT * FROM ${table} ORDER BY ${orderBy} ASC`);
    return NextResponse.json({ records: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: `Failed to fetch ${table}` }, { status: 500 });
  }
}

export async function createRecord(table: TableName, body: Record<string, unknown>) {
  try {
    const id = uuidv4();
    const fields = Object.keys(body);
    const values = Object.values(body);
    const placeholders = fields.map(() => "?").join(", ");
    await db.execute({
      sql: `INSERT INTO ${table} (id, ${fields.join(", ")}) VALUES (?, ${placeholders})`,
      args: [id, ...values],
    });
    const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
    return NextResponse.json({ record: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: `Failed to create ${table} record` }, { status: 500 });
  }
}

export async function getRecord(table: TableName, id: string) {
  try {
    const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
    if (!result.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function updateRecord(table: TableName, id: string, body: Record<string, unknown>) {
  try {
    const fields = Object.keys(body);
    const values = Object.values(body);
    const setClause = fields.map(f => `${f} = ?`).join(", ");
    await db.execute({
      sql: `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      args: [...values, id],
    });
    const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: `Failed to update ${table} record` }, { status: 500 });
  }
}

export async function deleteRecord(table: TableName, id: string) {
  try {
    await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
