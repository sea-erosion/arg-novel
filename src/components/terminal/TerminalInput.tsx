"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalInputProps {
  onSubmit: (input: string) => void;
  placeholder?: string;
  disabled?: boolean;
  history?: string[];
}

export function TerminalInput({
  onSubmit,
  placeholder = "入力してください...",
  disabled = false,
  history = [],
}: TerminalInputProps) {
  const [value, setValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim());
      setValue("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIdx);
      if (history[newIdx]) setValue(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIdx);
      setValue(newIdx === -1 ? "" : history[newIdx] || "");
    }
  };

  return (
    <div
      className="border-t border-border px-4 py-3 bg-surface-2"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary shrink-0 select-none">&gt;&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "[INPUT LOCKED]" : placeholder}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none text-secondary text-sm font-mono placeholder:text-muted"
        />
        {value && (
          <AnimatePresence>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (value.trim()) {
                  onSubmit(value.trim());
                  setValue("");
                }
              }}
              className="text-xs text-muted hover:text-primary transition-colors px-2 py-0.5 border border-border hover:border-primary"
            >
              SEND
            </motion.button>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
