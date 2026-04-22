import Link from "next/link";
import { db, initializeDatabase } from "@/lib/db";
import type { Novel } from "@/types";

async function getNovels(): Promise<Novel[]> {
  try {
    await initializeDatabase();
    const result = await db.execute("SELECT * FROM novels ORDER BY created_at ASC");
    return result.rows as unknown as Novel[];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function HomePage() {
  const novels = await getNovels();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Scanlines */}
      <div className="scanlines" />
      <div className="noise-overlay" />

      <div className="w-full max-w-xl relative z-10">
        {/* ASCII header */}
        <div className="text-center mb-10">
          <pre
            className="text-primary text-xs leading-3 inline-block select-none"
            style={{ fontFamily: "var(--font-mono)" }}
          >{`
 ██╗  ██╗ █████╗ ██╗      ██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗
 ██║ ██╔╝██╔══██╗██║     ██╔════╝ ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
 █████╔╝ ███████║██║     ██║  ███╗██║███████║██████╔╝ ╚████╔╝ 
 ██╔═██╗ ██╔══██║██║     ██║   ██║██║██╔══██║██╔══██╗  ╚██╔╝  
 ██║  ██╗██║  ██║███████╗╚██████╔╝██║██║  ██║██║  ██║   ██║   
 ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  
`}</pre>
          <div className="text-dim text-xs tracking-widest uppercase mt-2">
            海蝕現象記録アーカイブ — Personal Diary Access System
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted text-xs tracking-widest">AVAILABLE DEVICES</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Novel list */}
        {novels.length === 0 ? (
          <div className="terminal-window p-6 text-center">
            <div className="text-warn text-sm mb-2">!! データベースにデバイスが見つかりません</div>
            <div className="text-muted text-xs">
              初期データを投入してください:{" "}
              <code className="text-dim">npm run db:init</code>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {novels.map((novel) => (
              <Link key={novel.id} href={`/novel/${novel.slug}`}>
                <div className="terminal-window p-4 hover:border-primary transition-all duration-200 group cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-primary text-sm font-bold group-hover:text-primary mb-1 flex items-center gap-2">
                        <span className="text-muted">▶</span>
                        {novel.title}
                      </div>
                      <div className="text-dim text-xs leading-5">{novel.description}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-muted">DEVICE</div>
                      <div className="text-xs text-primary-dim font-mono">{novel.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  {novel.cover_text && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted italic">
                      "{novel.cover_text}"
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Terminal link */}
        <div className="mt-6 text-center">
          <Link
            href="/terminal"
            className="inline-block border border-border-bright text-dim text-xs px-4 py-2 hover:border-primary hover:text-primary transition-all duration-200"
          >
            ▶ KAI-TERMINAL — 端末アクセス
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-muted text-xs">
          <div>海蝕現象収束機関 九重支部 — INTERNAL SYSTEM</div>
          <div className="mt-1">UNAUTHORIZED ACCESS IS PROHIBITED</div>
        </div>
      </div>
    </div>
  );
}
