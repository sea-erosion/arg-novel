// Edited: 2026-04-22
// Unified lookup endpoint for [[ID]] tag links in InlineCard
// Searches: anomalies, facilities, modules, staff, incidents, scp_records (legacy)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RecordCategory = "anomaly" | "facility" | "module" | "staff" | "incident" | "scp_legacy";

interface UnifiedRecord {
  category: RecordCategory;
  id: string;
  record_id: string;
  name: string;
  badge: string;        // short label for category
  badge_color: string;  // CSS color key
  subtitle: string;     // second line (classification / role / status etc.)
  description: string;
  extra?: string;       // containment / specs / profile excerpt
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recordId = decodeURIComponent(id);

  try {
    // 1. anomalies
    const a = await db.execute({ sql: "SELECT * FROM anomalies WHERE record_id = ?", args: [recordId] });
    if (a.rows.length) {
      const r = a.rows[0];
      return NextResponse.json({
        record: {
          category: "anomaly",
          record_id: r.record_id,
          name: r.name,
          badge: "アノマリー",
          badge_color: "error",
          subtitle: `[${r.classification}] 脅威度: ${r.threat_level} — ${r.status}`,
          description: String(r.description).slice(0, 180),
          extra: r.containment_procedures ? String(r.containment_procedures).slice(0, 80) : null,
        } as UnifiedRecord,
      });
    }

    // 2. facilities
    const f = await db.execute({ sql: "SELECT * FROM facilities WHERE facility_id = ?", args: [recordId] });
    if (f.rows.length) {
      const r = f.rows[0];
      return NextResponse.json({
        record: {
          category: "facility",
          record_id: r.facility_id,
          name: r.name,
          badge: "施設",
          badge_color: "secondary",
          subtitle: `所在地: ${r.location || "不明"} — セキュリティLv.${r.security_level} — ${r.status}`,
          description: String(r.description).slice(0, 180),
          extra: r.area ? String(r.area) : null,
        } as UnifiedRecord,
      });
    }

    // 3. modules
    const m = await db.execute({ sql: "SELECT * FROM modules WHERE module_id = ?", args: [recordId] });
    if (m.rows.length) {
      const r = m.rows[0];
      return NextResponse.json({
        record: {
          category: "module",
          record_id: r.module_id,
          name: r.name,
          badge: "モジュール",
          badge_color: "warn",
          subtitle: `タイプ: ${r.module_type} — 状態: ${r.condition}${r.assigned_to ? ` — 配備: ${r.assigned_to}` : ""}`,
          description: String(r.description).slice(0, 180),
          extra: r.specs ? String(r.specs).slice(0, 80) : null,
        } as UnifiedRecord,
      });
    }

    // 4. staff
    const s = await db.execute({ sql: "SELECT * FROM staff WHERE staff_id = ?", args: [recordId] });
    if (s.rows.length) {
      const r = s.rows[0];
      return NextResponse.json({
        record: {
          category: "staff",
          record_id: r.staff_id,
          name: r.name,
          badge: "職員",
          badge_color: "primary",
          subtitle: `役職: ${r.role}${r.rank ? ` (${r.rank})` : ""} — CLv.${r.clearance_level} — ${r.status}`,
          description: String(r.profile).slice(0, 180),
          extra: r.division ? String(r.division) : null,
        } as UnifiedRecord,
      });
    }

    // 5. incidents
    const i = await db.execute({ sql: "SELECT * FROM incidents WHERE incident_id = ?", args: [recordId] });
    if (i.rows.length) {
      const r = i.rows[0];
      return NextResponse.json({
        record: {
          category: "incident",
          record_id: r.incident_id,
          name: r.title,
          badge: "インシデント",
          badge_color: "accent",
          subtitle: `日時: ${r.incident_date} — 重大度: ${r.severity}`,
          description: String(r.description).slice(0, 180),
          extra: r.outcome ? String(r.outcome).slice(0, 80) : null,
        } as UnifiedRecord,
      });
    }

    // 6. scp_records (legacy)
    const legacy = await db.execute({ sql: "SELECT * FROM scp_records WHERE record_id = ?", args: [recordId] });
    if (legacy.rows.length) {
      const r = legacy.rows[0];
      return NextResponse.json({
        record: {
          category: "scp_legacy",
          record_id: r.record_id,
          name: r.name,
          badge: "SCP",
          badge_color: "error",
          subtitle: `クラス: ${r.classification}`,
          description: String(r.description).slice(0, 180),
          extra: r.containment_procedures ? String(r.containment_procedures).slice(0, 80) : null,
        } as UnifiedRecord,
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to lookup record" }, { status: 500 });
  }
}
