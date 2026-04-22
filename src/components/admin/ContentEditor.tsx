"use client";
// Edited: 2026-04-22
import { useRef, useState } from "react";

interface ContentEditorProps {
  value: string;
  onChange: (v: string) => void;
  height?: string;
}

const COLOR_OPTIONS = [
  { key: "primary", label: "緑 (primary)", cls: "text-[#00ff88]" },
  { key: "secondary", label: "青 (secondary)", cls: "text-[#00aaff]" },
  { key: "accent", label: "橙 (accent)", cls: "text-[#ff6b35]" },
  { key: "warn", label: "黄 (warn)", cls: "text-[#ffcc00]" },
  { key: "error", label: "赤 (error)", cls: "text-[#ff3355]" },
  { key: "text-dim", label: "暗 (dim)", cls: "text-[#6a9a78]" },
];

export function ContentEditor({ value, onChange, height = "400px" }: ContentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRubyModal, setShowRubyModal] = useState(false);
  const [rubyBase, setRubyBase] = useState("");
  const [rubyReading, setRubyReading] = useState("");

  // Insert text at cursor position
  const insert = (before: string, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    // Find line start
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newVal = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertRuby = () => {
    if (!rubyBase) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = `｜${rubyBase}《${rubyReading}》`;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    setShowRubyModal(false);
    setRubyBase("");
    setRubyReading("");
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
  };

  const insertColor = (color: string) => {
    insert(`{c:${color}}`, `{/c}`);
    setShowColorPicker(false);
  };

  // Add a new choice line with visual editor
  const insertChoice = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineEnd = value.indexOf("\n", start);
    const insertPos = lineEnd === -1 ? value.length : lineEnd;
    const choiceText = "\n＜選択肢1＞　　＜選択肢2＞";
    const newVal = value.slice(0, insertPos) + choiceText + value.slice(insertPos);
    onChange(newVal);
    setTimeout(() => { ta.focus(); }, 0);
  };

  const btnCls = "px-2 py-1 text-xs border border-[#1a2e22] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors cursor-pointer select-none bg-[#0d1410] text-[#6a9a78]";

  return (
    <div className="flex flex-col gap-1">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-[#080c0a] border border-[#1a2e22]">
        {/* Line prefixes */}
        <div className="flex gap-1 border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} title="システムメッセージ (＃)" onClick={() => insertAtLineStart("＃")}>＃ Sys</button>
          <button className={btnCls} title="キャラクタースピーチ (＄)" onClick={() => insertAtLineStart("＄")}>＄ Char</button>
          <button className={btnCls} title="ユーザー入力 (>>)" onClick={() => insertAtLineStart(">>")}>{">> User"}</button>
        </div>

        {/* Ruby */}
        <div className="relative border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} onClick={() => {
            const ta = textareaRef.current;
            if (!ta) return;
            const sel = value.slice(ta.selectionStart, ta.selectionEnd);
            setRubyBase(sel);
            setShowRubyModal(true);
          }}>
            ルビ ｜《》
          </button>
        </div>

        {/* Color */}
        <div className="relative border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} onClick={() => setShowColorPicker(!showColorPicker)}>
            色 {"{c:}"}
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-[#0d1410] border border-[#2a4a36] min-w-[140px] shadow-lg">
              {COLOR_OPTIONS.map(({ key, label, cls }) => (
                <button
                  key={key}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#003318] ${cls}`}
                  onClick={() => insertColor(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag link */}
        <div className="relative border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} onClick={() => insert("[[", "]]")} title="タグリンク [[ID]]">
            [[link]]
          </button>
        </div>

        {/* Choices */}
        <div className="relative border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} onClick={insertChoice} title="選択肢">
            ＜選択肢＞
          </button>
        </div>

        {/* Corrupted */}
        <div className="relative border-r border-[#1a2e22] pr-2 mr-1">
          <button className={btnCls} onClick={() => insert("██")} title="文字化け">
            ██
          </button>
        </div>

        {/* Divider */}
        <button className={btnCls} onClick={() => insert("\n──────────────────────────────────────────────────────\n")} title="区切り線">
          ─ 区切り
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-mono text-sm bg-[#080c0a] text-[#c8e6d4] border border-[#1a2e22] focus:outline-none focus:border-[#2a4a36] p-3 resize-none leading-7"
        style={{ height }}
        spellCheck={false}
      />

      {/* Ruby modal */}
      {showRubyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0d1410] border border-[#2a4a36] p-6 w-80 shadow-xl">
            <h3 className="text-[#00ff88] text-sm font-mono mb-4">ルビ設定</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[#6a9a78] text-xs block mb-1">ベース文字 (漢字など)</label>
                <input
                  value={rubyBase}
                  onChange={(e) => setRubyBase(e.target.value)}
                  className="w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1 text-sm font-mono focus:outline-none focus:border-[#00ff88]"
                  placeholder="例: 海蝕"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[#6a9a78] text-xs block mb-1">読み (ふりがな)</label>
                <input
                  value={rubyReading}
                  onChange={(e) => setRubyReading(e.target.value)}
                  className="w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1 text-sm font-mono focus:outline-none focus:border-[#00ff88]"
                  placeholder="例: かいしょく"
                  onKeyDown={(e) => e.key === "Enter" && insertRuby()}
                />
              </div>
              <div className="text-[#6a9a78] text-xs">
                プレビュー: <span className="text-[#c8e6d4]">｜{rubyBase || "　"}《{rubyReading || "　"}》</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={insertRuby}
                className="flex-1 px-3 py-1.5 text-xs border border-[#00ff88] text-[#00ff88] hover:bg-[#003318] transition-colors"
              >
                挿入
              </button>
              <button
                onClick={() => setShowRubyModal(false)}
                className="flex-1 px-3 py-1.5 text-xs border border-[#1a2e22] text-[#6a9a78] hover:border-[#2a4a36] transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
