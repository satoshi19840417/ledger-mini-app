import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

// ---- 動的 import（初期描画を軽くする）----
let PapaLib = null;   // papaparse キャッシュ
let XLSXLib = null;   // xlsx キャッシュ
async function ensurePapa() {
  if (PapaLib) return PapaLib;
  const m = await import("papaparse");
  PapaLib = m.default || m;
  return PapaLib;
}
async function ensureXLSX() {
  if (XLSXLib) return XLSXLib;
  const m = await import("xlsx");
  XLSXLib = m;
  return XLSXLib;
}

// ==== サンプルデータ（保存用）====
const SAMPLE_CSV_JUNE_SJIS_BASE64 =
  "IpROjI6T+iIsIoKyl5iXcI/qj4oiLCKCspeYl3CT4JdlIiwigrKXmJdwi+CKeiIsIo54laWL5pWqIiwiju2VyiIsIoKojniVpYpKIkNvbmNhdGVuYXRlZC1maWxlIiwi5pel5pys5LiK5pel5pysIiwi5p2x5Lqs5LqL5rKiIiwiMzIwIiwiMeacnyIsIumrm+W6lwkiLCIiXG4iMjAyNeKAoiDkuIrml6XmnKwiLCLovI7ku6UiLCLkuqzmlrwiLCI2NDAwIiwiMeacnyIsIuW3suS6uuWgh+W+jSIsIiJcbiIyMDI15YKd5pel5pys5LiK5pel5pysIiwiSlLlj7fkuJPjgI3jgI0iLCLkuK3lroblkI3mjK8iLCI3ODAiLCIx5pyfIiwib+e8lOivryIsIiJcbiIyMDI15YKd5pel5pys5LiK5pel5pysIiwi44Kz44Oz44K544OI44Op44Kk44Oz44OJ44OhIiwi44K/44Oz44K/IiwiNTgwIiwiMeacnyIsIuOCueODs+OCouODg+OCp+ODnyIsIiJcbiIyMDI15YKd5pel5pys5LiK5pel5pysIiwiQW1hem9uIiwi56aP5YipIiwiMSwzMjAiLCIx5pyfIiwi44K/44Oz44K/IiwiIlxuIjIwMjXlgp3ml6XmnKzkuIrml6XmnKwiLCJFTkVPUyIsIuaTqCIsIiw2LDIwMCIsIjHmnJ8iLCLjgr/jg7Pjgr8iLCIiXG4iMjAyNeWCneaXpeacrOS4iuaXpeacrCIsIlVOSVFMTyIsIuWNgCIsIjEsOTkwIiwiMeacnyIsIuOCv+ODs+OCvyIsIiJcbiIyMDI15YKd5pel5pys5LiK5pel5pysIiwi5q2j5b6M44Ki44Or44OQ44O844K544OIIiwi5Y+W5LyaIiwiMiwxNzgiLCIx5pyfIiwi5pel5bi4IiwiIlxuIjIwMjXlgp3ml6XmnKzkuIrml6XmnKwiLCLlupTnq5jlpKnpgY3jgqTjg4vjg6zjg7wiLCIxLDI4MCIsIjHmnJ8iLCLjgr/jg7Pjgr8iLCIiXG4iMjAyNeWCneaXpeacrOS4iuaXpeacrCIsIuW+t+eUsuWciCIsIlVTQumHj+W9kSIsIjEsMjgwIiwiMeacnyIsIuOCv+ODs+OCvyIsIiJcbiIyMDI15YKd5pel5pys5LiK5pel5pysIiwi5a6J5bm45bqX6KGo5Y+wIiwi55Wq5p2x5pGpIiwiMyw1MDAiLCIx5pyfIiwi5Y+v6aGg5ZCI5Y+jIiwiIlxu";
const SAMPLE_CSV_JULY_UTF8 =
  `"年月日","ご利用場所","ご利用内容","ご利用金額","支払区分"\\n` +
  `"2025年7月1日","セブン-イレブン","パン","220","1回"\\n` +
  `"2025年7月3日","東京ガス","7月分","6500","1回"\\n` +
  `"2025年7月4日","モスバーガー","セット","780","1回"\\n` +
  `"2025年7月7日","成城石井","惣菜","1280","1回"\\n` +
  `"2025年7月10日","ENEOS","給油","6000","1回"\\n` +
  `"2025年7月12日","JR東日本","乗車","560","1回"\\n` +
  `"2025年7月15日","UNIQLO","ソックス","590","1回"\\n` +
  `"2025年7月20日","Netflix","サブスク","790","1回"\\n` +
  `"2025年7月25日","ヨドバシカメラ","HDMIケーブル","980","1回"\\n` +
  `"2025年7月28日","水道局","水道料金","3600","1回"`;
