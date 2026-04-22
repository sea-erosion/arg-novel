"use client";
// Edited: 2026-04-22

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface InlineCardProps { id: string; }

interface UnifiedRecord {
  category: string; record_id: string; name: string;
  badge: string; badge_color: string; subtitle: string;
  description: string; extra?: string | null;
}

const BADGE_COLORS: Record<string, string> = {
  error:     "text-[#ff3355] border-[#ff3355]",
  secondary: "text-[#00aaff] border-[#00aaff]",
  warn:      "text-[#ffcc00] border-[#ffcc00]",
  primary:   "text-[#00ff88] border-[#00ff88]",
  accent:    "text-[#ff6b35] border-[#ff6b35]",
  "text-dim":"text-[#6a9a78] border-[#6a9a78]",
};
const BADGE_BG: Record<string, string> = {
  error:     "bg-[#1a0008]", secondary: "bg-[#001a2e]", warn: "bg-[#1a1400]",
  primary:   "bg-[#003318]", accent:    "bg-[#1a0e00]", "text-dim": "bg-[#0a110d]",
};

// category → admin detail page base path
const DETAIL_PATH: Record<string, string> = {
  anomaly:    "/admin/anomalies",
  facility:   "/admin/facilities",
  module:     "/admin/modules",
  staff:      "/admin/staff",
  incident:   "/admin/incidents",
  scp_legacy: "/admin/scp",
};

export function InlineCard({ id }: InlineCardProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [data, setData]       = useState<UnifiedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // portal requires client mount
  useEffect(() => { setMounted(true); }, []);

  // Calculate popover position from trigger bounding rect
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 320;
    const rawLeft = rect.left + window.scrollX;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth + window.scrollX - POPOVER_W - 12));
    setPos({ top: rect.bottom + window.scrollY + 6, left });
  }, []);

  // Fetch record on first open
  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    fetch(`/api/records/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.record ?? {
          category: "unknown", record_id: id, name: "不明なレコード",
          badge: "UNKNOWN", badge_color: "text-dim",
          subtitle: "データが見つかりません",
          description: "このレコードは存在しないか、アクセスが制限されています。",
        });
      })
      .catch(() => setData({
        category: "error", record_id: id, name: id,
        badge: "ERROR", badge_color: "error",
        subtitle: "データ取得エラー", description: "接続に失敗しました。",
      }))
      .finally(() => setLoading(false));
  }, [open, id, data]);

  // Outside click → close
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => calcPos();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, calcPos]);

  function handleTrigger() {
    if (!open) {
      calcPos();
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function handleDetailNav() {
    if (!data) return;
    const base = DETAIL_PATH[data.category] ?? "/admin";
    router.push(`${base}/${encodeURIComponent(data.record_id)}`);
    setOpen(false);
  }

  const color    = data?.badge_color ?? "text-dim";
  const badgeCls = BADGE_COLORS[color] ?? BADGE_COLORS["text-dim"];
  const bgCls    = BADGE_BG[color]    ?? BADGE_BG["text-dim"];
  const hasDetailPage = data && DETAIL_PATH[data.category];

  return (
    <>
      {/* Trigger button — inline in text flow */}
      <button
        ref={triggerRef}
        className="inline-card text-primary hover:underline"
        onClick={handleTrigger}
        title={`レコード ${id}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        ▶ {id}
      </button>

      {/* Popover in portal — never clipped by overflow:hidden parents */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popoverRef}
              role="dialog"
              aria-modal="false"
              aria-label={`${id} 概要`}
              initial={{ opacity: 0, y: -6, scaleY: 0.94 }}
              animate={{ opacity: 1, y: 0,  scaleY: 1     }}
              exit={{    opacity: 0, y: -6, scaleY: 0.94  }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              style={{
                position:      "absolute",
                top:           pos.top,
                left:          pos.left,
                width:         320,
                zIndex:        9999,
                transformOrigin: "top left",
                fontFamily:    "'Share Tech Mono', 'Courier New', monospace",
              }}
            >
              <div
                className="border border-[#2a4a36] bg-[#0d1410] shadow-lg text-xs"
                style={{ boxShadow: "0 0 24px rgba(0,255,136,0.10)" }}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-3 py-2 border-b border-[#1a2e22] ${bgCls}`}>
                  <span className="text-[#00ff88] font-bold tracking-wider">
                    {loading ? "LOADING..." : (data?.record_id || id)}
                  </span>
                  {data && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${badgeCls}`}>
                      {data.badge}
                    </span>
                  )}
                </div>

                {/* Body */}
                {loading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-[#6a9a78]">
                    <LoadingDots /><span>データ取得中...</span>
                  </div>
                ) : data ? (
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="text-[#c8e6d4] font-bold">{data.name}</div>
                    <div className={`text-[10px] ${badgeCls.split(" ")[0]}`}>{data.subtitle}</div>
                    <div className="text-[#6a9a78] leading-5">
                      {data.description}{data.description.length >= 180 ? "…" : ""}
                    </div>
                    {data.extra && (
                      <div className="pt-1 border-t border-[#1a2e22] text-[#2a4a36] text-[10px]">
                        {data.extra}{data.extra.length >= 80 ? "…" : ""}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#080c0a] border-t border-[#1a2e22]">
                  {hasDetailPage ? (
                    <button
                      onClick={handleDetailNav}
                      className="text-[#00ff88] hover:text-[#66ffbb] transition-colors text-[10px] tracking-wider"
                      title="詳細ページへ遷移"
                    >
                      ▶▶ 詳細を見る
                    </button>
                  ) : (
                    <span className="text-[#2a4a36] text-[10px]">詳細ページなし</span>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[#2a4a36] hover:text-[#6a9a78] transition-colors text-[10px]"
                  >
                    [閉じる]
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function LoadingDots() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), 200);
    return () => clearInterval(t);
  }, []);
  return <span className="text-[#00ff88]">{"⠋⠙⠹⠸"[frame]}</span>;
}
