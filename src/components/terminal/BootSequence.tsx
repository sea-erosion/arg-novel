"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BootMessage } from "@/types";

interface BootSequenceProps {
  messages: BootMessage[];
  onComplete: () => void;
}

export function BootSequence({ messages, onComplete }: BootSequenceProps) {
  const [visibleMessages, setVisibleMessages] = useState<BootMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentIndex >= messages.length) {
      const t = setTimeout(() => {
        setDone(true);
        setTimeout(onComplete, 600);
      }, 500);
      return () => clearTimeout(t);
    }

    const msg = messages[currentIndex];
    const t = setTimeout(() => {
      setVisibleMessages((prev) => [...prev, msg]);
      setCurrentIndex((i) => i + 1);
    }, msg.delay);

    return () => clearTimeout(t);
  }, [currentIndex, messages, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
      initial={{ opacity: 1 }}
      animate={done ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full max-w-2xl px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="font-display text-4xl text-primary mb-2" style={{ fontSize: "3rem" }}>
            KAI-DIARY v2.3.1
          </div>
          <div className="text-dim text-xs tracking-widest uppercase">
            Personal Archive Interface — Emergency Boot
          </div>
        </div>

        {/* Terminal output */}
        <div className="terminal-window p-4 min-h-64 font-mono text-sm">
          <AnimatePresence>
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex items-start gap-2 leading-6 ${
                  msg.type === "error"
                    ? "text-error"
                    : msg.type === "warn"
                    ? "text-warn"
                    : msg.type === "success"
                    ? "text-primary"
                    : "text-text-dim"
                }`}
              >
                <span className="shrink-0 text-muted select-none">
                  {msg.type === "error" ? "!!" : msg.type === "warn" ? ">>" : "::"}
                </span>
                <TypedText text={msg.text} speed={12} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Blinking cursor */}
          {!done && (
            <div className="mt-1 h-5 flex items-center">
              <span className="w-2 h-4 bg-primary inline-block" style={{
                animation: "blink-cursor 1s step-end infinite"
              }} />
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-px bg-border-bright overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{
              width: `${Math.round((currentIndex / messages.length) * 100)}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function TypedText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayed}</span>;
}
