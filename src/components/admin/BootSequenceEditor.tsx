"use client";
// Edited: 2026-04-22
import { useState } from "react";

interface BootMessage {
  text: string;
  type: "info" | "error" | "warn" | "success";
  delay: number;
}

interface BootSequenceEditorProps {
  value: string; // JSON string of BootMessage[]
  onChange: (v: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  info: "text-[#c8e6d4]",
  error: "text-[#ff3355]",
  warn: "text-[#ffcc00]",
  success: "text-[#00ff88]",
};

export function BootSequenceEditor({ value, onChange }: BootSequenceEditorProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let messages: BootMessage[] = [];
  try {
    messages = JSON.parse(value) || [];
  } catch {}

  const save = (msgs: BootMessage[]) => onChange(JSON.stringify(msgs, null, 2));

  const add = () => save([...messages, { text: "新しいメッセージ", type: "info", delay: 0 }]);

  const update = (i: number, patch: Partial<BootMessage>) => {
    const msgs = [...messages];
    msgs[i] = { ...msgs[i], ...patch };
    save(msgs);
  };

  const remove = (i: number) => {
    const msgs = [...messages];
    msgs.splice(i, 1);
    save(msgs);
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const msgs = [...messages];
    [msgs[i - 1], msgs[i]] = [msgs[i], msgs[i - 1]];
    save(msgs);
  };

  const moveDown = (i: number) => {
    if (i === messages.length - 1) return;
    const msgs = [...messages];
    [msgs[i], msgs[i + 1]] = [msgs[i + 1], msgs[i]];
    save(msgs);
  };

  const handleRaw = (raw: string) => {
    onChange(raw);
    try {
      JSON.parse(raw);
      setError(null);
    } catch {
      setError("JSON形式が不正です");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[#6a9a78] text-xs">ブートシーケンス ({messages.length}件)</span>
        <button
          className="text-xs text-[#2a4a36] hover:text-[#6a9a78]"
          onClick={() => setShowRaw(!showRaw)}
        >
          {showRaw ? "ビジュアル" : "RAW JSON"}
        </button>
      </div>

      {showRaw ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => handleRaw(e.target.value)}
            rows={8}
            className="w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#2a4a36] resize-none"
          />
          {error && <p className="text-[#ff3355] text-xs mt-1">{error}</p>}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-1.5 p-2 bg-[#080c0a] border border-[#1a2e22]">
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5 pt-0.5">
                <button onClick={() => moveUp(i)} className="text-[#2a4a36] hover:text-[#6a9a78] text-xs leading-3">▲</button>
                <button onClick={() => moveDown(i)} className="text-[#2a4a36] hover:text-[#6a9a78] text-xs leading-3">▼</button>
              </div>

              {/* Type selector */}
              <select
                value={msg.type}
                onChange={(e) => update(i, { type: e.target.value as BootMessage["type"] })}
                className={`bg-[#0d1410] border border-[#1a2e22] px-1 py-0.5 text-xs font-mono focus:outline-none w-20 ${TYPE_COLORS[msg.type]}`}
              >
                <option value="info">info</option>
                <option value="success">success</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>

              {/* Text */}
              <input
                value={msg.text}
                onChange={(e) => update(i, { text: e.target.value })}
                className={`flex-1 bg-[#080c0a] border border-[#1a2e22] px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-[#00ff88] ${TYPE_COLORS[msg.type]}`}
              />

              {/* Delay */}
              <div className="flex items-center gap-1">
                <span className="text-[#2a4a36] text-xs">ms</span>
                <input
                  type="number"
                  value={msg.delay}
                  onChange={(e) => update(i, { delay: Number(e.target.value) })}
                  className="w-16 bg-[#080c0a] border border-[#1a2e22] text-[#6a9a78] px-1 py-0.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <button onClick={() => remove(i)} className="text-[#ff3355] hover:text-[#ff6677] text-xs">✕</button>
            </div>
          ))}
          <button
            onClick={add}
            className="w-full text-xs text-[#00ff88] hover:text-[#00cc6a] border border-dashed border-[#1a2e22] hover:border-[#00ff88] py-1.5 transition-colors"
          >
            + メッセージを追加
          </button>
        </div>
      )}
    </div>
  );
}