const SAMPLE_CSV_DUP_UTF8 =
  `"年月日","ご利用場所","ご利用内容","ご利用金額","支払区分"\\n` +
  `"2025年7月3日","東京ガス","7月分","6500","1回"\\n` +
  `"2025年7月10日","ENEOS","給油","6000","1回"\\n` +
  `"2025年7月12日","JR東日本","乗車","560","1回"\\n` +
  `"2025年7月22日","スターバックス","フラペチーノ","680","1回"`;
const SAMPLE_CSV_ALT_UTF8 =
  `"年月日","ご利用先","ご利用内容","金額","お支払回数","種別"\\n` +
  `"2025年8月1日","ファミリーマート","お茶","150","1回","ショッピング"\\n` +
  `"2025年8月2日","ドトール","カフェラテ","360","1回","ショッピング"\\n` +
  `"2025年8月3日","小田急","乗車","450","1回","交通"\\n` +
  `"2025年8月5日","楽天","ネット購入","2450","1回","ショッピング"\\n` +
  `"2025年8月10日","病院","診察","1200","1回","医療"`;
const SAMPLE_RECLASS_TXT =
  `セブン-イレブン→食費\nスターバックス→外食費\nモスバーガー→外食費\nNetflix→趣味・娯楽・サブスク\nヨドバシカメラ→趣味・娯楽・サブスク\n病院→医療・健康`;

// ==== ユーティリティ ====
const jpDateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
function parseJpDateToISO(s) {
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(jpDateRegex);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    return dt;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}
function ym(dt) { if (!dt) return ""; const y = dt.getFullYear(); const m = dt.getMonth() + 1; return `${y}-${String(m).padStart(2, "0")}`; }
function toNumberAmount(v) {
  if (v == null) return 0;
  const n = String(v).replace(/,/g, "").replace(/円/g, "").replace(/[^0-9\.-]/g, "").trim();
  const num = parseFloat(n);
  return isNaN(num) ? 0 : num;
}
function normalize(s) { return s ? s.toString().normalize("NFKC").toUpperCase() : ""; }

// ==== カテゴリ ====
const CATEGORY_LIST = [
  "住居・光熱", "通信", "交通・移動", "外食費", "食費", "日用品・消耗品", "医療・健康",
  "衣服・美容", "趣味・娯楽・サブスク", "教養・教育", "旅行・レジャー", "通販", "保険",
  "税金", "手数料・年会費", "仕事・ソフトウェア", "その他",
];

