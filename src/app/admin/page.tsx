"use client";
// Edited: 2026-04-22
import { useCallback, useEffect, useState } from "react";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { ChoiceEditor } from "@/components/admin/ChoiceEditor";
import { FlagsEditor } from "@/components/admin/FlagsEditor";
import { BootSequenceEditor } from "@/components/admin/BootSequenceEditor";
import { DataRecordEditor, type DataCategory } from "@/components/admin/DataRecordEditor";

// ─── Types ───────────────────────────────────────────────────────────────────
type EntryTab = "content" | "choices" | "flags" | "meta";
type SidebarSection = "novels" | "data";
type DataRecord = Record<string, unknown>;

interface Novel { id: string; title: string; slug: string; description: string; cover_text: string; boot_sequence: string; }
interface Entry {
  id: string; novel_id: string; slug: string; title: string; content: string;
  entry_type: string; required_flags: string; unlock_flags: string;
  order_index: number; is_locked: number; scp_class: string | null;
}

const DATA_CATEGORIES: { key: DataCategory; label: string; color: string; idField: string; prefix: string }[] = [
  { key: "anomalies",  label: "アノマリー",       color: "text-[#ff3355]",  idField: "record_id",   prefix: "KAI-A-" },
  { key: "facilities", label: "施設",             color: "text-[#00aaff]",  idField: "facility_id", prefix: "KAI-F-" },
  { key: "modules",    label: "モジュール",        color: "text-[#ffcc00]",  idField: "module_id",   prefix: "KAI-M-" },
  { key: "staff",      label: "職員",             color: "text-[#00ff88]",  idField: "staff_id",    prefix: "KAI-S-" },
  { key: "incidents",  label: "インシデント",      color: "text-[#ff6b35]",  idField: "incident_id", prefix: "KAI-I-" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const INPUT = "w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[#2a4a36] transition-colors";
const LABEL = "block text-[#6a9a78] text-xs mb-1";
const BTN_PRIMARY = "px-3 py-1.5 text-xs border border-[#00ff88] text-[#00ff88] hover:bg-[#003318] transition-colors font-mono";
const BTN_DANGER = "px-3 py-1.5 text-xs border border-[#ff3355] text-[#ff3355] hover:bg-[#1a0010] transition-colors font-mono";

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dataRecords, setDataRecords] = useState<Record<DataCategory, DataRecord[]>>({
    anomalies: [], facilities: [], modules: [], staff: [], incidents: [],
  });
  const [activeDataCategory, setActiveDataCategory] = useState<DataCategory>("anomalies");

  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [selectedData, setSelectedData] = useState<DataRecord | null>(null);

  const [sidebarSection, setSidebarSection] = useState<SidebarSection>("novels");
  const [entryTab, setEntryTab] = useState<EntryTab>("content");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draft, setDraft] = useState<DataRecord>({});
  const [isDirty, setIsDirty] = useState(false);
  const [migrated, setMigrated] = useState(false);

  // ── Init / migrate ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/migrate", { method: "POST" })
      .then(() => setMigrated(true))
      .catch(() => setMigrated(true));
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadNovels = useCallback(async () => {
    const r = await fetch("/api/admin/novels"); const d = await r.json();
    setNovels(d.novels || []);
  }, []);

  const loadEntries = useCallback(async (novelId: string) => {
    const r = await fetch(`/api/admin/entries?novel_id=${novelId}`); const d = await r.json();
    setEntries(d.entries || []);
  }, []);

  const loadDataCategory = useCallback(async (cat: DataCategory) => {
    const r = await fetch(`/api/admin/${cat}`); const d = await r.json();
    setDataRecords(prev => ({ ...prev, [cat]: d.records || [] }));
  }, []);

  useEffect(() => { if (migrated) { loadNovels(); DATA_CATEGORIES.forEach(c => loadDataCategory(c.key)); } }, [migrated, loadNovels, loadDataCategory]);

  // ── Select handlers ───────────────────────────────────────────────────────
  const selectNovel = (n: Novel) => {
    setSelectedNovel(n); setSelectedEntry(null); setSelectedData(null);
    setDraft({ ...n }); setIsDirty(false); setEntryTab("meta"); loadEntries(n.id);
  };
  const selectEntry = (e: Entry) => {
    setSelectedEntry(e); setSelectedData(null);
    setDraft({ ...e }); setIsDirty(false); setEntryTab("content");
  };
  const selectData = (r: DataRecord) => {
    setSelectedData(r); setSelectedEntry(null); setSelectedNovel(null);
    setDraft({ ...r }); setIsDirty(false);
  };

  const patchDraft = (patch: Partial<DataRecord>) => { setDraft(prev => ({ ...prev, ...patch })); setIsDirty(true); };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaveStatus("saving");
    try {
      let url = "", res: Response;
      if (selectedEntry) {
        url = `/api/admin/entries/${selectedEntry.id}`;
      } else if (selectedNovel) {
        url = `/api/admin/novels/${selectedNovel.id}`;
      } else if (selectedData) {
        url = `/api/admin/${activeDataCategory}/${selectedData.id}`;
      } else { setSaveStatus("idle"); return; }

      res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (selectedEntry) {
        setSelectedEntry(data.record ?? data.entry);
        setEntries(prev => prev.map(e => e.id === (data.record ?? data.entry).id ? (data.record ?? data.entry) : e));
      } else if (selectedNovel) {
        setSelectedNovel(data.record ?? data.novel);
        setNovels(prev => prev.map(n => n.id === (data.record ?? data.novel).id ? (data.record ?? data.novel) : n));
      } else if (selectedData) {
        setSelectedData(data.record);
        setDataRecords(prev => ({ ...prev, [activeDataCategory]: prev[activeDataCategory].map(r => r.id === data.record.id ? data.record : r) }));
      }
      setSaveStatus("saved"); setIsDirty(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) { console.error(e); setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  // ── Create helpers ────────────────────────────────────────────────────────
  const createNovel = async () => {
    const title = prompt("小説タイトル:"); if (!title) return;
    const slug = prompt("スラッグ:", title.toLowerCase().replace(/\s+/g, "-")); if (!slug) return;
    const res = await fetch("/api/admin/novels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, slug, description: "", cover_text: "", boot_sequence: "[]" }) });
    const d = await res.json(); if (res.ok) { await loadNovels(); selectNovel(d.novel); }
  };

  const createEntry = async () => {
    if (!selectedNovel) return;
    const title = prompt("エントリータイトル:"); if (!title) return;
    const slug = prompt("スラッグ:", title.toLowerCase().replace(/[\s　]+/g, "-").replace(/[^\w-]/g, "")); if (!slug) return;
    const maxOrder = entries.reduce((m, e) => Math.max(m, Number(e.order_index)), -1);
    const res = await fetch("/api/admin/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ novel_id: selectedNovel.id, slug, title, content: "", entry_type: "diary", required_flags: "[]", unlock_flags: "{}", order_index: maxOrder + 1, is_locked: 0 }) });
    const d = await res.json(); if (res.ok) { await loadEntries(selectedNovel.id); selectEntry(d.entry); }
  };

  const createDataRecord = async (cat: DataCategory) => {
    const catInfo = DATA_CATEGORIES.find(c => c.key === cat)!;
    const recordId = prompt(`${catInfo.label}のID (例: ${catInfo.prefix}001):`); if (!recordId) return;
    const name = prompt("名称:"); if (!name) return;
    const body: DataRecord = { [catInfo.idField]: recordId, name };
    if (cat === "staff") { body.profile = ""; body.role = "executor"; body.status = "active"; body.clearance_level = 1; }
    else if (cat === "incidents") { body.title = name; body.incident_date = ""; body.severity = "low"; body.description = ""; body.involved_anomalies = "[]"; body.involved_staff = "[]"; body.outcome = ""; }
    const res = await fetch(`/api/admin/${cat}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    if (res.ok) { await loadDataCategory(cat); setActiveDataCategory(cat); selectData(d.record); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteEntry = async () => {
    if (!selectedEntry || !confirm(`「${selectedEntry.title}」を削除しますか？`)) return;
    await fetch(`/api/admin/entries/${selectedEntry.id}`, { method: "DELETE" });
    setSelectedEntry(null); setDraft({});
    if (selectedNovel) loadEntries(selectedNovel.id);
  };
  const deleteNovel = async () => {
    if (!selectedNovel || !confirm(`「${selectedNovel.title}」と全エントリーを削除しますか？`)) return;
    await fetch(`/api/admin/novels/${selectedNovel.id}`, { method: "DELETE" });
    setSelectedNovel(null); setSelectedEntry(null); setDraft({}); setEntries([]); loadNovels();
  };
  const deleteDataRecord = async () => {
    if (!selectedData || !confirm(`このレコードを削除しますか？`)) return;
    await fetch(`/api/admin/${activeDataCategory}/${selectedData.id}`, { method: "DELETE" });
    setSelectedData(null); setDraft({});
    loadDataCategory(activeDataCategory);
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (isDirty) save(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [isDirty, draft, selectedEntry, selectedNovel, selectedData]);

  const isEditing = selectedEntry || selectedNovel || selectedData;
  const activeCatInfo = DATA_CATEGORIES.find(c => c.key === activeDataCategory);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#080c0a] font-mono overflow-hidden">

      {/* ─ Sidebar ─ */}
      <aside className="w-64 border-r border-[#1a2e22] flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-[#1a2e22]">
          <div className="text-[#00ff88] text-xs tracking-widest">ADMIN EDITOR</div>
          <div className="text-[#2a4a36] text-[10px] mt-0.5">ARG Novel System v2</div>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-[#1a2e22]">
          {(["novels", "data"] as SidebarSection[]).map(s => (
            <button key={s} onClick={() => setSidebarSection(s)}
              className={cls("flex-1 py-2 text-xs transition-colors",
                sidebarSection === s ? "text-[#00ff88] bg-[#003318] border-b border-[#00ff88]" : "text-[#6a9a78] hover:text-[#c8e6d4]"
              )}>
              {s === "novels" ? "小説" : "データ"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Novels ── */}
          {sidebarSection === "novels" && (
            <>
              {novels.map(novel => (
                <div key={novel.id}>
                  <button onClick={() => selectNovel(novel)}
                    className={cls("w-full text-left px-3 py-2 text-xs border-b border-[#1a2e22] flex items-center gap-2 transition-colors",
                      selectedNovel?.id === novel.id && !selectedEntry ? "bg-[#003318] text-[#00ff88]" : "text-[#c8e6d4] hover:bg-[#0d1410]"
                    )}>
                    <span className="text-[#2a4a36]">◆</span>
                    <span className="truncate flex-1">{novel.title}</span>
                  </button>
                  {selectedNovel?.id === novel.id && entries.map(entry => (
                    <button key={entry.id} onClick={() => selectEntry(entry)}
                      className={cls("w-full text-left pl-6 pr-3 py-1.5 text-xs border-b border-[#0d1410] flex items-center gap-2 transition-colors",
                        selectedEntry?.id === entry.id ? "bg-[#001a0d] text-[#00cc6a]" : "text-[#6a9a78] hover:bg-[#0a110d] hover:text-[#c8e6d4]"
                      )}>
                      <span className="text-[#1a2e22] text-[10px]">{entry.is_locked ? "🔒" : "▸"}</span>
                      <span className="truncate flex-1">{entry.title}</span>
                      <span className="text-[#1a2e22] text-[10px]">{entry.order_index}</span>
                    </button>
                  ))}
                  {selectedNovel?.id === novel.id && (
                    <button onClick={createEntry} className="w-full text-left pl-6 pr-3 py-1.5 text-[10px] text-[#2a4a36] hover:text-[#00ff88] border-b border-[#0d1410] transition-colors">
                      + エントリー追加
                    </button>
                  )}
                </div>
              ))}
              <button onClick={createNovel} className="w-full text-left px-3 py-2 text-xs text-[#2a4a36] hover:text-[#00ff88] transition-colors border-t border-[#1a2e22]">
                + 小説を追加
              </button>
            </>
          )}

          {/* ── Data ── */}
          {sidebarSection === "data" && (
            <>
              {DATA_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  {/* Category header */}
                  <button
                    onClick={() => { setActiveDataCategory(cat.key); setSelectedData(null); setSelectedEntry(null); setSelectedNovel(null); setDraft({}); setIsDirty(false); }}
                    className={cls("w-full text-left px-3 py-2 text-xs border-b border-[#1a2e22] flex items-center gap-2 font-bold transition-colors",
                      activeDataCategory === cat.key ? `bg-[#0d1410] ${cat.color}` : "text-[#6a9a78] hover:bg-[#0d1410]"
                    )}>
                    <span className={cat.color}>■</span>
                    <span className="flex-1">{cat.label}</span>
                    <span className="text-[#2a4a36] text-[10px] font-normal">{dataRecords[cat.key].length}</span>
                  </button>

                  {/* Records under active category */}
                  {activeDataCategory === cat.key && dataRecords[cat.key].map((rec) => {
                    const rid = String(rec[cat.idField] ?? rec.id);
                    const name = String(rec.name ?? rec.title ?? rid);
                    return (
                      <button key={String(rec.id)} onClick={() => selectData(rec)}
                        className={cls("w-full text-left pl-6 pr-3 py-1.5 text-xs border-b border-[#0d1410] flex items-center gap-2 transition-colors",
                          selectedData?.id === rec.id ? "bg-[#001a0d] text-[#00cc6a]" : "text-[#6a9a78] hover:bg-[#0a110d] hover:text-[#c8e6d4]"
                        )}>
                        <span className="text-[#1a2e22] text-[10px]">▸</span>
                        <span className={`text-[10px] ${cat.color} opacity-70`}>{rid}</span>
                        <span className="truncate flex-1 text-[11px]">{name}</span>
                      </button>
                    );
                  })}

                  {/* Add button for active category */}
                  {activeDataCategory === cat.key && (
                    <button onClick={() => createDataRecord(cat.key)}
                      className="w-full text-left pl-6 pr-3 py-1.5 text-[10px] text-[#2a4a36] hover:text-[#00ff88] border-b border-[#0d1410] transition-colors">
                      + {cat.label}を追加
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ─ Main ─ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a2e22] bg-[#0d1410]">
          <div className="flex-1 text-xs text-[#6a9a78] truncate">
            {selectedEntry ? `${selectedNovel?.title} / ${selectedEntry.title}`
              : selectedNovel ? selectedNovel.title
              : selectedData ? `${activeCatInfo?.label}: ${String(selectedData[activeCatInfo?.idField ?? "id"] ?? "")} — ${String(selectedData.name ?? selectedData.title ?? "")}`
              : "— 未選択 —"}
          </div>
          {isDirty && <span className="text-[#ffcc00] text-xs">● 未保存</span>}
          {saveStatus === "saving" && <span className="text-[#6a9a78] text-xs">保存中...</span>}
          {saveStatus === "saved"  && <span className="text-[#00ff88] text-xs">✓ 保存済み</span>}
          {saveStatus === "error"  && <span className="text-[#ff3355] text-xs">✗ エラー</span>}
          {isEditing && <>
            <button onClick={save} disabled={!isDirty} className={isDirty ? BTN_PRIMARY : "px-3 py-1.5 text-xs border border-[#1a2e22] text-[#2a4a36] font-mono cursor-not-allowed"}>
              保存 (Ctrl+S)
            </button>
            {selectedEntry && <button onClick={deleteEntry} className={BTN_DANGER}>削除</button>}
            {selectedNovel && !selectedEntry && <button onClick={deleteNovel} className={BTN_DANGER}>削除</button>}
            {selectedData && <button onClick={deleteDataRecord} className={BTN_DANGER}>削除</button>}
          </>}
        </div>

        {!isEditing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-[#2a4a36] text-sm">← サイドバーからアイテムを選択</div>
              <div className="text-[#1a2e22] text-xs">小説・エントリー または データレコードを編集できます</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Entry tabs */}
            {selectedEntry && (
              <div className="flex border-b border-[#1a2e22] bg-[#080c0a]">
                {(["content", "choices", "flags", "meta"] as EntryTab[]).map(tab => {
                  const labels: Record<EntryTab, string> = { content: "コンテンツ", choices: "選択肢", flags: "フラグ/コマンド", meta: "メタデータ" };
                  return (
                    <button key={tab} onClick={() => setEntryTab(tab)}
                      className={cls("px-4 py-2 text-xs transition-colors border-r border-[#1a2e22]",
                        entryTab === tab ? "text-[#00ff88] bg-[#003318] border-b-2 border-b-[#00ff88]" : "text-[#6a9a78] hover:text-[#c8e6d4]"
                      )}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-4">

              {/* ── Entry editor ── */}
              {selectedEntry && <>
                {entryTab === "content" && (
                  <div className="space-y-2">
                    <div className="text-[#6a9a78] text-xs mb-2">
                      <span className="text-[#c8e6d4]">＃</span>システム　
                      <span className="text-[#c8e6d4]">＄</span>キャラ　
                      <span className="text-[#c8e6d4]">{">>"}</span>ユーザー　
                      <span className="text-[#c8e6d4]">｜漢字《ふりがな》</span>ルビ　
                      <span className="text-[#c8e6d4]">{"{c:primary}…{/c}"}</span>色　
                      <span className="text-[#c8e6d4]">{"[[ID]]"}</span>タグ
                    </div>
                    <ContentEditor value={String(draft.content ?? "")} onChange={v => patchDraft({ content: v })} height="calc(100vh - 260px)" />
                  </div>
                )}
                {entryTab === "choices" && (
                  <div className="space-y-3">
                    <div className="text-[#6a9a78] text-xs">コンテンツ内の ＜選択肢＞ を視覚的に編集します</div>
                    <ChoiceEditor content={String(draft.content ?? "")} onChange={v => patchDraft({ content: v })} />
                  </div>
                )}
                {entryTab === "flags" && (
                  <div className="grid grid-cols-1 gap-6 max-w-xl">
                    <div>
                      <div className="text-[#ffcc00] text-xs mb-2">必須フラグ（解放条件）</div>
                      <FlagsEditor label="このエントリーを表示するために必要なフラグ" value={String(draft.required_flags ?? "[]")} onChange={v => patchDraft({ required_flags: v })} mode="array" />
                    </div>
                    <div>
                      <div className="text-[#00ff88] text-xs mb-2">アンロックフラグ（コマンド反応）</div>
                      <FlagsEditor label="このエントリーを読んだときにセットされるフラグ" value={String(draft.unlock_flags ?? "{}")} onChange={v => patchDraft({ unlock_flags: v })} mode="object" />
                    </div>
                  </div>
                )}
                {entryTab === "meta" && (
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <div><label className={LABEL}>タイトル</label><input className={INPUT} value={String(draft.title ?? "")} onChange={e => patchDraft({ title: e.target.value })} /></div>
                    <div><label className={LABEL}>スラッグ</label><input className={INPUT} value={String(draft.slug ?? "")} onChange={e => patchDraft({ slug: e.target.value })} /></div>
                    <div>
                      <label className={LABEL}>エントリータイプ</label>
                      <select className={INPUT} value={String(draft.entry_type ?? "diary")} onChange={e => patchDraft({ entry_type: e.target.value })}>
                        {["diary","log","system","dialogue","scp_record"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className={LABEL}>表示順序</label><input type="number" className={INPUT} value={Number(draft.order_index ?? 0)} onChange={e => patchDraft({ order_index: Number(e.target.value) })} /></div>
                    <div><label className={LABEL}>SCPクラス (任意)</label><input className={INPUT} value={String(draft.scp_class ?? "")} onChange={e => patchDraft({ scp_class: e.target.value || null })} placeholder="Safe / Euclid / Keter" /></div>
                    <div className="flex items-center gap-3 pt-5">
                      <input type="checkbox" id="is_locked" checked={Boolean(draft.is_locked)} onChange={e => patchDraft({ is_locked: e.target.checked ? 1 : 0 })} className="accent-[#00ff88]" />
                      <label htmlFor="is_locked" className="text-[#6a9a78] text-xs cursor-pointer">ロック（フラグなしでは読めない）</label>
                    </div>
                  </div>
                )}
              </>}

              {/* ── Novel editor ── */}
              {selectedNovel && !selectedEntry && (
                <div className="space-y-4 max-w-2xl">
                  <div className="text-[#00ff88] text-xs tracking-wider mb-3">小説設定</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={LABEL}>タイトル</label><input className={INPUT} value={String(draft.title ?? "")} onChange={e => patchDraft({ title: e.target.value })} /></div>
                    <div><label className={LABEL}>スラッグ</label><input className={INPUT} value={String(draft.slug ?? "")} onChange={e => patchDraft({ slug: e.target.value })} /></div>
                  </div>
                  <div><label className={LABEL}>説明文</label><textarea className={`${INPUT} resize-none`} rows={3} value={String(draft.description ?? "")} onChange={e => patchDraft({ description: e.target.value })} /></div>
                  <div><label className={LABEL}>カバーテキスト</label><input className={INPUT} value={String(draft.cover_text ?? "")} onChange={e => patchDraft({ cover_text: e.target.value })} /></div>
                  <BootSequenceEditor value={String(draft.boot_sequence ?? "[]")} onChange={v => patchDraft({ boot_sequence: v })} />
                </div>
              )}

              {/* ── Data record editor ── */}
              {selectedData && !selectedEntry && !selectedNovel && (
                <DataRecordEditor
                  category={activeDataCategory}
                  draft={draft}
                  onChange={patchDraft}
                />
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
