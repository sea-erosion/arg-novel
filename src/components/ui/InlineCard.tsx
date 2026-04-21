"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InlineCardProps {
  id: string;
}

interface ScpData {
  record_id: string;
  name: string;
  classification: string;
  description: string;
  containment_procedures: string;
}

const CLASS_COLORS: Record<string, string> = {
  Safe: "text-primary",
  Euclid: "text-warn",
  Keter: "text-error",
  Thaumiel: "text-secondary",
};

export function InlineCard({ id }: InlineCardProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ScpData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);

    // Try to fetch from scp_records API
    fetch(`/api/scp/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.record) setData(d.record);
        else {
          // Fallback: create synthetic record
          setData({
            record_id: id,
            name: `Unknown Entity ${id}`,
            classification: "Euclid",
            description: "記録が見つかりません。データが破損しているか、アクセスが制限されています。",
            containment_procedures: "[REDACTED]",
          });
        }
      })
      .catch(() => {
        setData({
          record_id: id,
          name: `${id}`,
          classification: "Euclid",
          description: "データ取得エラー。",
          containment_procedures: "[ERROR]",
        });
      })
      .finally(() => setLoading(false));
  }, [open, id, data]);

  return (
    <span className="inline relative">
      <button
        className="inline-card text-primary"
        onClick={() => setOpen((v) => !v)}
        title={`エントリ ${id} を表示`}
      >
        ▶ {id}
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1 z-40 block w-72 text-xs"
            style={{ transformOrigin: "top left" }}
          >
            <span
              className="block border border-border-bright bg-surface shadow-lg"
              style={{ boxShadow: "0 0 20px rgba(0,255,136,0.1)" }}
            >
              {/* Header */}
              <span className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border">
                <span className="text-primary font-bold tracking-wider">
                  {loading ? "LOADING..." : data?.record_id || id}
                </span>
                {data && (
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${
                      CLASS_COLORS[data.classification] || "text-dim"
                    }`}
                  >
                    ◈ {data.classification}
                  </span>
                )}
              </span>

              {loading ? (
                <span className="flex items-center gap-2 px-3 py-3 text-dim">
                  <LoadingDots />
                  <span>データ取得中...</span>
                </span>
              ) : data ? (
                <span className="block px-3 py-2 space-y-2">
                  <span className="block text-text font-bold">{data.name}</span>
                  <span className="block text-dim leading-5">
                    {data.description.slice(0, 140)}
                    {data.description.length > 140 ? "…" : ""}
                  </span>
                  <span className="block pt-1 border-t border-border text-muted text-xs">
                    収容手順: {data.containment_procedures.slice(0, 60)}
                    {data.containment_procedures.length > 60 ? "…" : ""}
                  </span>
                </span>
              ) : null}

              {/* Close hint */}
              <span className="block px-3 py-1 bg-surface-2 border-t border-border text-muted text-right">
                <button onClick={() => setOpen(false)} className="hover:text-dim transition-colors">
                  [閉じる]
                </button>
              </span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function LoadingDots() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), 200);
    return () => clearInterval(t);
  }, []);
  return <span className="text-primary">{"⠋⠙⠹⠸"[frame]}</span>;
}
