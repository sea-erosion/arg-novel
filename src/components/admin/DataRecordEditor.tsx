"use client";
// Edited: 2026-04-22

import { ContentEditor } from "@/components/admin/ContentEditor";
import { FlagsEditor } from "@/components/admin/FlagsEditor";

export type DataCategory = "anomalies" | "facilities" | "modules" | "staff" | "incidents";

type Draft = Record<string, unknown>;

const INPUT = "w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[#2a4a36] transition-colors";
const LABEL = "block text-[#6a9a78] text-xs mb-1";

interface DataRecordEditorProps {
  category: DataCategory;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

export function DataRecordEditor({ category, draft, onChange }: DataRecordEditorProps) {
  const p = (patch: Partial<Draft>) => onChange(patch);
  const v = (key: string, fallback = "") => String(draft[key] ?? fallback);

  const Field = ({ k, label, placeholder }: { k: string; label: string; placeholder?: string }) => (
    <div>
      <label className={LABEL}>{label}</label>
      <input className={INPUT} value={v(k)} onChange={e => p({ [k]: e.target.value })} placeholder={placeholder} />
    </div>
  );

  const TextArea = ({ k, label, rows = 3 }: { k: string; label: string; rows?: number }) => (
    <div>
      <label className={LABEL}>{label}</label>
      <textarea className={`${INPUT} resize-none`} rows={rows} value={v(k)} onChange={e => p({ [k]: e.target.value })} />
    </div>
  );

  const Select = ({ k, label, options }: { k: string; label: string; options: { value: string; label: string }[] }) => (
    <div>
      <label className={LABEL}>{label}</label>
      <select className={INPUT} value={v(k)} onChange={e => p({ [k]: e.target.value })}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const RichField = ({ k, label, height = "160px" }: { k: string; label: string; height?: string }) => (
    <div>
      <label className={LABEL}>{label}</label>
      <ContentEditor value={v(k)} onChange={val => p({ [k]: val })} height={height} />
    </div>
  );

  // ── ANOMALY ──────────────────────────────────────────────────────────────
  if (category === "anomalies") return (
    <div className="space-y-4 max-w-2xl">
      <SectionLabel color="error" label="アノマリー / 海蝕実体" />
      <div className="grid grid-cols-2 gap-4">
        <Field k="record_id" label="レコードID" placeholder="KAI-A-001" />
        <Field k="name" label="名称" />
        <Select k="classification" label="クラス" options={[
          { value: "Safe", label: "Safe（安全）" },
          { value: "Euclid", label: "Euclid（未確定）" },
          { value: "Keter", label: "Keter（危険）" },
          { value: "Thaumiel", label: "Thaumiel（特殊）" },
          { value: "Apollyon", label: "Apollyon（制御不能）" },
        ]} />
        <Select k="threat_level" label="脅威レベル" options={[
          { value: "Low", label: "Low（低）" },
          { value: "Medium", label: "Medium（中）" },
          { value: "High", label: "High（高）" },
          { value: "Critical", label: "Critical（最重大）" },
        ]} />
        <Select k="status" label="ステータス" options={[
          { value: "active", label: "active（活動中）" },
          { value: "contained", label: "contained（収容済み）" },
          { value: "neutralized", label: "neutralized（無力化）" },
          { value: "unknown", label: "unknown（不明）" },
        ]} />
      </div>
      <RichField k="description" label="説明" height="180px" />
      <RichField k="containment_procedures" label="収容手順" height="160px" />
      <RichField k="special_abilities" label="特殊能力（任意）" height="120px" />
      <RichField k="addenda" label="付記（任意）" height="120px" />
    </div>
  );

  // ── FACILITY ─────────────────────────────────────────────────────────────
  if (category === "facilities") return (
    <div className="space-y-4 max-w-2xl">
      <SectionLabel color="secondary" label="施設" />
      <div className="grid grid-cols-2 gap-4">
        <Field k="facility_id" label="施設ID" placeholder="KAI-F-001" />
        <Field k="name" label="名称" />
        <Field k="location" label="所在地" placeholder="例: 大分県九重地区" />
        <Field k="area" label="エリア（任意）" placeholder="例: 旧校舎B棟" />
        <Select k="security_level" label="セキュリティレベル" options={["1","2","3","4","5"].map(v => ({ value: v, label: `Lv.${v}` }))} />
        <Select k="status" label="ステータス" options={[
          { value: "operational", label: "operational（稼働中）" },
          { value: "under_maintenance", label: "under_maintenance（整備中）" },
          { value: "abandoned", label: "abandoned（放棄）" },
          { value: "destroyed", label: "destroyed（破壊）" },
          { value: "unknown", label: "unknown（不明）" },
        ]} />
        <Field k="capacity" label="収容能力（任意）" placeholder="例: 職員20名" />
      </div>
      <RichField k="description" label="説明" height="180px" />
      <TextArea k="notes" label="備考（任意）" rows={4} />
    </div>
  );

  // ── MODULE ────────────────────────────────────────────────────────────────
  if (category === "modules") return (
    <div className="space-y-4 max-w-2xl">
      <SectionLabel color="warn" label="モジュール / 装備" />
      <div className="grid grid-cols-2 gap-4">
        <Field k="module_id" label="モジュールID" placeholder="KAI-M-001" />
        <Field k="name" label="名称" />
        <Select k="module_type" label="タイプ" options={[
          { value: "weapon", label: "weapon（武器）" },
          { value: "tool", label: "tool（道具）" },
          { value: "support", label: "support（支援装備）" },
          { value: "communication", label: "communication（通信機器）" },
          { value: "containment", label: "containment（収容装置）" },
          { value: "research", label: "research（研究機器）" },
          { value: "other", label: "other（その他）" },
        ]} />
        <Select k="condition" label="状態" options={[
          { value: "new", label: "new（新品）" },
          { value: "good", label: "good（良好）" },
          { value: "damaged", label: "damaged（損傷あり）" },
          { value: "destroyed", label: "destroyed（破損）" },
          { value: "unknown", label: "unknown（不明）" },
        ]} />
        <Field k="assigned_to" label="配備先（任意）" placeholder="例: KAI-S-001 または KAI-F-001" />
      </div>
      <RichField k="description" label="説明" height="160px" />
      <TextArea k="specs" label="スペック・仕様（任意）" rows={4} />
      <TextArea k="notes" label="備考（任意）" rows={3} />
    </div>
  );

  // ── STAFF ─────────────────────────────────────────────────────────────────
  if (category === "staff") return (
    <div className="space-y-4 max-w-2xl">
      <SectionLabel color="primary" label="職員" />
      <div className="grid grid-cols-2 gap-4">
        <Field k="staff_id" label="職員ID" placeholder="KAI-S-001" />
        <Field k="name" label="氏名" />
        <Select k="role" label="役職" options={[
          { value: "executor", label: "収束員 (Executor)" },
          { value: "operator", label: "通信員 (Operator)" },
          { value: "supporter", label: "支援員 (Supporter)" },
          { value: "researcher", label: "研究員 (Researcher)" },
          { value: "negotiator", label: "外交員 (Negotiator)" },
          { value: "commander", label: "指揮官 (Commander)" },
          { value: "other", label: "その他" },
        ]} />
        <Field k="rank" label="階級（任意）" placeholder="例: 上級収束員" />
        <Field k="division" label="所属班（任意）" placeholder="例: 九重支部第一班" />
        <div>
          <label className={LABEL}>クリアランスレベル</label>
          <input type="number" min={1} max={5} className={INPUT} value={v("clearance_level", "1")} onChange={e => p({ clearance_level: Number(e.target.value) })} />
        </div>
        <Select k="status" label="在籍状況" options={[
          { value: "active", label: "active（在籍）" },
          { value: "inactive", label: "inactive（非活動）" },
          { value: "missing", label: "missing（行方不明）" },
          { value: "deceased", label: "deceased（死亡）" },
          { value: "unknown", label: "unknown（不明）" },
        ]} />
      </div>
      <RichField k="profile" label="プロフィール" height="180px" />
      <TextArea k="notes" label="備考（任意）" rows={3} />
    </div>
  );

  // ── INCIDENT ─────────────────────────────────────────────────────────────
  if (category === "incidents") return (
    <div className="space-y-4 max-w-2xl">
      <SectionLabel color="accent" label="インシデントデータ" />
      <div className="grid grid-cols-2 gap-4">
        <Field k="incident_id" label="インシデントID" placeholder="KAI-I-001" />
        <Field k="title" label="タイトル" />
        <Field k="incident_date" label="発生日時" placeholder="例: 20XX-XX-XX 14:30" />
        <Select k="severity" label="重大度" options={[
          { value: "low", label: "low（軽微）" },
          { value: "medium", label: "medium（中程度）" },
          { value: "high", label: "high（重大）" },
          { value: "critical", label: "critical（最重大）" },
        ]} />
      </div>
      <RichField k="description" label="概要" height="160px" />
      <div>
        <label className={LABEL}>関連アノマリー（レコードID、カンマ区切り）</label>
        <input
          className={INPUT}
          value={(() => { try { return (JSON.parse(v("involved_anomalies", "[]")) as string[]).join(", "); } catch { return ""; } })()}
          onChange={e => p({ involved_anomalies: JSON.stringify(e.target.value.split(",").map(s => s.trim()).filter(Boolean)) })}
          placeholder="例: KAI-A-001, KAI-A-002"
        />
      </div>
      <div>
        <label className={LABEL}>関連職員（スタッフID、カンマ区切り）</label>
        <input
          className={INPUT}
          value={(() => { try { return (JSON.parse(v("involved_staff", "[]")) as string[]).join(", "); } catch { return ""; } })()}
          onChange={e => p({ involved_staff: JSON.stringify(e.target.value.split(",").map(s => s.trim()).filter(Boolean)) })}
          placeholder="例: KAI-S-001, KAI-S-002"
        />
      </div>
      <RichField k="outcome" label="結果・対処" height="140px" />
      <RichField k="report" label="詳細レポート（任意）" height="180px" />
    </div>
  );

  return <div className="text-[#6a9a78] text-sm">カテゴリーが不明です</div>;
}

function SectionLabel({ color, label }: { color: string; label: string }) {
  const COLORS: Record<string, string> = {
    error: "text-[#ff3355] border-[#ff3355]",
    secondary: "text-[#00aaff] border-[#00aaff]",
    warn: "text-[#ffcc00] border-[#ffcc00]",
    primary: "text-[#00ff88] border-[#00ff88]",
    accent: "text-[#ff6b35] border-[#ff6b35]",
  };
  return (
    <div className={`text-xs tracking-wider pb-2 border-b mb-1 ${COLORS[color] ?? "text-[#6a9a78] border-[#1a2e22]"}`}>
      {label}
    </div>
  );
}
