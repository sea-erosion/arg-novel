"use client";
// Edited: 2026-04-22
import { useState } from "react";

interface ChoiceEditorProps {
  content: string;
  onChange: (content: string) => void;
}

interface ChoiceLine {
  lineIndex: number;
  choices: string[];
}

function parseChoiceLines(content: string): ChoiceLine[] {
  const lines = content.split("\n");
  const result: ChoiceLine[] = [];
  lines.forEach((line, idx) => {
    const matches = [...line.matchAll(/＜([^＞]+)＞/g)];
    if (matches.length > 0) {
      result.push({ lineIndex: idx, choices: matches.map(m => m[1]) });
    }
  });
  return result;
}

function rebuildChoiceLine(choices: string[]): string {
  return choices.map(c => `＜${c}＞`).join("　　");
}

export function ChoiceEditor({ content, onChange }: ChoiceEditorProps) {
  const choiceLines = parseChoiceLines(content);

  const updateChoiceLine = (lineIndex: number, newChoices: string[]) => {
    const lines = content.split("\n");
    lines[lineIndex] = rebuildChoiceLine(newChoices);
    onChange(lines.join("\n"));
  };

  const addChoice = (lineIndex: number) => {
    const lines = content.split("\n");
    const matches = [...lines[lineIndex].matchAll(/＜([^＞]+)＞/g)];
    const choices = matches.map(m => m[1]);
    choices.push("新しい選択肢");
    lines[lineIndex] = rebuildChoiceLine(choices);
    onChange(lines.join("\n"));
  };

  const removeChoice = (lineIndex: number, choiceIdx: number) => {
    const lines = content.split("\n");
    const matches = [...lines[lineIndex].matchAll(/＜([^＞]+)＞/g)];
    const choices = matches.map(m => m[1]);
    choices.splice(choiceIdx, 1);
    lines[lineIndex] = choices.length > 0 ? rebuildChoiceLine(choices) : "";
    onChange(lines.join("\n"));
  };

  const updateChoice = (lineIndex: number, choiceIdx: number, newText: string) => {
    const lines = content.split("\n");
    const matches = [...lines[lineIndex].matchAll(/＜([^＞]+)＞/g)];
    const choices = matches.map(m => m[1]);
    choices[choiceIdx] = newText;
    lines[lineIndex] = rebuildChoiceLine(choices);
    onChange(lines.join("\n"));
  };

  if (choiceLines.length === 0) {
    return (
      <div className="text-[#2a4a36] text-xs text-center py-4">
        コンテンツに選択肢がありません。<br />
        ツールバーから「＜選択肢＞」ボタンで追加できます。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {choiceLines.map(({ lineIndex, choices }) => (
        <div key={lineIndex} className="border border-[#1a2e22] p-3 bg-[#080c0a]">
          <div className="text-[#6a9a78] text-xs mb-2">行 {lineIndex + 1}</div>
          <div className="space-y-2">
            {choices.map((choice, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <span className="text-[#6a9a78] text-xs w-4">＜</span>
                <input
                  value={choice}
                  onChange={(e) => updateChoice(lineIndex, ci, e.target.value)}
                  className="flex-1 bg-[#0d1410] border border-[#1a2e22] text-[#c8e6d4] px-2 py-1 text-sm font-mono focus:outline-none focus:border-[#00ff88]"
                />
                <span className="text-[#6a9a78] text-xs w-4">＞</span>
                <button
                  onClick={() => removeChoice(lineIndex, ci)}
                  className="text-[#ff3355] hover:text-[#ff6677] text-xs px-1"
                  title="削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => addChoice(lineIndex)}
            className="mt-2 text-xs text-[#00ff88] hover:text-[#00cc6a] border border-dashed border-[#1a2e22] hover:border-[#00ff88] px-3 py-1 transition-colors w-full"
          >
            + 選択肢を追加
          </button>
        </div>
      ))}
    </div>
  );
}
