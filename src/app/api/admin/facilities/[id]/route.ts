// Edited: 2026-04-22
import { getRecord, updateRecord, deleteRecord } from "@/lib/adminCrud";

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getRecord("facilities", id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return updateRecord("facilities", id, body);
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deleteRecord("facilities", id);
}