// ==== 初期ルール（例） ====
const DEFAULT_RULES = [
  { pattern: "東京電力|TEPCO|関西電力|中部電力|東北電力|九州電力|中国電力|北陸電力|北海道電力|四国電力|沖縄電力", category: "住居・光熱", type: "regex" },
  { pattern: "東京ガス|大阪ガス|東邦ガス|西部ガス|都市ガス|LPガス|プロパン", category: "住居・光熱", type: "regex" },
  { pattern: "水道局|上下水道|水道料金|県営水道|市水道", category: "住居・光熱", type: "regex" },
  { pattern: "家賃|賃料|管理費|共益費", category: "住居・光熱", type: "regex" },
  { pattern: "DOCOMO|AU|KDDI|SOFTBANK|楽天モバイル|UQ|Y!MOBILE|NURO|OCN|BIGLOBE|IIJ|MINEO|LINEMO|AHAMO", category: "通信", type: "regex" },
  { pattern: "インターネット|光回線|プロバイダ|WI-?FI|ROUTER|MODEM", category: "通信", type: "regex" },
  { pattern: "PASMO|SUICA|ICOCA|TOICA|SUGOCA|NIMOCA|HAYAKAKEN|KITACA|モバイルPASMO|モバイルSUICA", category: "交通・移動", type: "regex" },
  { pattern: "JR|小田急|京王|京成|京急|東武|西武|相鉄|つくばエクスプレス|TX|ゆりかもめ|都営|地下鉄|メトロ|バス|リムジンバス", category: "交通・移動", type: "regex" },
  { pattern: "TAXI|タクシー|S\\.RIDE|GO\\s?タクシー|UBER\\s*TAXI|DIDI", category: "交通・移動", type: "regex" },
  { pattern: "タイムズ|Repark|リパーク|NPC|パーキング|NEXCO|首都高|高速料金|有料道路", category: "交通・移動", type: "regex" },
  { pattern: "ENEOS|出光|コスモ|昭和シェル|キグナス|ESSO|MOBIL|GASOLINE|ガソリン|給油|セルフ", category: "交通・移動", type: "regex" },
  { pattern: "JAL|ANA|PEACH|JETSTAR|AIRASIA|SCOOT|航空券", category: "交通・移動", type: "regex" },
  { pattern: "レンタカー|TIMES\\s*CAR|オリックスレンタカー|ニッポンレンタカー", category: "交通・移動", type: "regex" },
  { pattern: "STARBUCKS|スターバックス|ドトール|タリーズ|コメダ|ベローチェ|サンマルク|カフェ", category: "外食費", type: "regex" },
  { pattern: "マクドナルド|モスバーガー|KFC|ケンタッキー|サイゼリヤ|ガスト|バーミヤン|ジョナサン|吉野家|松屋|すき家|やよい軒|くら寿司|スシロー|はま寿司|牛角|焼肉|ラーメン|うどん|そば|居酒屋|鳥貴族|HUB", category: "外食費", type: "regex" },
  { pattern: "UBER\\s*EATS|出前館|WOLT|MENU|デリバリ", category: "外食費", type: "regex" },
  { pattern: "セブン\\s?-?\\s?イレブン|7\\s?-?\\s?ELEVEN|ファミリーマート|ローソン|ミニストップ|NEWDAYS", category: "食費", type: "regex" },
  { pattern: "イオン|西友|SEIYU|イトーヨーカドー|ライフ|マルエツ|ヤオコー|オーケー|いなげや|ベルク|サミット|業務スーパー|成城石井|オリンピック|ランドローム", category: "食費", type: "regex" },
  { pattern: "DAISO|ダイソー|セリア|キャンドゥ|ニトリ|NITORI|カインズ|コーナン|島忠|ドンキ|無印良品|MUJI", category: "日用品・消耗品", type: "regex" },
  { pattern: "マツモトキヨシ|ウエルシア|ツルハ|サンドラッグ|ココカラ|スギ薬局|ドラッグストア|調剤|クリニック|医院|歯科|病院", category: "医療・健康", type: "regex" },
  { pattern: "UNIQLO|ユニクロ|GU|ZARA|H&M|ABC\\s?-?\\s?MART|クリーニング|理容|美容院|QB\\s*HOUSE", category: "衣服・美容", type: "regex" },
  { pattern: "NETFLIX|HULU|SPOTIFY|YOUTUBE\\s*PREMIUM|PRIME\\s*VIDEO|APPLE\\s*MUSIC|KINDLE|PLAYSTATION|PSN|SWITCH|STEAM|DMM", category: "趣味・娯楽・サブスク", type: "regex" },
  { pattern: "ヨドバシ|ビックカメラ|ヤマダ電機|コジマ|ケーズデンキ|JOSHIN|ソフマップ|APPLE\\s*STORE|GOOGLE\\s*PLAY|MICROSOFT", category: "趣味・娯楽・サブスク", type: "regex" },
  { pattern: "紀伊國屋|丸善|ジュンク堂|TSUTAYA|BOOK\\s?-?\\s?OFF|ブックオフ|本屋|書店|UDEMY|英会話|受講|検定|教材", category: "教養・教育", type: "regex" },
  { pattern: "ホテル|旅館|宿泊|HOSTEL|AIRBNB|BOOKING\\.COM|AGODA|EXPEDIA|HIS|JTB|観光|温泉|USJ|ディズニー|TRIP\\.COM", category: "旅行・レジャー", type: "regex" },
  { pattern: "AMAZON|アマゾン|楽天|RAKUTEN|YAHOO!|PAYPAYモール|メルカリ|ラクマ", category: "通販", type: "regex" },
  { pattern: "年会費|更新料|手数料|チャージ手数料|ETC年会費", category: "手数料・年会費", type: "regex" },
  { pattern: "保険料|損保|生保|共済|年金基金", category: "保険", type: "regex" },
  { pattern: "税|住民税|国税|都税|県税|印紙", category: "税金", type: "regex" },
  { pattern: "ADOBE|CREATIVE\\s*CLOUD|MICROSOFT\\s*365|DROPBOX|NOTION|SLACK|GITHUB|ZOOM|CANVA", category: "仕事・ソフトウェア", type: "regex" },
];

const LS_RULES = "epos_rulebook_v1";

// ==== 取引型 ====
// { date: Date, ym: 'YYYY-MM', merchant: string, detail: string, amount: number, pay: string, raw: object, category: string }

