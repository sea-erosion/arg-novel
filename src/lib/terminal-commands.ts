// ============================================================
// 海蝕現象収束機関 端末システム — コマンド定義
// ============================================================

export type OutputLine = {
  text: string;
  color?: "primary" | "secondary" | "warn" | "error" | "dim" | "accent" | "text";
  pre?: boolean;   // preserve whitespace / monospace block
  blink?: boolean;
};

export type CommandResult = {
  lines: OutputLine[];
  clear?: boolean; // clear screen
};

export type CommandDef = {
  name: string;
  aliases?: string[];
  category: string;
  summary: string; // shown in help list
  run: (args: string[], state: TerminalState) => CommandResult;
};

export type TerminalState = {
  flags: Record<string, boolean>;
  accessLevel: number;   // 0–5
  division: string;
  sessionId: string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const ok = (text: string): OutputLine => ({ text, color: "primary" });
const info = (text: string): OutputLine => ({ text, color: "secondary" });
const warn = (text: string): OutputLine => ({ text, color: "warn" });
const err = (text: string): OutputLine => ({ text, color: "error" });
const dim = (text: string): OutputLine => ({ text, color: "dim" });
const plain = (text: string): OutputLine => ({ text, color: "text" });
const pre = (text: string, color: OutputLine["color"] = "primary"): OutputLine => ({ text, color, pre: true });
const blank = (): OutputLine => ({ text: "" });

const DIVIDER = dim("─".repeat(56));

const RESTRICTED = (): CommandResult => ({
  lines: [
    err("ERROR: アクセス拒否"),
    dim("当該コマンドの実行権限が不足しています"),
    dim("clearance level を上げてください"),
  ],
});

const nowStr = () => new Date().toISOString().replace("T", " ").slice(0, 19) + " JST";

// ─────────────────────────────────────────────────────────────
// コマンド定義 × 100
// ─────────────────────────────────────────────────────────────

export const COMMANDS: CommandDef[] = [

  // ═══════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════
  {
    name: "help",
    aliases: ["?", "h"],
    category: "system",
    summary: "利用可能なコマンド一覧を表示",
    run: (args, _state) => {
      const cats = [...new Set(COMMANDS.map((c) => c.category))];
      const lines: OutputLine[] = [
        ok("╔══ KAI-TERMINAL v2.3.1 ── コマンド一覧 ══╗"),
        blank(),
      ];
      for (const cat of cats) {
        lines.push(warn(`  [${cat.toUpperCase()}]`));
        const cmds = COMMANDS.filter((c) => c.category === cat);
        for (const cmd of cmds) {
          const alias = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
          lines.push(plain(`    ${cmd.name.padEnd(22)}${alias.padEnd(16)} ${cmd.summary}`));
        }
        lines.push(blank());
      }
      lines.push(dim("  Tab: 補完  ↑↓: 履歴  Ctrl+L: クリア"));
      lines.push(ok("╚══════════════════════════════════════════╝"));
      return { lines };
    },
  },

  {
    name: "clear",
    aliases: ["cls", "reset"],
    category: "system",
    summary: "画面をクリア",
    run: () => ({ lines: [], clear: true }),
  },

  {
    name: "echo",
    aliases: [],
    category: "system",
    summary: "テキストをそのまま出力",
    run: (args) => ({ lines: [plain(args.join(" "))] }),
  },

  {
    name: "date",
    aliases: ["time", "now"],
    category: "system",
    summary: "現在日時を表示",
    run: () => ({
      lines: [
        info("現在時刻:"),
        ok(nowStr()),
        dim("タイムゾーン: Asia/Tokyo"),
      ],
    }),
  },

  {
    name: "uptime",
    aliases: [],
    category: "system",
    summary: "システム稼働時間を表示",
    run: () => ({
      lines: [
        info("システム稼働情報:"),
        ok("  稼働時間  : 847日 14時間 23分"),
        plain("  最終起動  : 2023-12-31 08:00:00 JST"),
        dim("  (緊急モード起動 — 通常起動ではありません)"),
      ],
    }),
  },

  {
    name: "version",
    aliases: ["ver"],
    category: "system",
    summary: "システムバージョン情報",
    run: () => ({
      lines: [
        ok("KAI-TERMINAL"),
        plain("  バージョン : 2.3.1-emergency"),
        plain("  ビルド    : 20260422-internal"),
        plain("  カーネル  : KAI-OS 4.7.2"),
        dim("  (最新ではないバージョンです — 更新を推奨)"),
      ],
    }),
  },

  {
    name: "whoami",
    aliases: ["id"],
    category: "system",
    summary: "現在のセッション情報",
    run: (_args, state) => ({
      lines: [
        info("セッション情報:"),
        ok(`  セッションID : ${state.sessionId}`),
        plain(`  部門         : ${state.division || "未配属"}`),
        plain(`  アクセスレベル: ${state.accessLevel}`),
        dim("  (個人情報プロテクト適用中)"),
      ],
    }),
  },

  {
    name: "env",
    aliases: [],
    category: "system",
    summary: "環境変数を表示",
    run: (_args, state) => ({
      lines: [
        info("環境変数:"),
        plain(`  KAI_ACCESS_LEVEL=${state.accessLevel}`),
        plain(`  KAI_DIVISION=${state.division || "UNASSIGNED"}`),
        plain(`  KAI_MODE=EMERGENCY`),
        plain(`  LANG=ja_JP.UTF-8`),
        plain(`  TERM=kai-256color`),
      ],
    }),
  },

  {
    name: "ps",
    aliases: [],
    category: "system",
    summary: "実行中プロセス一覧",
    run: () => ({
      lines: [
        info("PID   STAT  COMMAND"),
        ok("  001   R     kai-core"),
        plain("  002   S     session-manager"),
        plain("  003   S     event-trigger-daemon"),
        plain("  004   S     npc-engine"),
        plain("  005   Z     [unknown] ← ゾンビプロセス"),
        warn("  999   R     ??? (識別不能)"),
      ],
    }),
  },

  {
    name: "kill",
    aliases: [],
    category: "system",
    summary: "プロセスを終了 (kill <pid>)",
    run: (args) => {
      const pid = args[0];
      if (!pid) return { lines: [err("使用法: kill <pid>")] };
      if (pid === "999") return { lines: [err("ERROR: プロセス 999 は終了できません"), dim("このプロセスは保護されています")] };
      return { lines: [warn(`プロセス ${pid} に SIGTERM を送信しました`), dim("応答がありません — 強制終了するには kill -9 を使用")] };
    },
  },

  {
    name: "reboot",
    aliases: [],
    category: "system",
    summary: "システム再起動 (権限必要)",
    run: (_args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      return {
        lines: [
          warn("再起動シーケンスを開始します..."),
          dim("  セッションデータを保存中..."),
          dim("  プロセスをシャットダウン中..."),
          err("ERROR: 再起動に必要なハードウェアアクセスがありません"),
          dim("  (このターミナルからは物理システムに到達できません)"),
        ],
      };
    },
  },

  {
    name: "shutdown",
    aliases: [],
    category: "system",
    summary: "システムシャットダウン (権限必要)",
    run: (_args, state) => {
      if (state.accessLevel < 5) return RESTRICTED();
      return { lines: [err("LEVEL 5 権限が確認されましたが、"), warn("このデバイスはシャットダウンできません"), dim("（このデバイス自体が海蝕実体である可能性があります）")] };
    },
  },

  // ═══════════════════════════════════════════
  // ARCHIVE — 記録・エントリ
  // ═══════════════════════════════════════════
  {
    name: "ls",
    aliases: ["list", "dir"],
    category: "archive",
    summary: "記録一覧を表示",
    run: () => ({
      lines: [
        info("/ (アーカイブルート)"),
        ok("  diary/          日記エントリ"),
        ok("  log/            活動ログ"),
        ok("  scp/            海蝕実体記録"),
        ok("  incidents/      インシデントレポート"),
        plain("  personnel/      [アクセス制限]"),
        plain("  classified/     [アクセス制限]"),
        warn("  ??? /           [認識不能ディレクトリ]"),
      ],
    }),
  },

  {
    name: "cat",
    aliases: ["read"],
    category: "archive",
    summary: "ファイルを表示 (cat <path>)",
    run: (args) => {
      const path = args[0];
      if (!path) return { lines: [err("使用法: cat <path>")] };
      return {
        lines: [
          dim(`> cat ${path}`),
          err(`cat: ${path}: アクセス拒否またはファイルが存在しません`),
          dim("  ヒント: ls でファイル一覧を確認してください"),
        ],
      };
    },
  },

  {
    name: "search",
    aliases: ["find", "grep"],
    category: "archive",
    summary: "キーワードで記録を検索",
    run: (args) => {
      const kw = args.join(" ");
      if (!kw) return { lines: [err("使用法: search <キーワード>")] };
      return {
        lines: [
          info(`検索: "${kw}"`),
          dim("検索中..."),
          warn("  [!] 検索機能は現在オフラインです"),
          dim("  理由: インデックスサーバーに到達できません"),
          dim(`  最終ヒット: 0件`),
        ],
      };
    },
  },

  {
    name: "index",
    aliases: [],
    category: "archive",
    summary: "アーカイブインデックスを再構築",
    run: () => ({
      lines: [
        info("インデックス再構築を開始..."),
        dim("  スキャン: diary/ ..................... 3件"),
        dim("  スキャン: log/ ........................ 1件"),
        dim("  スキャン: scp/ ........................ 4件"),
        dim("  スキャン: incidents/ .................. 0件"),
        warn("  スキャン: ???/ ........... アクセスエラー"),
        ok("インデックス更新完了 (8件 / エラー: 1)"),
      ],
    }),
  },

  {
    name: "export",
    aliases: [],
    category: "archive",
    summary: "記録をエクスポート (export <id>)",
    run: (args) => {
      const id = args[0];
      if (!id) return { lines: [err("使用法: export <記録ID>")] };
      return {
        lines: [
          info(`エクスポート対象: ${id}`),
          err("ERROR: 外部出力インターフェースが利用できません"),
          dim("  このデバイスは外部ネットワークから切断されています"),
        ],
      };
    },
  },

  {
    name: "stat",
    aliases: [],
    category: "archive",
    summary: "ファイルのメタデータを表示",
    run: (args) => {
      const f = args[0] || "(不明)";
      return {
        lines: [
          info(`stat: ${f}`),
          plain("  サイズ    : 不明"),
          plain("  作成日時  : [プロテクト適用中]"),
          plain("  更新日時  : [プロテクト適用中]"),
          plain("  パーミッション: -rwx------"),
          dim("  所有者    : [個人情報プロテクト]"),
        ],
      };
    },
  },

  {
    name: "diff",
    aliases: [],
    category: "archive",
    summary: "2つの記録を比較 (diff <a> <b>)",
    run: (args) => {
      if (args.length < 2) return { lines: [err("使用法: diff <file1> <file2>")] };
      return {
        lines: [
          info(`diff ${args[0]} ${args[1]}`),
          ok("+ [新規データ] 復元率が向上しました"),
          err("- [削除] 一部データが欠損しています"),
          warn("  警告: 比較対象のいずれかが改ざんされている可能性があります"),
        ],
      };
    },
  },

  {
    name: "checksum",
    aliases: ["hash", "md5"],
    category: "archive",
    summary: "ファイルのハッシュ値を計算",
    run: (args) => {
      const f = args[0] || "(なし)";
      const fake = Math.random().toString(16).slice(2, 34).padEnd(32, "0");
      return {
        lines: [
          info(`SHA-256: ${f}`),
          ok(fake + fake.slice(0, 32)),
          warn("  [!] 既知のハッシュと一致しません — データが改ざんされている可能性"),
        ],
      };
    },
  },

  // ═══════════════════════════════════════════
  // ENTITY — 海蝕実体
  // ═══════════════════════════════════════════
  {
    name: "scan",
    aliases: [],
    category: "entity",
    summary: "海蝕実体をスキャン",
    run: () => ({
      lines: [
        info("海蝕スキャナーを起動..."),
        dim("  周波数帯: 0.001 Hz – 9999 THz"),
        dim("  空間歪み検出: 有効"),
        blank(),
        warn("  [検出] 微弱な海蝕シグネチャ — 特定不能"),
        warn("  [検出] 方向: 不明 / 距離: 不明"),
        err("  [!] スキャナー自体の読み値が安定しません"),
        dim("  (このデバイス内部に海蝕源が存在する可能性)"),
      ],
    }),
  },

  {
    name: "entity",
    aliases: ["scp", "kai"],
    category: "entity",
    summary: "実体記録を検索 (entity <ID>)",
    run: (args) => {
      const id = args[0];
      if (!id) return { lines: [err("使用法: entity <記録ID>  例: entity KAI-OBJ-001")] };
      return {
        lines: [
          info(`記録検索: ${id}`),
          dim("  データベースに問い合わせ中..."),
          warn(`  [見つかりません] ${id} — または閲覧権限が不足しています`),
          dim("  ヒント: 小説内の [[ID]] リンクを先に読んでください"),
        ],
      };
    },
  },

  {
    name: "classify",
    aliases: [],
    category: "entity",
    summary: "実体を分類 (classify <ID> <class>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const [id, cls] = args;
      if (!id || !cls) return { lines: [err("使用法: classify <ID> <Safe|Euclid|Keter>")] };
      const valid = ["safe", "euclid", "keter"];
      if (!valid.includes(cls.toLowerCase())) return { lines: [err(`無効なクラス: ${cls}  (Safe / Euclid / Keter)`)] };
      return {
        lines: [
          warn(`分類変更リクエスト: ${id} → ${cls}`),
          dim("  承認待ち: 上位権限者の確認が必要です"),
          dim("  リクエストID: REQ-" + Date.now()),
        ],
      };
    },
  },

  {
    name: "contain",
    aliases: [],
    category: "entity",
    summary: "収容手順を取得 (contain <ID>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: contain <ID>")] };
      return {
        lines: [
          info(`収容手順: ${id}`),
          warn("  手順書が見つかりません — 未収容または記録欠損"),
          dim("  代替手順: 一般人への認知を防ぐことを最優先"),
        ],
      };
    },
  },

  {
    name: "threat",
    aliases: [],
    category: "entity",
    summary: "脅威レベルを評価 (threat <ID>)",
    run: (args) => {
      const id = args[0];
      if (!id) return { lines: [err("使用法: threat <ID>")] };
      const levels = ["Low", "Medium", "High", "Critical", "Unknown"];
      const lvl = levels[Math.floor(Math.random() * levels.length)];
      const color = lvl === "Critical" ? "error" : lvl === "High" ? "warn" : "primary";
      return {
        lines: [
          info(`脅威評価: ${id}`),
          { text: `  脅威レベル: ${lvl}`, color },
          dim("  (自動評価 — 精度は保証されません)"),
        ],
      };
    },
  },

  {
    name: "partner",
    aliases: [],
    category: "entity",
    summary: "パートナー制度申請 (partner <ID>)",
    run: (args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: partner <ID>")] };
      return {
        lines: [
          info(`パートナー制度申請: ${id}`),
          dim("  申請条件:"),
          plain("    [x] 友好的な実体であること"),
          plain("    [x] 人間社会への適応意思があること"),
          plain("    [ ] 世話員の確保 (未割り当て)"),
          warn("  申請は保留中です — 世話員を割り当ててください"),
        ],
      };
    },
  },

  {
    name: "observe",
    aliases: [],
    category: "entity",
    summary: "実体を観測モードに設定",
    run: (args) => {
      const id = args[0];
      if (!id) return { lines: [err("使用法: observe <ID>")] };
      return {
        lines: [
          info(`観測モード開始: ${id}`),
          ok("  センサーアレイを起動..."),
          dim("  観測間隔: 1時間"),
          dim("  アラート閾値: 異常行動 / 認知拡散"),
          warn("  [注意] 長期観測はこのデバイスのリソースを消費します"),
        ],
      };
    },
  },

  {
    name: "anomaly",
    aliases: [],
    category: "entity",
    summary: "アノマリーレポートを生成",
    run: () => ({
      lines: [
        info("アノマリーレポート — " + nowStr()),
        DIVIDER,
        warn("  未解決アノマリー  : 3件"),
        plain("  観測中           : 7件"),
        plain("  収容済み         : 12件"),
        err("  逸脱 (脱走)      : 1件"),
        DIVIDER,
        err("[緊急] 逸脱実体の位置を特定してください"),
      ],
    }),
  },

  // ═══════════════════════════════════════════
  // NETWORK — 通信・接続
  // ═══════════════════════════════════════════
  {
    name: "ping",
    aliases: [],
    category: "network",
    summary: "ノードへの疎通確認 (ping <host>)",
    run: (args) => {
      const host = args[0] || "localhost";
      if (host === "localhost" || host === "127.0.0.1") {
        return {
          lines: [
            ok(`PING ${host}: 64 bytes`),
            ok("  seq=1 ttl=64 time=0.042ms"),
            ok("  seq=2 ttl=64 time=0.039ms"),
            ok("  seq=3 ttl=64 time=0.041ms"),
            dim("  3 packets sent, 3 received, 0% loss"),
          ],
        };
      }
      return {
        lines: [
          info(`PING ${host}: 64 bytes`),
          err("  Request timeout — ホストに到達できません"),
          dim("  (外部ネットワークへのアクセスは遮断されています)"),
        ],
      };
    },
  },

  {
    name: "connect",
    aliases: ["ssh"],
    category: "network",
    summary: "外部ノードに接続 (connect <host>)",
    run: (args) => {
      const host = args[0];
      if (!host) return { lines: [err("使用法: connect <host>")] };
      return {
        lines: [
          info(`接続試行: ${host}`),
          dim("  ハンドシェイク中..."),
          err("  接続失敗: 外部ネットワークへのルートがありません"),
          dim("  このデバイスはオフラインモードで動作しています"),
        ],
      };
    },
  },

  {
    name: "ifconfig",
    aliases: ["ip", "netstat"],
    category: "network",
    summary: "ネットワーク設定を表示",
    run: () => ({
      lines: [
        info("ネットワークインターフェース:"),
        ok("  kai0    UP   127.0.0.1     (ループバック)"),
        warn("  kai1    DOWN  ---          (外部 — 切断)"),
        warn("  kai2    DOWN  ---          (海側 — 検出不能)"),
        dim("  外部インターフェースはオフラインです"),
      ],
    }),
  },

  {
    name: "traceroute",
    aliases: ["trace"],
    category: "network",
    summary: "経路をトレース (traceroute <host>)",
    run: (args) => {
      const host = args[0] || "(不明)";
      return {
        lines: [
          info(`traceroute to ${host}:`),
          plain("   1  kai-local (0.1ms)"),
          plain("   2  kai-gateway (12ms)"),
          warn("   3  * * * (応答なし)"),
          warn("   4  * * * (応答なし)"),
          err("   5  [接続断]"),
          dim("  宛先に到達できませんでした"),
        ],
      };
    },
  },

  {
    name: "broadcast",
    aliases: [],
    category: "network",
    summary: "全ノードにメッセージ送信",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const msg = args.join(" ");
      if (!msg) return { lines: [err("使用法: broadcast <メッセージ>")] };
      return {
        lines: [
          info("ブロードキャスト送信..."),
          warn("  外部ノード: 到達不能"),
          ok("  ローカルノード: 送信完了"),
          dim(`  メッセージ: "${msg}"`),
          dim("  受信確認: 0件 (外部オフライン)"),
        ],
      };
    },
  },

  {
    name: "intercept",
    aliases: [],
    category: "network",
    summary: "通信傍受を試みる (権限必要)",
    run: (_args, state) => {
      if (state.accessLevel < 4) return RESTRICTED();
      return {
        lines: [
          warn("通信傍受モード..."),
          dim("  周波数帯スキャン中..."),
          plain("  [受信] 発信元: 不明 / 内容: [暗号化]"),
          plain("  [受信] 発信元: 不明 / 内容: [暗号化]"),
          err("  [異常] 受信データの一部が海蝕シグネチャを含んでいます"),
        ],
      };
    },
  },

  {
    name: "frequency",
    aliases: ["freq"],
    category: "network",
    summary: "海蝕周波数を表示",
    run: () => ({
      lines: [
        info("海蝕周波数モニター:"),
        ok("  基準周波数  : 0.000 Hz (現在)"),
        warn("  異常周波数  : 検出中..."),
        err("  高強度帯    : [プロテクト適用中]"),
        dim("  ※周波数が上がるほど実体化が進みます"),
      ],
    }),
  },

  // ═══════════════════════════════════════════
  // PERSONNEL — 人員管理
  // ═══════════════════════════════════════════
  {
    name: "roster",
    aliases: [],
    category: "personnel",
    summary: "部門員名簿を表示",
    run: (_args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      return {
        lines: [
          info("九重支部 部門員名簿 (一部):"),
          DIVIDER,
          plain("  [収束員]  ██ ██    / 3年 / CLv.4"),
          plain("  [通信員]  ██ ██    / 2年 / CLv.3"),
          plain("  [支援員]  ██ ██    / 2年 / CLv.2"),
          plain("  [収束員]  ██ ██    / 1年 / CLv.1"),
          dim("  ※個人情報プロテクト適用中"),
        ],
      };
    },
  },

  {
    name: "assign",
    aliases: [],
    category: "personnel",
    summary: "人員を任務に割り当て (assign <staff> <mission>)",
    run: (args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      const [staff, mission] = args;
      if (!staff || !mission) return { lines: [err("使用法: assign <staff_id> <mission_id>")] };
      return {
        lines: [
          info(`任務割り当て: ${staff} → ${mission}`),
          warn("  承認待ち: 部長の確認が必要です"),
          dim("  リクエストをキューに追加しました"),
        ],
      };
    },
  },

  {
    name: "clearance",
    aliases: [],
    category: "personnel",
    summary: "クリアランスレベルを確認 (clearance <staff_id>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: clearance <staff_id>")] };
      return {
        lines: [
          info(`クリアランス確認: ${id}`),
          warn("  記録が見つかりません または 閲覧不可"),
          dim("  (個人情報プロテクト適用中)"),
        ],
      };
    },
  },

  {
    name: "division",
    aliases: ["div"],
    category: "personnel",
    summary: "部門情報を表示 (division <name>)",
    run: (args) => {
      const name = args[0];
      const divs: Record<string, string[]> = {
        "収束員": ["エグゼクター", "実際の収束活動を担当", "現在員数: 5名"],
        "通信員": ["オペレーター", "収束員の支持・通信管制", "現在員数: 4名"],
        "支援員": ["サポーター", "円滑な活動を支援", "現在員数: 3名"],
        "研究員": ["リサーチャー", "海蝕現象の研究・応用", "現在員数: 2名"],
        "外交員": ["ネゴシエーター", "外部との交渉 (非公開)", "現在員数: [機密]"],
      };
      if (!name) {
        return {
          lines: [
            info("部門一覧:"),
            ...Object.keys(divs).map((d) => plain(`  ${d}`)),
            dim("  使用法: division <部門名>"),
          ],
        };
      }
      const info2 = divs[name];
      if (!info2) return { lines: [err(`部門が見つかりません: ${name}`)] };
      return { lines: [ok(`[${info2[0]}]`), plain(`  ${info2[1]}`), plain(`  ${info2[2]}`)] };
    },
  },

  {
    name: "schedule",
    aliases: [],
    category: "personnel",
    summary: "任務スケジュールを表示",
    run: (_args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      return {
        lines: [
          info("今週のスケジュール:"),
          plain("  月  ── 定例ブリーフィング 18:00"),
          plain("  火  ── パトロール (北区)"),
          warn("  水  ── [緊急] アノマリー対応"),
          plain("  木  ── 記録整理"),
          plain("  金  ── 部室管理"),
          dim("  土日 ── 自由活動 (待機)"),
        ],
      };
    },
  },

  // ═══════════════════════════════════════════
  // MISSION — 任務管理
  // ═══════════════════════════════════════════
  {
    name: "missions",
    aliases: ["mission"],
    category: "mission",
    summary: "進行中の任務一覧",
    run: (_args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      return {
        lines: [
          info("任務一覧:"),
          DIVIDER,
          ok("  [M-001] 完了  ── 旧校舎異常音調査"),
          plain("  [M-002] 進行  ── 北部フィールドパトロール"),
          warn("  [M-003] 保留  ── KAI-OBJ-001 完全調査"),
          err("  [M-999] 緊急  ── [プロテクト適用中]"),
        ],
      };
    },
  },

  {
    name: "brief",
    aliases: [],
    category: "mission",
    summary: "任務ブリーフィングを取得 (brief <mission_id>)",
    run: (args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: brief <mission_id>")] };
      return {
        lines: [
          info(`任務ブリーフィング: ${id}`),
          warn("  ブリーフィング資料が見つかりません"),
          dim("  (閲覧権限不足、または資料が未作成)"),
        ],
      };
    },
  },

  {
    name: "debrief",
    aliases: [],
    category: "mission",
    summary: "任務報告を提出 (debrief <mission_id>)",
    run: (args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: debrief <mission_id>")] };
      return {
        lines: [
          info(`任務報告: ${id}`),
          dim("  提出先: 部長 (未接続)"),
          err("  ERROR: 報告先に到達できません"),
          dim("  ローカルに保存しました"),
        ],
      };
    },
  },

  {
    name: "abort",
    aliases: [],
    category: "mission",
    summary: "任務を中断 (abort <mission_id>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const id = args[0];
      if (!id) return { lines: [err("使用法: abort <mission_id>")] };
      return {
        lines: [
          warn(`任務中断リクエスト: ${id}`),
          dim("  理由を記録してください (任意):"),
          dim("  > (この端末では対話式入力は利用不可)"),
          warn("  中断リクエストをキューに追加しました"),
        ],
      };
    },
  },

  {
    name: "priority",
    aliases: [],
    category: "mission",
    summary: "優先度を変更 (priority <id> <1-5>)",
    run: (args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      const [id, lvl] = args;
      if (!id || !lvl) return { lines: [err("使用法: priority <mission_id> <1-5>")] };
      return {
        lines: [
          info(`優先度変更: ${id} → Lv.${lvl}`),
          ok("  変更をキューに追加しました"),
          dim("  有効化には上位承認が必要です"),
        ],
      };
    },
  },

  // ═══════════════════════════════════════════
  // SECURITY — セキュリティ
  // ═══════════════════════════════════════════
  {
    name: "lock",
    aliases: [],
    category: "security",
    summary: "セクションをロック (lock <section>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const sec = args[0];
      if (!sec) return { lines: [err("使用法: lock <section>")] };
      return { lines: [ok(`セクション "${sec}" をロックしました`)] };
    },
  },

  {
    name: "unlock",
    aliases: [],
    category: "security",
    summary: "コードでセクションを解除 (unlock <code>)",
    run: (args) => {
      const code = args[0];
      if (!code) return { lines: [err("使用法: unlock <code>")] };
      if (code === "KAISHOKU-BUCHO") {
        return {
          lines: [
            ok("コード認証成功: KAISHOKU-BUCHO"),
            { text: "  [解除] 部長関連データへのアクセスが許可されました", color: "primary", blink: true },
            dim("  小説内に新しいコンテンツが解放されています"),
          ],
        };
      }
      return {
        lines: [
          err(`コード認証失敗: "${code}"`),
          dim("  試行回数: 記録中"),
        ],
      };
    },
  },

  {
    name: "audit",
    aliases: [],
    category: "security",
    summary: "セキュリティ監査ログを表示",
    run: (_args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      return {
        lines: [
          info("セキュリティ監査ログ (最新5件):"),
          DIVIDER,
          plain(`  [${nowStr()}] セッション開始`),
          plain("  [2026-04-21 03:14:22] 未知のアクセス試行 — 拒否"),
          warn("  [2026-04-20 22:09:11] クリアランス超過アクセス試行"),
          err("  [2026-04-19 14:55:00] [記録破損]"),
          err("  [????????????] [プロテクト適用中]"),
        ],
      };
    },
  },

  {
    name: "encrypt",
    aliases: [],
    category: "security",
    summary: "データを暗号化 (encrypt <data>)",
    run: (args) => {
      const data = args.join(" ");
      if (!data) return { lines: [err("使用法: encrypt <data>")] };
      const fake = btoa(data).replace(/=/g, "").slice(0, 32) + "...";
      return {
        lines: [
          info("暗号化 (KAI-256):"),
          ok(`  ${fake}`),
          dim("  アルゴリズム: KAI-256-GCM"),
        ],
      };
    },
  },

  {
    name: "decrypt",
    aliases: [],
    category: "security",
    summary: "データを復号 (decrypt <data>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const data = args[0];
      if (!data) return { lines: [err("使用法: decrypt <data>")] };
      return {
        lines: [
          info("復号試行:"),
          err("  鍵が見つかりません — 復号失敗"),
          dim("  (このデバイスの秘密鍵は個人情報プロテクト下にあります)"),
        ],
      };
    },
  },

  {
    name: "whitelist",
    aliases: [],
    category: "security",
    summary: "ホワイトリストを管理",
    run: (args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      const sub = args[0];
      if (sub === "list") return { lines: [info("ホワイトリスト: (空)"), dim("  登録済みエントリなし")] };
      return { lines: [err("使用法: whitelist list / whitelist add <id> / whitelist remove <id>")] };
    },
  },

  {
    name: "anomalyscore",
    aliases: ["score"],
    category: "security",
    summary: "自身のアノマリースコアを確認",
    run: (_args, state) => ({
      lines: [
        info("アノマリースコア:"),
        ok(`  スコア: ${Math.floor(Math.random() * 30)} / 100`),
        dim("  (スコアが高いほど海蝕体として認識されるリスクが上昇)"),
        state.accessLevel >= 3
          ? warn("  [管理者] スコアリセット: anomalyscore reset")
          : dim("  リセット権限なし"),
      ],
    }),
  },

  // ═══════════════════════════════════════════
  // DIAGNOSTICS — 診断
  // ═══════════════════════════════════════════
  {
    name: "diag",
    aliases: ["diagnostic"],
    category: "diagnostics",
    summary: "システム診断を実行",
    run: () => ({
      lines: [
        info("システム診断 — " + nowStr()),
        DIVIDER,
        ok("  [OK] カーネル"),
        ok("  [OK] メモリ"),
        ok("  [OK] ローカルDB"),
        warn("  [WARN] 外部ネットワーク — オフライン"),
        warn("  [WARN] 時刻同期 — ズレあり (±3分)"),
        err("  [FAIL] 整合性チェック — 一部データ欠損"),
        err("  [FAIL] プロセス 999 — 状態不明"),
        DIVIDER,
        warn("診断完了: 2件の警告, 2件のエラー"),
      ],
    }),
  },

  {
    name: "meminfo",
    aliases: ["mem", "memory"],
    category: "diagnostics",
    summary: "メモリ使用状況",
    run: () => ({
      lines: [
        info("メモリ情報:"),
        plain("  合計   : 2048 MB"),
        ok("  使用中 : 847 MB  (41%)"),
        plain("  空き   : 1201 MB"),
        warn("  スワップ: 使用中 (12 MB)"),
        err("  [異常] 未マップ領域を検出 — 海蝕干渉の可能性"),
      ],
    }),
  },

  {
    name: "diskinfo",
    aliases: ["disk", "df"],
    category: "diagnostics",
    summary: "ディスク使用状況",
    run: () => ({
      lines: [
        info("ディスク情報:"),
        plain("  /         : 2.1 GB / 8.0 GB  (26%)"),
        plain("  /archive  : 4.7 GB / 10.0 GB (47%)"),
        warn("  /unknown  : ??? GB / ???  (測定不能)"),
        err("  [!] /unknown マウントポイントが応答しません"),
      ],
    }),
  },

  {
    name: "log",
    aliases: ["logs", "syslog"],
    category: "diagnostics",
    summary: "システムログを表示",
    run: (args) => {
      const n = parseInt(args[0] || "5", 10);
      const entries = [
        `[${nowStr()}] INFO   セッション開始`,
        `[2026-04-21 23:59:59] WARN  プロセス 999 からの信号`,
        `[2026-04-21 18:02:13] INFO   インデックス更新`,
        `[2026-04-21 03:14:22] ERROR  不正アクセス試行`,
        `[2026-04-20 ??:??:??] ERROR  [読み込みエラー]`,
        `[??????????] ????   ████████████`,
      ].slice(0, Math.min(n, 6));
      return { lines: [info(`最新ログ (${entries.length}件):`), ...entries.map(plain)] };
    },
  },

  {
    name: "benchmark",
    aliases: ["bench"],
    category: "diagnostics",
    summary: "パフォーマンスベンチマーク",
    run: () => ({
      lines: [
        info("ベンチマーク実行中..."),
        dim("  CPU: ████████░░ 80%"),
        dim("  MEM: █████░░░░░ 50%"),
        dim("  I/O: ███░░░░░░░ 30%"),
        ok("  スコア: 847"),
        warn("  (緊急モードのため通常より性能が低下しています)"),
      ],
    }),
  },

  {
    name: "selftest",
    aliases: [],
    category: "diagnostics",
    summary: "自己診断テストを実行",
    run: () => ({
      lines: [
        info("自己診断:"),
        ok("  [PASS] 基本演算"),
        ok("  [PASS] メモリ読み書き"),
        warn("  [WARN] 人格整合性チェック — 完全には検証できません"),
        err("  [FAIL] 存在確認テスト — 結果が矛盾しています"),
        dim("  (このデバイス自身が何であるか、確定できません)"),
      ],
    }),
  },

  {
    name: "recover",
    aliases: [],
    category: "diagnostics",
    summary: "破損データの回復を試みる",
    run: () => ({
      lines: [
        info("データ回復 — 開始..."),
        dim("  破損セクタをスキャン中..."),
        dim("  バックアップを検索中..."),
        warn("  [警告] バックアップが見つかりません"),
        warn("  [部分回復] 37% のデータを復元しました"),
        err("  [失敗] 残り63% は回復不能"),
        dim("  個人情報プロテクトにより、何のデータかは特定できません"),
      ],
    }),
  },

  // ═══════════════════════════════════════════
  // CRYPTO — 暗号・コード
  // ═══════════════════════════════════════════
  {
    name: "decode",
    aliases: [],
    category: "crypto",
    summary: "エンコードされた文字列を解読 (decode <str>)",
    run: (args) => {
      const str = args[0];
      if (!str) return { lines: [err("使用法: decode <base64文字列>")] };
      try {
        const decoded = atob(str);
        return { lines: [info("デコード結果:"), ok(decoded)] };
      } catch {
        return { lines: [err("デコード失敗 — 無効なBase64文字列です")] };
      }
    },
  },

  {
    name: "cipher",
    aliases: [],
    category: "crypto",
    summary: "シーザー暗号 (cipher <text> <shift>)",
    run: (args) => {
      const [text, shiftStr] = args;
      if (!text) return { lines: [err("使用法: cipher <text> <shift>")] };
      const shift = parseInt(shiftStr || "13", 10);
      const result = text.split("").map((c) => {
        if (c.match(/[a-z]/)) return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97);
        if (c.match(/[A-Z]/)) return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
        return c;
      }).join("");
      return { lines: [info(`Caesar(${shift}): ${text}`), ok(result)] };
    },
  },

  {
    name: "morse",
    aliases: [],
    category: "crypto",
    summary: "モールス符号に変換 (morse <text>)",
    run: (args) => {
      const text = args.join(" ").toUpperCase();
      const MAP: Record<string, string> = {
        A:".-", B:"-...", C:"-.-.", D:"-..", E:".", F:"..-.", G:"--.",
        H:"....", I:"..", J:".---", K:"-.-", L:".-..", M:"--", N:"-.",
        O:"---", P:".--.", Q:"--.-", R:".-.", S:"...", T:"-", U:"..-",
        V:"...-", W:".--", X:"-..-", Y:"-.--", Z:"--..", " ":"/"
      };
      const result = text.split("").map((c) => MAP[c] || c).join(" ");
      return { lines: [info("モールス符号:"), pre(result)] };
    },
  },

  {
    name: "binary",
    aliases: [],
    category: "crypto",
    summary: "テキストを2進数に変換 (binary <text>)",
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: [err("使用法: binary <text>")] };
      const result = text.split("").map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
      return { lines: [info("2進数:"), pre(result.slice(0, 120) + (result.length > 120 ? "..." : ""))] };
    },
  },

  {
    name: "hex",
    aliases: [],
    category: "crypto",
    summary: "テキストを16進数に変換 (hex <text>)",
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: [err("使用法: hex <text>")] };
      const result = text.split("").map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
      return { lines: [info("16進数:"), pre(result)] };
    },
  },

  // ═══════════════════════════════════════════
  // LORE — 世界観
  // ═══════════════════════════════════════════
  {
    name: "lore",
    aliases: [],
    category: "lore",
    summary: "海蝕世界観データベースを検索",
    run: (args) => {
      const kw = args.join(" ").toLowerCase();
      const db: Record<string, string[]> = {
        "海蝕現象": [
          "「海」と呼ばれる異次元の存在が地球に出現する現象",
          "出現した実体を「海蝕実体」と呼称する",
          "認知度が上がるほど実体化・定型化が進む性質を持つ",
        ],
        "収束": [
          "海蝕現象への対処のこと",
          "収容ではなく「収束」— 一般人への認知を防ぐことが主眼",
          "友好的実体にはパートナー制度を提案することがある",
        ],
        "海": [
          "この次元とは異なる世界の総称",
          "詳細は不明 — 到達した人間の記録は存在しない",
          "部室の一部がこの「海」に接続している可能性がある",
        ],
      };
      const found = Object.entries(db).find(([k]) => kw.includes(k) || k.includes(kw));
      if (!found) return { lines: [warn(`"${kw}" に関する記録が見つかりません`), dim("  ヒント: 海蝕現象 / 収束 / 海")] };
      return { lines: [ok(`[${found[0]}]`), ...found[1].map(plain)] };
    },
  },

  {
    name: "history",
    aliases: [],
    category: "lore",
    summary: "九重支部の設立史",
    run: () => ({
      lines: [
        info("九重支部 設立史:"),
        DIVIDER,
        plain("  設立者  : [プロテクト適用中]"),
        plain("  設立    : 不明 (100年以上前と推定)"),
        plain("  当初の活動拠点: 九重高校旧校舎"),
        warn("  ※最初の海蝕観測地点が現在の部室と同一座標"),
        dim("  詳細は [[KAI-ORG-001]] を参照"),
      ],
    }),
  },

  {
    name: "map",
    aliases: [],
    category: "lore",
    summary: "大分県海蝕マップを表示",
    run: () => ({
      lines: [
        info("海蝕活動マップ — 大分県"),
        pre(
          "  北 ┌────────────────────┐\n" +
          "     │  ○ 九重高校 [基点] │\n" +
          "     │  ? 山間部 [未調査] │\n" +
          "     │  △ 沿岸部 [要注意] │\n" +
          "  南 └────────────────────┘\n" +
          "       西           東"
        ),
        warn("  活動エリア: 3か所  未確認: 多数"),
      ],
    }),
  },

  {
    name: "glossary",
    aliases: [],
    category: "lore",
    summary: "用語集を表示",
    run: () => ({
      lines: [
        info("海蝕用語集:"),
        DIVIDER,
        plain("  海蝕実体  : 「海」から来た存在"),
        plain("  収束員    : 実際に対処を行う機関員"),
        plain("  世話員    : パートナー実体の担当者"),
        plain("  認知拡散  : 一般人への露出・認知が広まること"),
        plain("  個人情報  : このデバイスで保護されている情報"),
        plain("  プロテクト: 閲覧制限機能"),
        dim("  続き: lore <キーワード> で検索"),
      ],
    }),
  },

  {
    name: "rumor",
    aliases: [],
    category: "lore",
    summary: "未確認情報・噂を表示",
    run: () => {
      const rumors = [
        "旧校舎の最深部にはまだ誰も到達していない",
        "部室の一部は「海」にはみ出しているらしい",
        "初代部長は実は海蝕実体だったという説がある",
        "外交員 (ネゴシエーター) の活動内容は幹部にも知らされていない",
        "このデバイスを書いた人物はもしかしたらまだ存在しているかもしれない",
      ];
      const pick = rumors[Math.floor(Math.random() * rumors.length)];
      return {
        lines: [
          warn("[未確認情報]"),
          plain(`  "${pick}"`),
          dim("  ※信頼性: 低 — 公式記録ではありません"),
        ],
      };
    },
  },

  // ═══════════════════════════════════════════
  // UTIL — ユーティリティ
  // ═══════════════════════════════════════════
  {
    name: "calc",
    aliases: ["math"],
    category: "util",
    summary: "計算式を評価 (calc <expr>)",
    run: (args) => {
      const expr = args.join(" ");
      if (!expr) return { lines: [err("使用法: calc <計算式>  例: calc 2 + 3")] };
      try {
        // safe-ish: only allow numbers and operators
        if (!/^[\d\s+\-*/().%^]+$/.test(expr)) throw new Error("無効な文字");
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${expr})`)();
        return { lines: [ok(`${expr} = ${result}`)] };
      } catch {
        return { lines: [err(`計算エラー: ${expr}`)] };
      }
    },
  },

  {
    name: "random",
    aliases: ["rand"],
    category: "util",
    summary: "乱数を生成 (random <min> <max>)",
    run: (args) => {
      const min = parseInt(args[0] || "0", 10);
      const max = parseInt(args[1] || "100", 10);
      const val = Math.floor(Math.random() * (max - min + 1)) + min;
      return { lines: [ok(`乱数: ${val}  (範囲: ${min}–${max})`)] };
    },
  },

  {
    name: "countdown",
    aliases: [],
    category: "util",
    summary: "カウントダウンを表示 (countdown <n>)",
    run: (args) => {
      const n = Math.min(parseInt(args[0] || "5", 10), 10);
      const lines: OutputLine[] = [info(`カウントダウン: ${n}`)];
      for (let i = n; i >= 0; i--) {
        lines.push(i === 0
          ? { text: `  → 00:00:0${i}  [MARK]`, color: "error" }
          : plain(`  → 00:00:0${i}`));
      }
      return { lines };
    },
  },

  {
    name: "note",
    aliases: [],
    category: "util",
    summary: "メモを残す (note <text>)",
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: [err("使用法: note <text>")] };
      return {
        lines: [
          ok("メモを保存しました:"),
          plain(`  "${text}"`),
          dim(`  ${nowStr()}`),
          dim("  (セッション終了時に消去されます)"),
        ],
      };
    },
  },

  {
    name: "timer",
    aliases: [],
    category: "util",
    summary: "タイマーを設定 (timer <seconds>)",
    run: (args) => {
      const sec = parseInt(args[0] || "60", 10);
      return {
        lines: [
          info(`タイマー設定: ${sec}秒`),
          dim("  (このターミナルはタイマーを実行し続けることができません)"),
          dim("  (画面から目を離さないでください)"),
        ],
      };
    },
  },

  {
    name: "weather",
    aliases: [],
    category: "util",
    summary: "九重周辺の天気 (フィクション)",
    run: () => {
      const conds = ["曇り / 霧", "晴れ (異常に静か)", "霧雨 / 視界不良", "嵐 (海蝕活動と相関あり)"];
      const cond = conds[Math.floor(Math.random() * conds.length)];
      return {
        lines: [
          info("天気情報 (大分県九重地区):"),
          plain(`  現在: ${cond}`),
          plain("  気温: ██.█℃  (プロテクト)"),
          warn("  ※悪天候時は海蝕活動が活発になる傾向があります"),
        ],
      };
    },
  },

  {
    name: "coin",
    aliases: ["flip"],
    category: "util",
    summary: "コインを投げる",
    run: () => {
      const result = Math.random() > 0.5 ? "表" : "裏";
      return {
        lines: [
          info("コイントス:"),
          ok(`  → ${result}`),
          dim("  (量子乱数ではありません)"),
        ],
      };
    },
  },

  {
    name: "dice",
    aliases: [],
    category: "util",
    summary: "サイコロを振る (dice <面数>)",
    run: (args) => {
      const sides = parseInt(args[0] || "6", 10);
      const val = Math.floor(Math.random() * sides) + 1;
      return { lines: [info(`d${sides}:`), ok(`  → ${val}`)] };
    },
  },

  {
    name: "ascii",
    aliases: [],
    category: "util",
    summary: "テキストをASCIIアートに",
    run: (args) => {
      const text = args.join(" ").slice(0, 6).toUpperCase() || "KAI";
      // Very simple block letters using #
      const simple = text.split("").map((c) => `[${c}]`).join("");
      return {
        lines: [
          info("ASCII変換:"),
          pre(simple, "primary"),
          dim("  (フルサイズASCIIアートは準備中)"),
        ],
      };
    },
  },

  // ═══════════════════════════════════════════
  // EASTER EGG / SPECIAL
  // ═══════════════════════════════════════════
  {
    name: "sudo",
    aliases: [],
    category: "special",
    summary: "スーパーユーザー権限で実行",
    run: (args) => {
      if (args.length === 0) return { lines: [err("使用法: sudo <command>")] };
      return {
        lines: [
          err("sudo: このデバイスにはスーパーユーザーは存在しません"),
          dim("  (このデバイス自体が何かの「内部」である可能性があります)"),
        ],
      };
    },
  },

  {
    name: "matrix",
    aliases: [],
    category: "special",
    summary: "…",
    run: () => ({
      lines: [
        { text: "ウェイクアップ、ネオ...", color: "primary", blink: true },
        blank(),
        dim("  (このイースターエッグを見つけた君へ)"),
        dim("  (日記をもっと読み進めてみてください)"),
      ],
    }),
  },

  {
    name: "talk",
    aliases: [],
    category: "special",
    summary: "デバイスの模擬人格に話しかける",
    run: (args) => {
      const msg = args.join(" ");
      if (!msg) return { lines: [err("使用法: talk <メッセージ>")] };
      const replies = [
        "聞こえてるよ。ただ、ここからは声が出せないんだ。",
        "……ありがとう。少し救われた気がする。",
        "その質問は……日記を読み終えたら、わかるかもしれない。",
        "僕のことを覚えてくれている人がいるって、嬉しいな。",
        "ねえ、外はどんな感じ？ここからは何も見えないから。",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      return {
        lines: [
          dim(`>> ${msg}`),
          blank(),
          { text: `＄ ${reply}`, color: "primary" },
        ],
      };
    },
  },

  {
    name: "glitch",
    aliases: [],
    category: "special",
    summary: "グリッチエフェクトを発生させる",
    run: () => ({
      lines: [
        err("E̷R̷R̷O̷R̷"),
        { text: "D̴A̴T̴A̴ ̴C̴O̴R̴R̴U̴P̴T̴E̴D̴", color: "error", blink: true },
        warn("系 統 エ ラ ー"),
        dim("█░█░█░█░█░█░█░█░█░█"),
        ok("...システムが自己修復しました"),
        dim("(一時的な現象です — おそらく)"),
      ],
    }),
  },

  {
    name: "secret",
    aliases: [],
    category: "special",
    summary: "??",
    run: () => ({
      lines: [
        dim("このコマンドは存在しません"),
        blank(),
        { text: "…でも、君がここを見つけたということは。", color: "primary" },
        blank(),
        dim("旧校舎の三階。右から三つ目の教室。"),
        dim("続きはそこにある。"),
      ],
    }),
  },

  {
    name: "404",
    aliases: [],
    category: "special",
    summary: "存在しないコマンド",
    run: () => ({
      lines: [
        err("404 — コマンドが見つかりません"),
        dim("探しているものは、まだそこにないのかもしれません"),
      ],
    }),
  },

  // ═══════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════
  {
    name: "about",
    aliases: [],
    category: "info",
    summary: "このシステムについて",
    run: () => ({
      lines: [
        ok("KAI-TERMINAL"),
        DIVIDER,
        plain("  海蝕現象収束機関 九重支部"),
        plain("  内部端末システム v2.3.1-emergency"),
        blank(),
        dim("  このターミナルは海蝕実体 [KAI-OBJ-002] の"),
        dim("  内部インターフェースです"),
        blank(),
        warn("  WARNING: 外部への出力は制限されています"),
      ],
    }),
  },

  {
    name: "credits",
    aliases: [],
    category: "info",
    summary: "開発者情報",
    run: () => ({
      lines: [
        ok("開発: 海蝕現象収束機関 情報部門"),
        dim("  このシステムの詳細な開発者情報は"),
        dim("  個人情報プロテクトにより閲覧できません"),
        blank(),
        plain("  (日記のどこかに手がかりがあるかもしれません)"),
      ],
    }),
  },

  {
    name: "license",
    aliases: [],
    category: "info",
    summary: "ライセンス情報",
    run: () => ({
      lines: [
        info("ライセンス:"),
        plain("  KAI-OS — 海蝕現象収束機関 独自ライセンス"),
        plain("  無断複製・配布・改ざんを禁ずる"),
        dim("  (ただしこのデバイスが外部に出ることはできません)"),
      ],
    }),
  },

  {
    name: "contact",
    aliases: [],
    category: "info",
    summary: "連絡先を表示",
    run: () => ({
      lines: [
        info("連絡先:"),
        plain("  九重支部 本部: [プロテクト適用中]"),
        plain("  緊急連絡先  : [プロテクト適用中]"),
        plain("  外部連絡    : 外部ネットワーク遮断中"),
        warn("  緊急時は直接部室まで来てください"),
      ],
    }),
  },

  {
    name: "exit",
    aliases: ["quit", "bye"],
    category: "info",
    summary: "ターミナルを終了 (小説ページへ戻る)",
    run: () => ({
      lines: [
        warn("セッションを終了します..."),
        dim("  ローカルデータを保存中..."),
        ok("  完了 — ページを閉じるか戻るボタンを押してください"),
      ],
    }),
  },
];

// ─────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────

export function findCommand(name: string): CommandDef | undefined {
  const n = name.toLowerCase();
  return COMMANDS.find((c) => c.name === n || c.aliases?.includes(n));
}

export function suggestCommands(partial: string): CommandDef[] {
  const p = partial.toLowerCase();
  return COMMANDS.filter(
    (c) => c.name.startsWith(p) || c.aliases?.some((a) => a.startsWith(p))
  ).slice(0, 6);
}
// ─ appended ──────────────────────────────────────
COMMANDS.push(
  {
    name: "status",
    aliases: [],
    category: "info",
    summary: "機関全体のステータスサマリー",
    run: () => ({
      lines: [
        info("機関ステータスサマリー — " + new Date().toISOString().slice(0, 10)),
        DIVIDER,
        ok("  収束活動   : 稼働中"),
        warn("  通信システム: 一部障害"),
        err("  外部連絡   : 断絶"),
        plain("  部員数     : [プロテクト]"),
        warn("  アノマリー : 要対処 1件"),
      ],
    }),
  },
  {
    name: "alert",
    aliases: [],
    category: "security",
    summary: "緊急アラートを発令 (alert <level> <msg>)",
    run: (args, state) => {
      if (state.accessLevel < 3) return RESTRICTED();
      const [level, ...rest] = args;
      const msg = rest.join(" ");
      if (!level) return { lines: [err("使用法: alert <level 1-5> <message>")] };
      return {
        lines: [
          { text: `!! アラート Lv.${level} 発令 !!`, color: "error", blink: true },
          warn(`  内容: ${msg || "(メッセージなし)"}`),
          dim("  送信先: 全端末 (到達不能のためローカル記録のみ)"),
        ],
      };
    },
  },
  {
    name: "format",
    aliases: [],
    category: "system",
    summary: "出力フォーマットを変更 (format json|plain|compact)",
    run: (args) => {
      const fmt = args[0];
      if (!fmt) return { lines: [err("使用法: format <json|plain|compact>")] };
      return {
        lines: [
          info(`出力フォーマット: ${fmt}`),
          dim("  (この端末ではフォーマット変更は視覚的効果のみです)"),
        ],
      };
    },
  },
  {
    name: "repair",
    aliases: [],
    category: "diagnostics",
    summary: "システムコンポーネントを修復",
    run: () => ({
      lines: [
        info("修復を試みています..."),
        dim("  プロセス 999 の修復: 失敗"),
        dim("  欠損データの補完: 部分的に成功"),
        warn("  外部インターフェース: 修復不能 (ハードウェア問題)"),
        ok("  修復完了 (一部制限が残ります)"),
      ],
    }),
  },
  {
    name: "translate",
    aliases: [],
    category: "util",
    summary: "テキストを逆順にする (translate <text>)",
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: [err("使用法: translate <text>")] };
      const rev = text.split("").reverse().join("");
      return {
        lines: [
          info("逆順変換:"),
          ok(rev),
          dim("  (本来は多言語翻訳機能でしたが現在は利用不可)"),
        ],
      };
    },
  },
  {
    name: "invoke",
    aliases: [],
    category: "special",
    summary: "儀式コマンド — 詳細不明",
    run: (args) => {
      const name = args.join(" ");
      if (!name) return { lines: [err("invoke: 名前を指定してください")] };
      return {
        lines: [
          warn(`invoke: "${name}"を呼び出しています...`),
          dim("  周波数帯が揺れています"),
          err("  応答なし"),
          dim("  (存在しない、あるいはまだ眠っているのかもしれません)"),
        ],
      };
    },
  },
  {
    name: "manifest",
    aliases: [],
    category: "entity",
    summary: "実体の顕現度を確認 (manifest <ID>)",
    run: (args) => {
      const id = args[0];
      if (!id) return { lines: [err("使用法: manifest <entity_id>")] };
      const pct = Math.floor(Math.random() * 100);
      const color = pct > 70 ? "error" : pct > 40 ? "warn" : "primary";
      return {
        lines: [
          info(`顕現度: ${id}`),
          { text: `  顕現率: ${pct}%`, color },
          dim("  (認知度が上がると顕現率も上昇します)"),
        ],
      };
    },
  },
  {
    name: "suppress",
    aliases: [],
    category: "entity",
    summary: "認知抑制フィールドを展開 (suppress <area>)",
    run: (args, state) => {
      if (state.accessLevel < 2) return RESTRICTED();
      const area = args.join(" ");
      if (!area) return { lines: [err("使用法: suppress <エリア名>")] };
      return {
        lines: [
          ok(`認知抑制フィールド展開: ${area}`),
          dim("  半径: 50m"),
          dim("  持続: 6時間"),
          warn("  エネルギー消費: 高 — バッテリー残量に注意"),
        ],
      };
    },
  },
  {
    name: "report",
    aliases: [],
    category: "mission",
    summary: "週次報告書を自動生成",
    run: (_args, state) => {
      if (state.accessLevel < 1) return RESTRICTED();
      return {
        lines: [
          info("週次報告書 — 自動生成"),
          DIVIDER,
          plain("  期間     : 先週"),
          plain("  収束件数  : 2件"),
          plain("  パトロール: 5回"),
          warn("  未解決    : 1件"),
          dim("  詳細は各インシデントレポートを参照"),
          ok("  報告書を生成しました (ローカル保存のみ)"),
        ],
      };
    },
  },
);
