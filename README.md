# KAI-DIARY — ARG型小説閲覧サイト

海蝕現象収束機関の記録アーカイブシステム。「日記デバイス」閲覧体験を提供するARG風インタラクティブ小説プラットフォーム。

## ディレクトリ構成

```
arg-novel/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── novels/
│   │   │   │   ├── route.ts          # 小説一覧 GET
│   │   │   │   └── [slug]/route.ts   # 小説詳細 GET
│   │   │   ├── entries/
│   │   │   │   ├── route.ts          # エントリ一覧 GET (フラグ適用済)
│   │   │   │   └── [id]/route.ts     # エントリ詳細 GET
│   │   │   ├── user-state/
│   │   │   │   └── route.ts          # ユーザー状態 GET/POST
│   │   │   ├── unlock/
│   │   │   │   └── route.ts          # フラグ解除 / エントリ開放 POST
│   │   │   └── scp/
│   │   │       └── [id]/route.ts     # SCP記録取得 GET
│   │   ├── novel/
│   │   │   └── [slug]/page.tsx       # 小説閲覧ページ (Server Component)
│   │   ├── globals.css               # Tailwind v4 + カスタムアニメーション
│   │   ├── layout.tsx
│   │   └── page.tsx                  # ホームページ (小説一覧)
│   ├── components/
│   │   ├── reader/
│   │   │   ├── NovelReader.tsx       # メイン閲覧UI (Client Component)
│   │   │   ├── NovelRenderer.tsx     # コンテンツレンダラー
│   │   │   └── EntrySidebar.tsx      # エントリ目次サイドバー
│   │   ├── terminal/
│   │   │   ├── BootSequence.tsx      # 起動シーケンスアニメーション
│   │   │   └── TerminalInput.tsx     # コマンド入力UI
│   │   └── ui/
│   │       ├── GlitchText.tsx        # グリッチ文字エフェクト
│   │       ├── InlineCard.tsx        # SCPインラインカード
│   │       └── StatusBar.tsx         # 進行ステータスバー
│   ├── lib/
│   │   ├── db.ts                     # libSQL クライアント + スキーマ
│   │   ├── parser.ts                 # 小説テキストパーサー
│   │   └── session.ts                # セッションID管理
│   └── types/
│       └── index.ts                  # TypeScript型定義
├── scripts/
│   └── init-db.ts                    # DBシード (サンプルデータ含む)
├── data/
│   └── novel.db                      # libSQL データベース (自動生成)
├── package.json
├── next.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

## DBスキーマ

### `novels` — 作品マスター
| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | UUID |
| title | TEXT | 作品タイトル |
| slug | TEXT UNIQUE | URLスラッグ |
| description | TEXT | 説明 |
| cover_text | TEXT | 表紙引用文 |
| boot_sequence | TEXT (JSON) | 起動シーケンスメッセージ配列 |
| created_at | TEXT | 作成日時 |

### `entries` — エントリ（章・記録）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | UUID |
| novel_id | TEXT FK | 所属小説ID |
| slug | TEXT | エントリスラッグ |
| title | TEXT | タイトル |
| content | TEXT | 本文（記法あり） |
| entry_type | TEXT | diary/log/system/dialogue/scp_record |
| required_flags | TEXT (JSON) | 閲覧に必要なフラグ配列 |
| unlock_flags | TEXT (JSON) | 読了時に解除するフラグオブジェクト |
| order_index | INTEGER | 表示順 |
| is_locked | INTEGER | 初期ロック状態 (0/1) |
| scp_class | TEXT | SCPクラス (Safe/Euclid/Keter) |

### `user_state` — ユーザー進行状態
| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | UUID |
| session_id | TEXT | ブラウザセッションID |
| novel_id | TEXT FK | 対象小説ID |
| flags | TEXT (JSON) | 取得済みフラグオブジェクト |
| progress | INTEGER | 進行度 (0-100) |
| unlocked_entries | TEXT (JSON) | 読了エントリID配列 |
| last_read_entry | TEXT | 最後に読んだエントリID |

### `scp_records` — SCP風記録データ
| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | UUID |
| record_id | TEXT UNIQUE | 記録ID (例: KAI-OBJ-001) |
| name | TEXT | 名称 |
| classification | TEXT | Safe/Euclid/Keter/Thaumiel |
| description | TEXT | 説明文 |
| containment_procedures | TEXT | 収容手順 |
| addenda | TEXT | 付記 |

## 小説記法

```
＃ システムメッセージ
＄ キャラクターの台詞
>> ユーザー/読者の返答
──── (ダッシュ3本以上) → セクション区切り線

｜漢字《かな》      → ルビ
[[KAI-OBJ-001]]    → SCPインラインカード
＜Yes＞ ＜いいえ＞   → 選択肢ボタン

█ (■ ░ ▒ ▓)       → 文字化け表示
```

## セットアップ

```bash
# 1. 依存インストール
npm install

# 2. DBシード
npm run db:init

# 3. 開発サーバー起動
npm run dev
```

## ゲーム進行 (サンプルデータ)

1. `http://localhost:3000` → KAI-DIARYを選択
2. 起動シーケンスを待つ
3. 「エピローグ兼プロローグ」を読む
4. 「忘備録完全版」→「入部初日」の順に読む
5. ロックされたSCP記録が開放される
6. 全記録を読むと隠しメッセージが解放される
7. ターミナルに `unlock KAISHOKU-BUCHO` と入力するとさらに先へ

## 新作追加方法

```bash
# scripts/init-db.ts に entries を追記して再実行
npm run db:init
```

または API直接:
```bash
# エントリ追加 (例)
curl -X POST /api/entries \
  -H "Content-Type: application/json" \
  -d '{"novel_id":"...","slug":"new-entry","title":"新エントリ","content":"..."}'
```

## 技術スタック

- **Next.js 15** (App Router, Server + Client Components)
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (BootSequence, フェードイン, スライド)
- **@libsql/client** (libSQL/Turso ローカルSQLite)
