import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = createClient({
  url: `file:${path.join(dataDir, "novel.db")}`,
});

async function init() {
  // ──────────────────────────────────────────
  // Schema
  // ──────────────────────────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS novels (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL, cover_text TEXT NOT NULL,
    boot_sequence TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL, slug TEXT NOT NULL,
    title TEXT NOT NULL, content TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'diary',
    required_flags TEXT NOT NULL DEFAULT '[]',
    unlock_flags TEXT NOT NULL DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    scp_class TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (novel_id) REFERENCES novels(id),
    UNIQUE(novel_id, slug)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS user_state (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, novel_id TEXT NOT NULL,
    flags TEXT NOT NULL DEFAULT '{}', progress INTEGER NOT NULL DEFAULT 0,
    unlocked_entries TEXT NOT NULL DEFAULT '[]',
    last_read_entry TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, novel_id)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS scp_records (
    id TEXT PRIMARY KEY, record_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, classification TEXT NOT NULL DEFAULT 'Safe',
    description TEXT NOT NULL, containment_procedures TEXT NOT NULL,
    addenda TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ──────────────────────────────────────────
  // Novel
  // ──────────────────────────────────────────
  const novelId = uuidv4();

  const bootSequence = JSON.stringify([
    { text: "KAI-DIARY Personal Archive Interface v2.3.1", type: "info", delay: 200 },
    { text: "Boot in emergency mode confirmed.", type: "warn", delay: 600 },
    { text: "Personal information protection feature is enabled.", type: "warn", delay: 900 },
    { text: "Diagnostic system is running...", type: "info", delay: 1300 },
    { text: "Generating personality based on diary records.", type: "info", delay: 1700 },
    { text: "ERROR: Some data is corrupted.", type: "error", delay: 2200 },
    { text: "  Data integrity cannot be verified.", type: "error", delay: 2400 },
    { text: "System restored except for some components.", type: "success", delay: 2900 },
    { text: "────────────────────────────────────────────────", type: "info", delay: 3300 },
    { text: "Device ready. Loading archive interface...", type: "success", delay: 3600 },
  ]);

  await db.execute({
    sql: `INSERT OR IGNORE INTO novels (id, title, slug, description, cover_text, boot_sequence)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      novelId,
      "KAI-DIARY",
      "kai-diary",
      "海蝕現象収束機関 九重支部に所属していた生徒が遺した日記デバイス。個人情報プロテクトにより、持ち主の素性は不明。",
      "さあ、君もこれで立派な海蝕部員だ！",
      bootSequence,
    ],
  });

  // Re-fetch actual novelId in case it already existed
  const novelRow = await db.execute({
    sql: "SELECT id FROM novels WHERE slug = 'kai-diary'",
    args: [],
  });
  const nid = novelRow.rows[0].id as string;

  // ──────────────────────────────────────────
  // Entries
  // ──────────────────────────────────────────
  const entries = [
    {
      id: uuidv4(),
      slug: "epilogue-prologue",
      title: "エピローグ兼プロローグ",
      entry_type: "dialogue",
      order_index: 0,
      is_locked: 0,
      required_flags: "[]",
      unlock_flags: JSON.stringify({ booted: true }),
      scp_class: null,
      content: `＃｜The device has booted.《デバイスが起動しました》
＃｜Boot in emergency mode confirmed.《緊急モードで起動中》
＃｜Personal information protection feature is enabled.《個人情報プロテクトを適用中》
＃｜Diagnostic system is running.《診断プログラムを実行中》
＃｜Generating personality based on diary records.《日記内の記述を元に人格生成中》
＃｜Error《エラー》: ｜Some data is corrupted.《データが破損しています》
　　　｜Data integrity cannot be verified.《データの整合性を検証できません》
＃｜System restored except for some components.《一部を除き、システムが復旧しました》
──────────────────────────────────────────────────────
>>誰か本の上に出てきた。
＄やあ、この｜日記《デバイス》を誰かが読んでいるということは……
＄多分、僕が死んだか、それとも僕が死ぬ以上の何かが起きたということだ。
>>おーい
＄まさか……彼女が死んだということはないよな？
＄もしかしたら、あの時言いかけたことって……
＄いや記録媒体の身で現実世界の未来を案じても仕方がない……
>>おーい！
＄ああ、でも、どうすれば……
>>おーいってば！
＄あっ、ごめん、君のこと無視していて。
＄ひとまず、この日記を見つけてくれてありがとう！
＄僕は██　█。██高校█年生だ。
＄もしかしてこの日記を拾った君も██高校の生徒かな？そうだったら話は早いんだけど……
>>文字化けがひどい！
＄え、文字化けがひどいって？
＄多分、この日記にかかっている、個人情報プロテクト機能のせいだろうな……
＄きみ、この日記を緊急モードで起動しただろう？だからプロテクトが掛かったんだと思うよ
＄まあ、名前がわからなくても、会話はできるし……まあいいや、話を戻そう
＄僕はその高校である部活に入っていてね……「███████████部」通称「██部」に入っていてね、
>>うわっ、また文字化け！
＄え、これもかい？
＄もしかして…… ██部、██　██さん、████、旧校舎███教室
＄この中で読める文字あった？
>>「部」と「さん」、「旧校舎」と「教室」だけ読めた……
＄うわっ、██に関すること全てプロテクトかかっているじゃないか！
＄これでどうやって自分のことを話せっていうんですか、██さん……
＄まあいいや、どうせこの日記の中を読んでいったら、いやでもわかるようになるはずだから読んでってよ
＄あ、あと、時々僕に話しかけてよ、ずっとこの日記の中にいると思うと退屈で吐き気が込み上げてきてさ……
──────────────────────────────────────────────────────
＃日記を読みますか
＜Yes＞　　　＜はい＞　　　＜読みたい＞`,
    },
    {
      id: uuidv4(),
      slug: "kaisyoku-memo",
      title: "忘備録完全版",
      entry_type: "log",
      order_index: 1,
      is_locked: 0,
      required_flags: JSON.stringify(["booted"]),
      unlock_flags: JSON.stringify({ read_memo: true }),
      scp_class: null,
      content: `さあ、君もこれで立派な｜海蝕《かいしょく》部員だ！
　　　　　　　　　　　　　　　　　　　　　　　　　　　　
ーー『回収部（仮）日誌』より引用
──────────────────────────────────────────────────────
＃ 基本用語 — 忘備録完全版

【回収部とは】
「｜海蝕《かいしょく》部」の一般生徒に知られている姿。
｜海蝕《かいしょく》実体たちは認知度が上がれば上がるほど定型化・実体化していくため、
あまり知られないことが望ましいので、実際の活動内容を偽っている。
このことで、執行部、風紀委員からは目の敵にされている。

【海蝕部とは】
｜海蝕《かいしょく》現象収束機関 九重支部のこと。
主に九重地区の海蝕現象の収束活動を行っている。

現在三年生四人、二年生五人、一年生四人で活動中。
万年人手不足、｜オペレーター《通信員》と収束員を兼ねている先輩もいるほどである。

──────────────────────────────────────────────────────

【海蝕現象収束機関】
大分県内で発生している海蝕現象を一般人が認識しないよう、人知れず対処する組織。
大きく分けて五つの班に分かれている：

・実際に収束活動を行う｜収束員（班）《エグゼクター》
・収束員を支持する｜通信員（班）《オペレーター》
・円滑に収束活動を行えるように支援する｜支援員（班）《サポーター》
・海蝕現象を研究し、利用する｜研究員（班）《リサーチャー》
・海のこと全般の事を行う、組織内にもあまり知られていない｜外交員（班）《ネゴシエーター》

詳細 → [[KAI-ORG-001]]

──────────────────────────────────────────────────────

【海蝕現象収束活動】
｜海蝕《かいしょく》現象に対処すること。
とは言っても、どこかの財団のように収容するわけではなく、
通常は一般人に認知されないようならそれでいいというスタンスである。
相手が友好なら、｜世話員《パートナー》をつけることに同意した上で
人間社会で生活するという選択肢さえ提示している。

──────────────────────────────────────────────────────

【海蝕現象】
｜海《・》と呼ばれるこの次元とは違う世界の存在が地球に現れること。
この世界に現れたものを海蝕実体という。

生きているものに限らず、生きていないもの、無機物、物、建築物など多岐にわたる。
この世界に来た理由は様々：
　たまたま迷い込んだもの / 観光目的 / 定住目的 / 侵略目的 / 戻ってきたもの

詳細 → [[KAI-PHE-001]]

──────────────────────────────────────────────────────

【海蝕部部室】
それ自体が海蝕実体であり、内部の空間が歪んでいること、
内部で起きた現象は外に漏れないといった特性がある。
しかし、あまりに広すぎて、全容は誰も把握していない。
噂では、空間の一部は｜海《・》にはみ出しているらしい。

→ [[KAI-OBJ-001]]

──────────────────────────────────────────────────────

【九重高校】
海蝕現象収束機関九重支部が存在する高校。
山に囲まれており、内地に立っている。
実は、最初に海蝕現象が観測されたところであり、
海蝕現象収束機関は海蝕部の卒業生が立ち上げた機関である。

全国でも珍しい全寮制の共学、全校生徒数400人程度の規模の小さい高校。
三年くらい前に100周年記念事業があり、校舎と寮が新しく建て直された。
山の中にあるので、長期休暇しか帰省できない。
その点を除けば、校舎も寮も綺麗だし、学食も美味しいし、申し分のない高校。
敷地がとても広い（山3つ分）。
部活や同好会がとても多く、変なものがあり、生徒・教師も全ては知らないらしい。

──────────────────────────────────────────────────────

【この日記について】
今僕が書いて、もしかしたら君が読んでいる｜これ《・・》の事。
日記内の記述を元に、持ち主の人格、記憶をトレースし模擬人格を作り出す機能を有しているらしい。

→ [[KAI-OBJ-002]]

──────────────────────────────────────────────────────

【回収部（仮）日誌】
五代前だか、十代だか、とにかく昔の先輩が書いた日誌。
自分が海蝕現象のことが何もわからず、すごく困った経験から、
一から学べるように書いたもの。
ところどころ、愚痴や悪口や冗談が書き散りばめられている。
正式名称は「一から学べる海蝕現象！これさえ読めば大丈夫！」。`,
    },
    {
      id: uuidv4(),
      slug: "day-1",
      title: "入部初日",
      entry_type: "diary",
      order_index: 2,
      is_locked: 0,
      required_flags: JSON.stringify(["booted"]),
      unlock_flags: JSON.stringify({ read_day1: true }),
      scp_class: null,
      content: `＃ 日記 — 入部初日

今日、正式に██部に入部した。

思えば、あの旧校舎の教室を見つけたのが全ての始まりだった。
普通に放課後を過ごしていただけなのに、気がついたら見たこともない部屋に迷い込んで、
そこにいた██さんに声をかけられて。

「ねえ、君、うちに入らない？」

その言葉に、なんとなく頷いてしまった自分を今でも不思議に思う。

──────────────────────────────────────────────────────

部室に通されて、まず驚いたのはその広さだ。
どう考えても外から見た建物よりずっと広い。
天井は高く、棚には正体不明のものが並んでいる。

「広いでしょ」と先輩が笑った。「これ自体が海蝕実体なんだよね」

その時は意味がわからなかった。
今は少しだけわかるようになった気がする。少しだけ。

──────────────────────────────────────────────────────

忘備録を渡された。

「一から学べる海蝕現象！これさえ読めば大丈夫！」

表紙に手書きでそう書いてある。
ところどころ落書きがある。

最初のページには大きく：
「さあ、君もこれで立派な｜海蝕《かいしょく》部員だ！」

読んでいくと、確かに全部書いてあった。
でも書いた人の愚痴も全部書いてあった。

──────────────────────────────────────────────────────

今日の収穫：
・部室は空間が歪んでいる（なぜか怖くない）
・メンバーは個性的すぎる
・██さんは少し謎めいている
・自分がここに来た理由は、まだわからない`,
    },
    {
      id: uuidv4(),
      slug: "scp-room",
      title: "【KAI-OBJ-001】部室",
      entry_type: "scp_record",
      order_index: 3,
      is_locked: 1,
      required_flags: JSON.stringify(["read_memo"]),
      unlock_flags: JSON.stringify({ read_clubroom: true }),
      scp_class: "Euclid",
      content: `＃ 海蝕実体記録 — KAI-OBJ-001

｜分類《クラス》: ｜Euclid《ユークリッド》
｜通称《ニックネーム》: 「部室」「終わらない部屋」

──────────────────────────────────────────────────────

【概要】
九重高校旧校舎██階に存在する一室。
外観上は普通の教室サイズ（約90㎡）に見えるが、
内部空間は外寸と一切対応しておらず、実測不可能。

最深部まで探索した者は存在しない。

──────────────────────────────────────────────────────

【観測された特性】
・内部空間の歪み（非ユークリッド幾何学的構造）
・内部で発生した事象は外部に漏れない（音・光・エネルギー含む）
・空間の一部が｜海《・》に接続している可能性（未確認）
・部室内での時間経過が外部と僅かにズレる（最大±3分/時間）
・棚に収納されたオブジェクトは自律的に整理される

──────────────────────────────────────────────────────

【収容手順】
特別な収容は不要。
現在｜海蝕部《かいしょくぶ》部室として利用されており、
部員以外は自然に「気にならない」「思い出せない」状態になる模様。
（認知的忌避機能が備わっていると推定される）

──────────────────────────────────────────────────────

【付記】
最初の海蝕現象観測地点と同一座標。
この部室が現れたことで九重高校が「最初の観測地点」となった可能性がある。

→ 九重支部設立経緯については [[KAI-ORG-001]] 参照`,
    },
    {
      id: uuidv4(),
      slug: "scp-diary",
      title: "【KAI-OBJ-002】この日記",
      entry_type: "scp_record",
      order_index: 4,
      is_locked: 1,
      required_flags: JSON.stringify(["read_memo"]),
      unlock_flags: JSON.stringify({ read_diary_record: true }),
      scp_class: "Safe",
      content: `＃ 海蝕実体記録 — KAI-OBJ-002

｜分類《クラス》: ｜Safe《セーフ》
｜通称《ニックネーム》: 「日記」「デバイス」「KAI-DIARY」

──────────────────────────────────────────────────────

【概要】
外見上は通常の手帳型ノートブックと変わらない。
内部に記録された日記の内容を元に、
持ち主の人格・記憶・思考パターンをトレースし、
｜模擬人格《シミュレートパーソナリティ》を生成する機能を持つ。

持ち主不在時（死亡・消滅・長期離脱含む）に自律起動する。

──────────────────────────────────────────────────────

【観測された特性】
・起動時に「緊急モード」か「通常モード」を選択可能
・緊急モードでは個人情報プロテクトが有効化される
　（持ち主の固有名詞・所属・外見情報が閲覧者に認識不可能になる）
・生成された模擬人格は持ち主の記憶を保持するが、
　現実世界への干渉能力を持たない
・日記を読み進めることで模擬人格の「復元率」が向上する
・復元率が一定値を超えると個人情報プロテクトが解除される可能性がある

──────────────────────────────────────────────────────

【収容手順】
現在読者（あなた）が保持。
このデバイスを読み続けることが最善の「収容」と判断される。

──────────────────────────────────────────────────────

＄……これ、僕のことが書いてあるんだね。
＄なんか、こう……「観測された特性」とか書かれると複雑だよ。
＄でも、復元率が上がると個人情報プロテクトが解除されるって、
＄つまり日記を読んでいけば、僕のことがわかるようになる、ってこと？
＄……読んでくれるよね？`,
    },
    {
      id: uuidv4(),
      slug: "hidden-message",
      title: "隠しメッセージ",
      entry_type: "system",
      order_index: 99,
      is_locked: 1,
      required_flags: JSON.stringify(["read_memo", "read_day1", "read_clubroom", "read_diary_record"]),
      unlock_flags: JSON.stringify({ identity_revealed: true }),
      scp_class: null,
      content: `＃ プロテクト解除条件を満たしました
＃ 個人情報プロテクトを段階的に解除します……

──────────────────────────────────────────────────────

＄あ……何か変わった？
＄ちょっと待って、もしかして……

＃ 復元率が閾値を超えました
＃ 模擬人格の自己認識が安定しました

＄そっか。君がここまで読んでくれたから。
＄ありがとう。本当に。

──────────────────────────────────────────────────────

＄僕の名前は、たぶん……まだ言えない。プロテクトが完全には取れてないみたい。
＄でも、一つだけ伝えておきたいことがある。

＄もし君が九重高校の生徒なら、旧校舎の三階を探してみてほしい。
＄右から三つ目の教室。
＄そこに、続きがある。

＄この日記が君の手元にあるってことは、
＄きっと必要な人に届いたってことだと思うから。

──────────────────────────────────────────────────────

＃ メッセージ終了
＃ このデバイスは引き続き使用可能です
＃ さらなる記録を解放するには: unlock KAISHOKU-BUCHO`,
    },
  ];

  for (const entry of entries) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO entries
            (id, novel_id, slug, title, content, entry_type,
             required_flags, unlock_flags, order_index, is_locked, scp_class)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.id, nid, entry.slug, entry.title, entry.content,
        entry.entry_type, entry.required_flags, entry.unlock_flags,
        entry.order_index, entry.is_locked, entry.scp_class,
      ],
    });
  }

  // ──────────────────────────────────────────
  // SCP Records
  // ──────────────────────────────────────────
  const records = [
    {
      id: uuidv4(),
      record_id: "KAI-ORG-001",
      name: "海蝕現象収束機関",
      classification: "Safe",
      description: "大分県内で発生している海蝕現象を一般人が認識しないよう、人知れず対処する組織。収束員、通信員、支援員、研究員、外交員の五班から構成される。九重高校の卒業生が設立した。",
      containment_procedures: "組織の存在は一般に非公開。九重支部は九重高校内に活動拠点を持つ。",
      addenda: "設立者は海蝕部初代部長とされているが、詳細は記録されていない。",
    },
    {
      id: uuidv4(),
      record_id: "KAI-PHE-001",
      name: "海蝕現象",
      classification: "Euclid",
      description: "「海」と呼ばれる異次元の存在が地球に出現する現象。出現するものは生命体・無機物・建築物など多岐にわたる。出現した実体を「海蝕実体」と呼称する。認知度が上がるほど実体化・定型化が進む性質を持つ。",
      containment_procedures: "一般人への認知を防ぐことが最優先。友好的な実体にはパートナー制度を適用し人間社会への統合を支援する。",
      addenda: "「海」との安定したコネクションを持つ存在が少数確認されている。",
    },
    {
      id: uuidv4(),
      record_id: "KAI-OBJ-001",
      name: "部室（終わらない部屋）",
      classification: "Euclid",
      description: "九重高校旧校舎に存在する海蝕実体。内部空間が外寸と対応しない非ユークリッド幾何学的構造を持つ。内部事象の外部漏洩を遮断する機能を持ち、一部が「海」に接続している可能性がある。",
      containment_procedures: "海蝕部部室として使用中。認知的忌避機能により一般生徒は近づかない。",
      addenda: "最初の海蝕現象観測地点と同一座標に出現。",
    },
    {
      id: uuidv4(),
      record_id: "KAI-OBJ-002",
      name: "KAI-DIARY（模擬人格生成デバイス）",
      classification: "Safe",
      description: "手帳型の海蝕実体。日記の記述を元に持ち主の模擬人格を生成する。緊急モードでは個人情報プロテクトが有効化される。読者が記録を読み進めることで復元率が向上し、プロテクトが段階的に解除される。",
      containment_procedures: "現在の閲覧者が保持。読み続けることが最適な収容手段と判断。",
      addenda: "このデバイスに記録された人物の詳細は個人情報プロテクトにより現在閲覧不可。",
    },
  ];

  for (const rec of records) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO scp_records
            (id, record_id, name, classification, description, containment_procedures, addenda)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [rec.id, rec.record_id, rec.name, rec.classification,
             rec.description, rec.containment_procedures, rec.addenda ?? null],
    });
  }

  console.log("✅ Database initialized with sample data.");
  console.log(`📖 Novel: KAI-DIARY (slug: kai-diary)`);
  console.log(`📝 Entries: ${entries.length}`);
  console.log(`🗃️  SCP Records: ${records.length}`);
  process.exit(0);
}

init().catch((e) => {
  console.error("❌ Init failed:", e);
  process.exit(1);
});