export default function HouseholdLedgerApp() {
  const [rows, setRows] = useState([]);
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem(LS_RULES);
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [loading, setLoading] = useState(false);
  const [selectedYM, setSelectedYM] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => { localStorage.setItem(LS_RULES, JSON.stringify(rules)); }, [rules]);

  // === CSV前処理：タイトル行やBOMを除去し、本当のヘッダー行から始める ===
  function preprocessEposCSVText(text) {
    if (!text) return { text: "", skipped: 0 };
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM 除去
    const lines = text.split(/\r?\n/);
    let headerIdx = 0;
    for (let i = 0; i < Math.min(80, lines.length); i++) {
      const ln = lines[i];
      if (/年月日/.test(ln) && /(ご利用場所|ご利用先|利用先)/.test(ln) && /(ご利用金額|金額)/.test(ln)) {
        headerIdx = i; break;
      }
    }
    if (headerIdx > 0) {
      return { text: lines.slice(headerIdx).join("\n"), skipped: headerIdx };
    }
    return { text, skipped: 0 };
  }

  // 複数CSV読込（Shift_JIS/UTF-8/UTF-16LE 自動判別 + タイトル自動スキップ + 区切りフォールバック）
  const handleCSVs = async (fileList) => {
    try {
      setError("");
      if (!fileList || fileList.length === 0) { setError("CSVファイルが選択されていません"); return; }
      const files = Array.from(fileList).filter(f => f && f instanceof Blob);
      if (!files.length) { setError("有効なCSVが見つかりません（Blob/Fileではありません）"); return; }
      setLoading(true);
      setMessage(`読み込み中… (${files.length}ファイル)`);

      const Papa = await ensurePapa();
      const allRows = []; let skippedAny = false; let failedFiles = 0;

      for (const f of files) {
        try {
          // 1) 文字コード自動判別で読み取り
          const textRaw = await readFileSmart(f);
          if (typeof textRaw !== "string") { failedFiles++; continue; }

          // 2) タイトル行の貪欲スキップ
          const { text, skipped } = preprocessEposCSVText(textRaw);
          skippedAny = skippedAny || skipped > 0;

          // 3) さらに安全のため、ヘッダー行をもう一度だけ探索して切り直し
          let text2 = text;
          {
            const lines = text.split(/\r?\n/);
            const first = (lines[0] || "");
            if (!/年月日/.test(first) || !/(ご利用場所|ご利用先|利用先)/.test(first)) {
              const i = lines.findIndex(ln =>
                /年月日/.test(ln) &&
                /(ご利用場所|ご利用先|利用先)/.test(ln) &&
                /(ご利用金額|金額)/.test(ln)
              );
              if (i >= 0) text2 = lines.slice(i).join("\n");
            }
          }

          // 4) ヘッダー検査（正規化して判定）
          const headerPass = (fields) => {
            const norm = (fields || []).map(h => String(h)
              .replace(/\uFEFF/g, "")  // BOM
              .replace(/\s+/g, "")     // 空白除去
            );
            const s = norm.join("|");
            return /年月日/.test(s) &&
                   /(ご利用場所|ご利用先|利用先)/.test(s) &&
                   /(ご利用金額|金額)/.test(s);
          };

          // 5) カンマ → タブ → セミコロン の順でパース
          let parsed = Papa.parse(text2, {
            header: true,
            skipEmptyLines: "greedy",
            delimiter: ",",
            transformHeader: (h) => String(h).replace(/\uFEFF/g, "").trim(),
          });
          let cols = parsed.meta?.fields || [];

          if (!headerPass(cols)) {
            const tryTab = Papa.parse(text2, {
              header: true,
              skipEmptyLines: "greedy",
              delimiter: "\t",
              transformHeader: (h) => String(h).replace(/\uFEFF/g, "").trim(),
            });
            if (headerPass(tryTab.meta?.fields)) { parsed = tryTab; cols = tryTab.meta.fields; }
          }
          if (!headerPass(cols)) {
            const trySemi = Papa.parse(text2, {
              header: true,
              skipEmptyLines: "greedy",
              delimiter: ";",
              transformHeader: (h) => String(h).replace(/\uFEFF/g, "").trim(),
            });
            if (headerPass(trySemi.meta?.fields)) { parsed = trySemi; cols = trySemi.meta.fields; }
          }
          if (!headerPass(cols)) { failedFiles++; continue; }

          // 6) マッピング
          const mapped = parsed.data.map((r) => mapEposRow(r, cols));
          const cleaned = mapped.filter((r) => r.date && r.amount !== 0);
          allRows.push(...cleaned);
        } catch (e) {
          console.error(e); failedFiles++;
        }
      }

      // 重複除外（同一キー：日付|場所|内容|金額|支払区分）
      const keySet = new Set();
      const dedup = [];
      for (const r of allRows) {
        const k = `${fmtDate(r.date)}|${r.merchant}|${r.detail}|${r.amount}|${r.pay}`;
        if (!keySet.has(k)) { keySet.add(k); dedup.push(r); }
      }
      dedup.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

      setRows(dedup);
      const firstYM = dedup[0]?.ym || "";
      const lastYM = dedup[dedup.length - 1]?.ym || "";
      let note = "";
      if (skippedAny) note += "（先頭の説明行を自動スキップ）";
      if (failedFiles > 0) note += `（${failedFiles}ファイルは列が認識できずスキップ）`;
      setMessage(`読み込み完了：${dedup.length}件 / 期間 ${firstYM} 〜 ${lastYM}（${files.length}ファイル結合・重複除外済）` + note);

      if (!dedup.length) {
        setError("明細が抽出できませんでした。CSVの先頭にタイトル行が入っていないか、列名が大きく異なる可能性があります。");
      }
    } catch (e) {
      console.error(e); setError(e?.message || "読み込み中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 単一CSV（後方互換）
  const handleCSV = async (file) => handleCSVs([file]);

  // ルール適用
  const classifiedRows = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((row) => {
      const text = normalize(`${row.merchant || ""} ${row.detail || ""}`);
      let cat = "その他";
      for (const rule of rules) {
        try {
          if ((rule.type || "regex") === "regex") {
            const re = new RegExp(rule.pattern, "i");
            if (re.test(text)) { cat = rule.category; }
          } else {
            if (text.includes(normalize(rule.pattern))) { cat = rule.category; }
          }
        } catch { /* 無効な正規表現はスキップ */ }
      }
      return { ...row, category: cat };
    });
  }, [rows, rules]);

  const months = useMemo(() => {
    const set = new Set(classifiedRows.map(r => r.ym));
    return ["ALL", ...Array.from(set).sort()];
  }, [classifiedRows]);

  const filtered = useMemo(
    () => selectedYM === "ALL" ? classifiedRows : classifiedRows.filter(r => r.ym === selectedYM),
    [classifiedRows, selectedYM]
  );

  // 月次合計
  const monthlySum = useMemo(() => {
    const m = {};
    for (const r of classifiedRows) { m[r.ym] = (m[r.ym] || 0) + r.amount; }
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ ym: k, amount: Math.round(v) }));
  }, [classifiedRows]);

  // カテゴリ別合計（選択範囲）
  const byCategory = useMemo(() => {
    const m = new Map();
    for (const r of filtered) { m.set(r.category, (m.get(r.category) || 0) + r.amount); }
    const arr = Array.from(m.entries()).map(([category, amount]) => ({ category, amount: Math.round(amount) }));
    arr.sort((a, b) => b.amount - a.amount);
    return arr;
  }, [filtered]);

  const otherTop = useMemo(() => {
    const list = filtered.filter(r => r.category === "その他");
    const m = new Map();
    for (const r of list) {
      const key = r.merchant || r.detail || "(不明)";
      m.set(key, (m.get(key) || 0) + r.amount);
    }
    const arr = Array.from(m.entries()).map(([key, amount]) => ({ key, amount: Math.round(amount) }));
    arr.sort((a, b) => b.amount - a.amount);
    return arr.slice(0, 20);
  }, [filtered]);

  const pieData = useMemo(() => byCategory.map(x => ({ name: x.category, value: x.amount })), [byCategory]);

  // ===== 出力 =====
  const exportExcel = async () => {
    const XLSX = await ensureXLSX();
    const wb = XLSX.utils.book_new();

    const detail = classifiedRows.map(r => ({
      日付: fmtDate(r.date),
      年月: r.ym,
      種別: r.raw["種別"] || r.raw["種別（ショッピング、キャッシング、その他）"] || "",
      ご利用場所: r.merchant,
      ご利用内容: r.detail,
      金額: r.amount,
      支払区分: r.raw["支払区分"] || r.raw["お支払回数"] || "",
      お支払開始月: r.raw["お支払開始月"] || "",
      カテゴリ: r.category,
    }));
    const ws1 = XLSX.utils.json_to_sheet(detail);
    XLSX.utils.book_append_sheet(wb, ws1, "明細_カテゴリ付");

    const m = {};
    for (const r of classifiedRows) {
      m[r.ym] = (m[r.ym] || { 件数: 0, 支出合計: 0 });
      m[r.ym].件数++;
      m[r.ym].支出合計 += r.amount;
    }
    const monthly = Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, v]) => ({ 年月: ym, 件数: v.件数, 支出合計: Math.round(v.支出合計) }));
    const ws2 = XLSX.utils.json_to_sheet(monthly);
    XLSX.utils.book_append_sheet(wb, ws2, "月次サマリ");

    const months = Array.from(new Set(classifiedRows.map(r => r.ym))).sort();
    const cats = Array.from(new Set(classifiedRows.map(r => r.category)));
    const matrix = months.map(mm => { const row = { 年月: mm }; for (const c of cats) row[c] = 0; return row; });
    const idx = new Map(months.map((m, i) => [m, i]));
    for (const r of classifiedRows) { const i = idx.get(r.ym); matrix[i][r.category] += r.amount; }
    const ws3 = XLSX.utils.json_to_sheet(
      matrix.map(row => { const out = { ...row }; for (const c of cats) out[c] = Math.round(out[c] || 0); return out; })
    );
    XLSX.utils.book_append_sheet(wb, ws3, "カテゴリ別(月次)");

    XLSX.writeFile(wb, `家計簿_月次_カテゴリ付_${yyyymmdd()}.xlsx`);
  };

  const addRuleFromKey = (key, category) => {
    if (!key || !category) return;
    setRules(prev => [...prev, { pattern: key, category, type: "contains" }]);
  };

  const importRulesJSON = async (file) => {
    try {
      setError("");
      if (!file || !(file instanceof Blob)) { setError("JSONファイルが選択されていません（Blob/Fileではありません）。"); return; }
      const text = await readFileAsText(file);
      const obj = JSON.parse(text);
      if (Array.isArray(obj)) setRules(obj);
    } catch (e) { console.error(e); setError("JSONの読み込みに失敗しました：" + (e?.message || "")); }
  };

  const importReclassTxt = async (file) => {
    try {
      setError("");
      if (!file || !(file instanceof Blob)) { setError("テキストファイルが選択されていません（Blob/Fileではありません）。"); return; }
      const text = await readFileAsText(file, "utf-8");
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const list = [];
      for (const ln of lines) {
        if (!ln.includes("→")) continue;
        const [left, right] = ln.split("→");
        const key = left.split(",")[0].trim();
        const cat = right.trim();
        if (key && cat) list.push({ pattern: key, category: normalizeCategory(cat), type: "contains" });
      }
      if (list.length) setRules(prev => [...prev, ...list]);
    } catch (e) { console.error(e); setError("再分類TXTの読み込みに失敗しました：" + (e?.message || "")); }
  };

  const exportClassifiedCSV = async () => {
    const Papa = await ensurePapa();
    const header = ["日付", "年月", "ご利用場所", "ご利用内容", "金額", "カテゴリ"];
    const data = classifiedRows.map(r => [fmtDate(r.date), r.ym, r.merchant, r.detail, r.amount, r.category]);
    const csv = Papa.unparse({ fields: header, data });
    downloadText(csv, `明細_カテゴリ付_${yyyymmdd()}.csv`, "text/csv;charset=utf-8");
  };

  const COLORS = ["#4f46e5","#22c55e","#ef4444","#f59e0b","#06b6d4","#a855f7","#10b981",
                  "#e11d48","#0ea5e9","#84cc16","#f97316","#14b8a6","#eab308","#3b82f6","#8b5cf6"];

  // ====== デモ & テスト ======
  const runDemoCSV = async () => {
    const demo = `"年月日","ご利用場所","ご利用内容","ご利用金額","支払区分"\n` +
                 `"2025年7月5日","スターバックス","コーヒー","580","1回"\n` +
                 `"2025年7月7日","セブン-イレブン","おにぎり","320","1回"\n` +
                 `"2025年7月10日","東京ガス","7月分","6500","1回"`;
    const blob = new Blob([demo], { type: "text/csv" });
    await handleCSV(blob);
  };
  const runDemoCSVMultiple = async () => {
    const csv1 = `"年月日","ご利用場所","ご利用内容","ご利用金額","支払区分"\n` +
                 `"2025年6月28日","セブン-イレブン","パン","220","1回"\n` +
                 `"2025年6月30日","東京ガス","6月分","6400","1回"`;
    const csv2 = `"年月日","ご利用場所","ご利用内容","ご利用金額","支払区分"\n` +
                 `"2025年7月1日","セブン-イレブン","パン","220","1回"\n` +
                 `"2025年7月10日","東京ガス","7月分","6500","1回"`;
    await handleCSVs([new Blob([csv1], { type: "text/csv" }), new Blob([csv2], { type: "text/csv" })]);
  };
  const runErrorTest = async () => { await handleCSV(undefined); };

  // ===== D&D ハンドラ =====
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) { setError("ドロップされたファイルがありません"); return; }
    handleCSVs(files);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">家計簿カテゴリ管理ミニアプリ</h1>
          <div className="text-sm text-gray-500">CSV → 分類 → 可視化 → Excel出力（ローカルで完結）</div>
        </header>

        {/* アップロード */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">1. エポスCSVをアップロード（複数対応）</h2>
          <p className="text-sm text-gray-600 mb-3">
            CSVの先頭に「月別ご利用明細…」などのタイトル行が入っていても<strong>自動でスキップ</strong>します（SJIS/UTF-8対応）。
          </p>

          <div
            onDragOver={onDragOver} onDragEnter={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-6 mb-3 transition ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
          >
            <div className="text-center text-sm text-gray-600">
              ここに <b>CSVファイル（複数可）</b> をドラッグ＆ドロップ<br/>または下のボタンから選択
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="file" accept=".csv" multiple
              onChange={(e) => {
                const files = e?.target?.files;
                if (files && files.length > 0) handleCSVs(files);
                else setError("ファイルが選択されませんでした");
                if (e?.target) e.target.value = "";
              }}
            />
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => { setRows([]); setMessage(""); setError(""); }}>
              リセット
            </button>
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={runDemoCSV}>テスト: デモCSV読込</button>
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={runDemoCSVMultiple}>テスト: 複数CSV読込</button>
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={runErrorTest}>テスト: エラーハンドリング</button>
            {loading && <span className="text-indigo-600 text-sm">読み込み中…</span>}
            {!!message && <span className="text-sm text-gray-700">{message}</span>}
            {!!error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </section>

        {/* ルール管理 */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">2. 分類ルール（上から順に評価）</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            <label className="text-sm">JSONインポート <input type="file" accept="application/json" onChange={e => { const f = e?.target?.files?.[0]; if (f) importRulesJSON(f); }} /></label>
            <label className="text-sm">再分類*.txt 追加 <input type="file" accept=".txt" onChange={e => { const f = e?.target?.files?.[0]; if (f) importReclassTxt(f); }} /></label>
            <button className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadText(JSON.stringify(rules, null, 2), `rules_${yyyymmdd()}.json`, 'application/json')}>
              ルールを書き出す
            </button>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">パターン（文字列 or 正規表現）</th>
                  <th className="p-2 text-left">カテゴリ</th>
                  <th className="p-2 text-left">種別</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2"><input className="w-full border rounded px-2 py-1" value={r.pattern} onChange={e => updateRule(idx, { pattern: e.target.value })} /></td>
                    <td className="p-2">
                      <select className="border rounded px-2 py-1" value={r.category} onChange={e => updateRule(idx, { category: e.target.value })}>
                        {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="border rounded px-2 py-1" value={r.type || "regex"} onChange={e => updateRule(idx, { type: e.target.value })}>
                        <option value="regex">正規表現</option>
                        <option value="contains">部分一致</option>
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <button className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200" onClick={() => removeRule(idx)}>削除</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="p-2" colSpan={4}>
                    <button className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                      onClick={() => setRules(prev => [...prev, { pattern: "", category: "その他", type: "contains" }])}>
                      ＋ ルールを追加
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 可視化 */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">3. 可視化（月選択）</h2>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">表示月：</label>
            <select className="border rounded px-2 py-1" value={selectedYM} onChange={e => setSelectedYM(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m === "ALL" ? "満1年（全期間）" : m}</option>)}
            </select>
            <div className="text-sm text-gray-500">件数：{filtered.length}件</div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-80 border rounded-lg p-2">
              <div className="font-medium mb-2">月別 総支出</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySum}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ym" /><YAxis /><Tooltip />
                  <Bar dataKey="amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-80 border rounded-lg p-2">
              <div className="font-medium mb-2">カテゴリ構成比（{selectedYM === "ALL" ? "全期間" : selectedYM}）</div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110}>
                    {pieData.map((e, i) => (<Cell key={`slice-${i}`} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString()} 円`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* その他ランキング＋ワンクリック登録 */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-3">4. 「その他」を減らす（上位20件）</h2>
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">店舗/内容</th>
                  <th className="p-2 text-right">支出合計</th>
                  <th className="p-2 text-left">カテゴリに登録</th>
                </tr>
              </thead>
              <tbody>
                {otherTop.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{row.key}</td>
                    <td className="p-2 text-right">{row.amount.toLocaleString()} 円</td>
                    <td className="p-2">
                      <select className="border rounded px-2 py-1 mr-2" id={`sel-${i}`} defaultValue="食費">
                        {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                        onClick={() => {
                          const sel = document.getElementById(`sel-${i}`);
                          const cat = sel ? sel.value : "その他";
                          addRuleFromKey(row.key, cat);
                        }}
                      >
                        ルール追加
                      </button>
                    </td>
                  </tr>
                ))}
                {otherTop.length === 0 && (
                  <tr><td className="p-3 text-gray-500" colSpan={3}>その他はありません</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* エクスポート */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">5. 出力</h2>
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={exportExcel}>
              Excel（明細/サマリ/ピボット）を書き出す
            </button>
            <button className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900" onClick={exportClassifiedCSV}>
              CSV（分類済み明細）を書き出す
            </button>
          </div>
        </section>

        {/* サンプル保存 */}
        <section className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">6. サンプルデータを保存（ローカルにダウンロード）</h2>
          <p className="text-sm text-gray-600 mb-3">ファイルが見つからない場合は、ここからサンプルを保存して投入してください。</p>
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadBase64(SAMPLE_CSV_JUNE_SJIS_BASE64, 'エポス_サンプル_2025-06_SJIS.csv', 'text/csv;charset=shift_jis')}>
              CSV: 2025-06（Shift_JIS）を保存
            </button>
            <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadText(SAMPLE_CSV_JULY_UTF8, 'エポス_サンプル_2025-07_UTF8.csv', 'text/csv;charset=utf-8')}>
              CSV: 2025-07（UTF-8）を保存
            </button>
            <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadText(SAMPLE_CSV_DUP_UTF8, 'エポス_サンプル_重複テスト_UTF8.csv', 'text/csv;charset=utf-8')}>
              CSV: 重複テスト（UTF-8）を保存
            </button>
            <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadText(SAMPLE_CSV_ALT_UTF8, 'エポス_サンプル_列ゆらぎ_UTF8.csv', 'text/csv;charset=utf-8')}>
              CSV: 列名ゆらぎ（UTF-8）を保存
            </button>
            <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => downloadText(SAMPLE_RECLASS_TXT, '再分類_サンプル.txt', 'text/plain;charset=utf-8')}>
              TXT: 再分類サンプルを保存
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  // ==== 内部関数群 ====
  function updateRule(idx, patch) { setRules(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r)); }
  function removeRule(idx) { setRules(prev => prev.filter((_, i) => i !== idx)); }
}

// エポス列のマッピング
function mapEposRow(r, cols) {
  const c = (namePart) => cols.find(h => String(h).includes(namePart));
  const cOr = (...parts) => cols.find(h => parts.some(p => String(h).includes(p)));
  const colDate = c("年月日");
  const colPlace = cOr("ご利用場所", "ご利用先", "利用先");
  const colDetail = c("ご利用内容");
  const colAmount = cOr("ご利用金額", "金額");
  const colPay = cOr("支払区分", "お支払回数");
  const date = parseJpDateToISO(r[colDate]);
  const amount = toNumberAmount(r[colAmount]);
  return {
    date,
    ym: ym(date),
    merchant: (r[colPlace] ?? "").toString(),
    detail: (r[colDetail] ?? "").toString(),
    amount,
    pay: (r[colPay] ?? "").toString(),
    raw: r,
    category: "その他"
  };
}

function fmtDate(d) { if (!d) return ""; const y = d.getFullYear(); const m = d.getMonth() + 1; const da = d.getDate(); return `${y}-${String(m).padStart(2, "0")}-${String(da).padStart(2, "0")}`; }
function yyyymmdd() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; }

async function readFileAsText(file, encoding) {
  return new Promise((resolve, reject) => {
    try {
      if (!file || !(file instanceof Blob)) { reject(new TypeError("parameter 1 is not of type 'Blob'")); return; }
      const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = (e) => reject(e);
      if (encoding) fr.readAsText(file, encoding); else fr.readAsText(file);
    } catch (e) { reject(e); }
  });
}

// 文字コードを自動判別（UTF-8 / Shift_JIS / UTF-16LE）
async function readFileSmart(file) {
  const ab = await file.arrayBuffer();
  const dec = (enc) => new TextDecoder(enc, { fatal: false }).decode(ab);

  const candidates = [
    { enc: "utf-8",     text: dec("utf-8") },
    { enc: "shift_jis", text: dec("shift_jis") },
    { enc: "utf-16le",  text: dec("utf-16le") },
  ];

  const headerOk = (t) => {
    const s = t.slice(0, 4000);
    return /年月日/.test(s) &&
           /(ご利用場所|ご利用先|利用先)/.test(s) &&
           /(ご利用金額|金額)/.test(s);
  };

  const pick = candidates.find(c => headerOk(c.text)) || candidates[0];
  let text = pick.text;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM除去
  return text;
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function downloadBase64(base64, filename, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function normalizeCategory(cat) {
  const m = {
    "光熱": "住居・光熱", "光熱費": "住居・光熱", "住居": "住居・光熱", "住居費": "住居・光熱",
    "娯楽": "趣味・娯楽・サブスク", "趣味": "趣味・娯楽・サブスク",
    "交通": "交通・移動", "交通費": "交通・移動",
    "教育": "教養・教育", "教育費": "教養・教育",
    "外食": "外食費", "外食費": "外食費",
    "食費": "食費",
    "美容": "衣服・美容", "衣服": "衣服・美容",
    "消耗品": "日用品・消耗品",
    "通信費": "通信",
  };
  return m[cat] || cat;
}
