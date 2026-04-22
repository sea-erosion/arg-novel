"use client";
// Edited: 2026-04-22
import { useState } from "react";

interface FlagsEditorProps {
  label: string;
  value: string; // JSON string
  onChange: (v: string) => void;
  mode: "array" | "object";
}

export function FlagsEditor({ label, value, onChange, mode }: FlagsEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  let parsed: string[] | Record<string, boolean | string | number> | null = null;
  try {
    parsed = JSON.parse(value);
    if (error) setError(null);
  } catch {
    parsed = null;
  }

  const handleRawChange = (raw: string) => {
    onChange(raw);
    try {
      JSON.parse(raw);
      setError(null);
    } catch {
      setError("JSON形式が不正です");
    }
  };

  // Array mode (required_flags)
  const addFlag = () => {
    const arr = (parsed as string[]) || [];
    onChange(JSON.stringify([...arr, "new_flag"]));
  };

  const updateFlag = (i: number, v: string) => {
    const arr = [...((parsed as string[]) || [])];
    arr[i] = v;
    onChange(JSON.stringify(arr));
  };

  const removeFlag = (i: number) => {
    const arr = [...((parsed as string[]) || [])];
    arr.splice(i, 1);
    onChange(JSON.stringify(arr));
  };

  // Object mode (unlock_flags)
  const addPair = () => {
    const obj = { ...((parsed as Record<string, boolean | string | number>) || {}) };
    obj["new_flag"] = true;
    onChange(JSON.stringify(obj));
  };

  const updateKey = (oldKey: string, newKey: string) => {
    const obj = (parsed as Record<string, boolean | string | number>) || {};
    const newObj: Record<string, boolean | string | number> = {};
    for (const [k, v] of Object.entries(obj)) {
      newObj[k === oldKey ? newKey : k] = v;
    }
    onChange(JSON.stringify(newObj));
  };

  const updateVal = (key: string, rawVal: string) => {
    const obj = { ...((parsed as Record<string, boolean | string | number>) || {}) };
    // Try to parse as bool/number/string
    if (rawVal === "true") obj[key] = true;
    else if (rawVal === "false") obj[key] = false;
    else if (!isNaN(Number(rawVal)) && rawVal !== "") obj[key] = Number(rawVal);
    else obj[key] = rawVal;
    onChange(JSON.stringify(obj));
  };

  const removePair = (key: string) => {
    const obj = { ...((parsed as Record<string, boolean | string | number>) || {}) };
    delete obj[key];
    onChange(JSON.stringify(obj));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[#6a9a78] text-xs">{label}</label>
        <button
          className="text-xs text-[#2a4a36] hover:text-[#6a9a78] transition-colors"
          onClick={() => setShowRaw(!showRaw)}
        >
          {showRaw ? "ビジュアル" : "RAW JSON"}
        </button>
      </div>

      {showRaw ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => handleRawChange(e.target.value)}
            rows={3}
            className="w-full bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#2a4a36] resize-none"
          />
          {error && <p className="text-[#ff3355] text-xs mt-1">{error}</p>}
        </div>
      ) : mode === "array" ? (
        <div className="space-y-1.5">
          {((parsed as string[]) || []).map((flag, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={flag}
                onChange={(e) => updateFlag(i, e.target.value)}
                className="flex-1 bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#00ff88]"
                placeholder="flag_name"
              />
              <button onClick={() => removeFlag(i)} className="text-[#ff3355] text-xs hover:text-[#ff6677]">✕</button>
            </div>
          ))}
          <button
            onClick={addFlag}
            className="text-xs text-[#00ff88] hover:text-[#00cc6a] border border-dashed border-[#1a2e22] hover:border-[#00ff88] px-3 py-1 transition-colors w-full"
          >
            + フラグを追加
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {Object.entries((parsed as Record<string, boolean | string | number>) || {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <input
                value={k}
                onChange={(e) => updateKey(k, e.target.value)}
                className="flex-1 bg-[#080c0a] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#00ff88]"
                placeholder="flag_name"
              />
              <span className="text-[#6a9a78] text-xs">:</span>
              <input
                value={String(v)}
                onChange={(e) => updateVal(k, e.target.value)}
                className="w-24 bg-[#080c0a] border border-[#1a2e22] text-[#ffcc00] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#00ff88]"
                placeholder="true"
              />
              <button onClick={() => removePair(k)} className="text-[#ff3355] text-xs hover:text-[#ff6677]">✕</button>
            </div>
          ))}
          <button
            onClick={addPair}
            className="text-xs text-[#00ff88] hover:text-[#00cc6a] border border-dashed border-[#1a2e22] hover:border-[#00ff88] px-3 py-1 transition-colors w-full"
          >
            + フラグを追加
          </button>
        </div>
      )}
    </div>
  );
}
