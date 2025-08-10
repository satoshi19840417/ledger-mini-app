// === App.jsx (Part 1/3): Imports, utilities, constants, state ===
import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';
import { useSession } from './useSession';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Legend, Cell
} from 'recharts';
import './App.css';
import AccordionSection from './AccordionSection';
import FullScreenModal from './FullScreenModal';

/** ========= 基本ユーティリティ ========= */

function makeHash(t) {
  const s = [t.occurred_on, t.category || '', t.memo || '', t.amount, t.kind].join('|');
  const bytes = new TextEncoder().encode(s);
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function normalizeDate(s) {
  if (!s) return '';
  const m = String(s).trim().match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!m) return '';
  const y = m[1], mo = String(Number(m[2])).padStart(2, '0'), d = String(Number(m[3])).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function parseAmountLike(s) {
  if (s === undefined || s === null || s === '') return NaN;
  let v = String(s).replace(/[¥￥,\s]/g, '');
  const neg = /^\(.*\)$/.test(v);
  v = v.replace(/[()]/g, '');
  const n = Number(v);
  return neg ? -n : n;
}

async function readAsText(file, encoding) {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsText(file, encoding);
  });
}

/** タイトル行スキップ + UTF-8→ダメならSJIS再トライ */
async function parseCsvSmart(file) {
  const encodings = ['utf-8', 'shift_jis'];
  const headerPattern = /ご利用年月日|取引日|利用日|日付|date|occurred_on/i;
  for (const enc of encodings) {
    const text = await readAsText(file, enc);
    const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const idx = lines.findIndex(line => headerPattern.test(line));
    if (idx >= 0) {
      const body = lines.slice(idx).join('\n');
      const rows = await new Promise((resolve, reject) => {
        Papa.parse(body, {
          header: true, skipEmptyLines: true,
          transformHeader: (h) => h.replace(/\uFEFF/g, '').trim(),
          complete: (res) => resolve(res.data), error: reject
        });
      });
      if (rows && rows.length) return rows;
    }
  }
  return [];
}

/** 'income' / 'expense' へ正規化 */
function toKind(raw, amount) {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (s === 'income' || s === 'expense') return s;
  if (/(収|入|入金|振込|返金|キャンセル|払い戻)/.test(s)) return 'income';
  if (/(支|出|出金|支払|請求|引落|ショッピング|キャッシング|購入|借入)/.test(s)) return 'expense';
  if (typeof amount === 'number') return amount >= 0 ? 'income' : 'expense';
  return 'expense';
}

/** CSV → DB形式（エポス列名含む） */
function normalizeRow(r, userId) {
  const v = (k) => (r[k] ?? '').toString().replace(/\uFEFF/g, '').trim();

  const dateKeys = ['ご利用年月日','日付','利用日','取引日','occurred_on','date'];
  let occurred_on = '';
  for (const k of dateKeys) { occurred_on = normalizeDate(v(k)); if (occurred_on) break; }
  if (!occurred_on) return null;

  const category = (['ご利用場所','category','カテゴリ','分類','費目','科目'].map(v).find(Boolean) || '');
  const memo     = (['ご利用内容','memo','メモ','摘要','内容','明細','備考'].map(v).find(Boolean) || '');

  let amount = NaN;
  const singleAmountKeys = [
    'ご利用金額（キャッシングでは元金になります）','ご利用金額','金額','amount','利用金額','支払金額','ご利用金額'
  ];
  for (const k of singleAmountKeys) { amount = parseAmountLike(v(k)); if (!Number.isNaN(amount)) break; }
  if (Number.isNaN(amount)) {
    let inc = NaN, exp = NaN;
    for (const k of ['入金額','入金','収入'])  { inc = parseAmountLike(v(k));  if (!Number.isNaN(inc)) break; }
    for (const k of ['出金額','出金','支出','ご請求金額']) { exp = parseAmountLike(v(k)); if (!Number.isNaN(exp)) break; }
    if (!Number.isNaN(inc) || !Number.isNaN(exp)) amount = (inc || 0) - (exp || 0);
  }
  if (Number.isNaN(amount)) amount = 0;

  const kind = toKind(
    v('種別（ショッピング、キャッシング、その他）') || v('種別') || v('区分') || v('入出金'),
    amount
  );

  const t = { occurred_on, category, memo, amount: Math.abs(Math.trunc(amount)), kind, user_id: userId };
  return { ...t, hash: makeHash(t) };
}

/** 表示カテゴリ候補 */
const CATEGORIES = [
  '食費','住居・光熱','日用品・消耗品','通信','交通・移動','医療・健康','衣服・美容',
  '趣味・娯楽','旅行・レジャー','教育・書籍','交際費','ビジネス','税金・保険','その他','収入'
];

/** カテゴリ固定色（円グラフ） */
const CATEGORY_COLORS = {
  '食費': '#f87171',
  '住居・光熱': '#fbbf24',
  '日用品・消耗品': '#34d399',
  '通信': '#60a5fa',
  '交通・移動': '#a78bfa',
  '医療・健康': '#f472b6',
  '衣服・美容': '#fb923c',
  '趣味・娯楽': '#38bdf8',
  '旅行・レジャー': '#4ade80',
  '教育・書籍': '#facc15',
  '交際費': '#c084fc',
  'ビジネス': '#f59e0b',
  '税金・保険': '#ef4444',
  'その他': '#9ca3af',
  '収入': '#10b981',
  'その他(少額)': '#9ca3af'
};

function getCategoryColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  if (!name) return '#ccc';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 60%)`;
}

/** 棒グラフの色リスト（ローテーション） */
const BAR_COLORS = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#fb923c',
];

/** 長い系列名を省略しつつホバーで全体を見せる凡例 */
function ScrollableLegend({ payload }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        maxHeight: isMobile ? 72 : undefined,
        overflowY: isMobile ? 'auto' : undefined,
      }}
    >
      {payload?.map((entry) => {
        const label = entry.value || '';
        const truncated = label.length > 8 ? `${label.slice(0, 8)}…` : label;
        return (
          <li
            key={label}
            title={label}
            style={{ marginRight: 12, display: 'flex', alignItems: 'center' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                backgroundColor: entry.color,
                marginRight: 4,
              }}
            />
            <span>{truncated}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** ルール適用（先勝ち） */
function applyRules(items, rules) {
  return items.map(t => {
    let assignedCat = t.category || '';
    let assignedKind = t.kind;
    for (const r of rules) {
      const hay = (r.target === 'memo' ? (t.memo || '') : (t.category || ''));
      let ok = false;
      if (r.mode === 'contains') ok = hay.includes(r.pattern);
      else { try { ok = new RegExp(r.pattern).test(hay); } catch { ok = false; } }
      if (ok) { assignedCat = r.category; assignedKind = r.kind; break; }
    }
    return { ...t, assignedCat, assignedKind };
  });
}

/** 集計ユーティリティ */
const ym = (d) => d.slice(0, 7);
function sumBy(arr, fn) { return arr.reduce((s, x) => s + fn(x), 0); }
function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) { const k = keyFn(x); m.set(k, (m.get(k) || []).concat(x)); }
  return m;
}

/** 円グラフは上位N+その他に集約 */
const PIE_LIMIT = 10;
function limitPieData(arr, limit = PIE_LIMIT) {
  if (!arr || arr.length <= limit) return arr || [];
  const head = arr.slice(0, limit - 1);      // 上位 (limit-1)
  const rest = arr.slice(limit - 1);         // 残り → その他(少額)
  const other = rest.reduce((s, x) => s + (x.value || 0), 0);
  return [...head, { name: 'その他(少額)', value: other }];
}

/** 期間フィルタの起点日を計算 */
function cutoffFromPeriod(period) {
  if (period === 'all') return '0000-01-01';
  const now = new Date();
  const months = { '3m': 3, '6m': 6, '1y': 12 }[period] || 0;
  const cut = new Date(now.getFullYear(), now.getMonth() + 1 - months, 1);
  const y = cut.getFullYear();
  const m = String(cut.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** ========= コンポーネント開始（State 定義まで） ========= */
export default function App() {
  const session = useSession();
  const [email, setEmail] = useState('');

  // データ
  const [items, setItems] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // 表示期間
  const [period, setPeriod] = useState('all'); // '3m' | '6m' | '1y' | 'all'
  const cutoff = useMemo(() => cutoffFromPeriod(period), [period]);

  // ルール折りたたみ
  const [showAllRules, setShowAllRules] = useState(false);

  // 「その他」表示モード：未分類 or 少額カテゴリ
  // 'unassigned'（未分類/「その他」に分類） / 'small'（円グラフの「その他(少額)」＝下位カテゴリ群）
  const [othersMode, setOthersMode] = useState('unassigned');

  // 「その他」フィルタ
  const [othersSrcCat, setOthersSrcCat] = useState('すべて');
  const [othersKeyword, setOthersKeyword] = useState('');

  // mobile detection & modal state
  const [isMobile, setIsMobile] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // === Part 1 ここまで ===
  // この直後に Part 2 を続けて貼り付けてください（fetchLatest, onCsv, 集計, 可視化など）
    /** ====== DB から最新取得 ====== */
    async function fetchLatest() {
        setLoading(true);
        const [{ data: tx, error: e1 }, { data: rs, error: e2 }] = await Promise.all([
          supabase.from('transactions').select('*').order('occurred_on', { ascending: false }),
          supabase.from('rules').select('*').order('created_at', { ascending: true })
        ]);
        if (e1) alert(e1.message);
        if (e2) alert(e2.message);
        setItems(tx || []);
        setRules(rs || []);
        setLoading(false);
      }
      useEffect(() => { if (session) fetchLatest(); }, [session]);
    
      /** ====== ログイン（メールリンク） ====== */
      async function login(e) {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: import.meta.env.DEV ? 'http://localhost:5173' : 'https://ledger-mini-app.netlify.app'
          }
        });
        if (error) alert(error.message);
        else alert('ログインリンクを送信しました。メールから戻ってください。');
      }
    
      /** ====== CSV 取り込み ====== */
      async function onCsv(e) {
        const file = e.target.files?.[0];
        if (!file) return alert('ファイルが選択されていません。');
        if (!session?.user) return alert('ログインが必要です。');
    
        try {
          // 1) CSV を賢く読み取る（タイトル行スキップ, UTF-8 / SJIS）
          const rows = await parseCsvSmart(file);
    
          // 2) 行を正規化（DB 形式へ）+ 不正行は除外
          const raw = rows.map(r => normalizeRow(r, session.user.id)).filter(Boolean);
    
          // 3) 重複除去（user_id + hash）
          const map = new Map();
          for (const t of raw) {
            const key = `${t.user_id}:${t.hash}`;
            if (!map.has(key)) map.set(key, t);
          }
          const payload = Array.from(map.values());
    
          alert(`読み込み ${rows.length} 行 → 有効データ ${payload.length} 行（重複除去後）`);
          if (payload.length === 0) { e.target.value = ''; return; }
    
          // 4) 分割 upsert
          const chunkSize = 500;
          let upsertedCount = 0;
          for (let i = 0; i < payload.length; i += chunkSize) {
            const chunk = payload.slice(i, i + chunkSize);
            const { data, error } = await supabase
              .from('transactions')
              .upsert(chunk, { onConflict: 'user_id,hash' })
              .select();
            if (error) throw error;
            upsertedCount += (data?.length ?? 0);
          }
    
          alert(`登録/更新 ${upsertedCount} 行`);
          await fetchLatest();
        } catch (err) {
          alert(`DBエラー: ${err?.message || err}`);
        } finally {
          e.target.value = '';
        }
      }
    
      /** ====== ルール CRUD ====== */
      async function addRule(r) {
        const { error } = await supabase.from('rules').insert([{ ...r, user_id: session.user.id }]);
        if (error) alert(error.message); else await fetchLatest();
      }
      async function deleteRule(id) {
        const { error } = await supabase.from('rules').delete().eq('id', id);
        if (error) alert(error.message); else await fetchLatest();
      }
    
      /** ====== ルール適用 & 期間フィルタ ====== */
      const appliedAll = useMemo(() => applyRules(items, rules), [items, rules]);
      const applied = useMemo(() => appliedAll.filter(t => t.occurred_on >= cutoff), [appliedAll, cutoff]);
    
      /** ====== 可視化（棒グラフ：月別総支出） ====== */
      const monthly = useMemo(() => {
        const onlyExpense = applied.filter(t => t.assignedKind === 'expense');
        const byMonth = groupBy(onlyExpense, t => (t.occurred_on || '').slice(0, 7));
        const arr = Array.from(byMonth.entries()).map(([k, v]) => ({
          month: k,
          total: sumBy(v, x => x.amount)
        }));
        return arr.sort((a, b) => a.month.localeCompare(b.month));
      }, [applied]);
    
      /** ====== 可視化（円グラフ：カテゴリ構成） ====== */
      const categoryPie = useMemo(() => {
        const onlyExpense = applied.filter(t => t.assignedKind === 'expense');
        const byCat = groupBy(onlyExpense, t => t.assignedCat || 'その他');
        return Array.from(byCat.entries())
          .map(([k, v]) => ({ name: k, value: sumBy(v, x => x.amount) }))
          .sort((a, b) => b.value - a.value);
      }, [applied]);
    
      const categoryPieLimited = useMemo(
        () =>
          limitPieData(categoryPie, 10).map(d => ({
            ...d,
            fill: getCategoryColor(d.name),
          })),
        [categoryPie]
      );
    
      // 円グラフで「その他(少額)」に入っている“下位カテゴリ集合”
      const smallCatSet = useMemo(() => {
        const cats = categoryPie.map(d => d.name);       // 大きい順
        const small = cats.slice(10 - 1);                // 上位(10-1)以外を下位扱い
        return new Set(small);
      }, [categoryPie]);
    
      /** ====== 「その他」を減らす（表示モード切替：未分類 or 少額カテゴリ） ====== */
      const othersBase = useMemo(() => {
        if (othersMode === 'small') {
          // 円グラフの「その他(少額)」＝下位カテゴリ群
          return applied.filter(t => smallCatSet.has(t.assignedCat || 'その他'));
        }
        // 既存：未分類 or 'その他' に分類された明細
        return applied.filter(t => !t.assignedCat || t.assignedCat === 'その他');
      }, [applied, othersMode, smallCatSet]);
    
      /** フィルタ（取り込みカテゴリ・キーワード）→ メモ単位で上位20件 */
      const othersTop = useMemo(() => {
        const filtered = othersBase.filter(t => {
          const catOk = othersSrcCat === 'すべて' ? true : (t.category || '(空)') === othersSrcCat;
          const kwOk  = othersKeyword ? ((t.memo || '').includes(othersKeyword)) : true;
          return catOk && kwOk;
        });
        const byMemo = groupBy(filtered, t => (t.memo || '').trim() || '(メモなし)');
        const rows = Array.from(byMemo.entries()).map(([name, v]) => ({
          name,
          total: sumBy(v.filter(x => x.assignedKind === 'expense'), x => x.amount)
        }));
        return rows.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 20);
      }, [othersBase, othersSrcCat, othersKeyword]);
    
      /** 取り込みカテゴリの候補（othersBase を元に生成） */
      const othersSrcCatOptions = useMemo(() => {
        const set = new Set(othersBase.map(t => (t.category?.trim() || '(空)')));
        return ['すべて', ...Array.from(set).sort()];
      }, [othersBase]);
    
      /** ====== ルール JSON 入出力 ====== */
      async function exportRules() {
        const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'rules.json'; a.click(); URL.revokeObjectURL(url);
      }
      async function importRules(e) {
        const file = e.target.files?.[0]; if (!file) return;
        const text = await file.text();
        try {
          const arr = JSON.parse(text);
          if (!Array.isArray(arr)) throw new Error('JSONは配列ではありません');
          const rows = arr.map(x => ({
            user_id: session.user.id,
            pattern: String(x.pattern || ''),
            mode: (x.mode === 'regex' ? 'regex' : 'contains'),
            target: (x.target === 'category' ? 'category' : 'memo'),
            category: String(x.category || ''),
            kind: (x.kind === 'income' ? 'income' : 'expense'),
          })).filter(r => r.pattern && r.category);
          if (!rows.length) return alert('取り込むルールがありません');
          const { error } = await supabase.from('rules').insert(rows);
          if (error) alert(error.message); else await fetchLatest();
        } catch (err) {
          alert('JSONの読み込みに失敗しました: ' + err.message);
        }
        e.target.value = '';
      }
    
      // === Part 2 ここまで ===
      // この直後に Part 3（UI の描画：JSX と最小 CSS）を続けて貼り付けてください。
        /** ====== 未ログイン画面 ====== */
  if (!session) {
    return (
      <div className="container">
        <h2>ログイン</h2>
        <form onSubmit={login}>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={{ marginLeft: 8 }}>ログインリンク送信</button>
        </form>
      </div>
    );
  }

  /** ====== ログイン後 UI ====== */
  return (
    <div className="container">
      <h1>家計簿カテゴリ管理ミニアプリ</h1>
      <div style={{ marginBottom: 8 }}>
        <strong>{session.user.email}</strong>
        <button
          onClick={async () => { await supabase.auth.signOut(); }}
          style={{ marginLeft: 8 }}
        >
          ログアウト
        </button>
      </div>

      {/* 1. 取込 */}
      <AccordionSection title="1. 取込CSVをアップロード（複数対応）">
        <p className="small">
          CSVの先頭に「月別ご利用明細…」のタイトルがあっても自動スキップします（SJIS/UTF-8対応）。
        </p>
        <input type="file" accept=".csv" onChange={onCsv} />
        <div className="small" style={{ marginTop: 6 }}>
          読み込み後: 件数 {items.length}（{loading ? '更新中…' : '最新'}）
        </div>
      </AccordionSection>

      {/* 2. ルール */}
      <AccordionSection
        title="2. 分類ルール（上から順に評価）"
        defaultOpen={rules.length <= 10}
        key={`rules-${rules.length > 10 ? 'many' : 'few'}`}
      >
        <div className="rules-table-container">
          <div className="rules-grid">
            <div className="header sticky-col">パターン（文字列 or 正規表現）</div>
            <div className="header">ターゲット</div>
            <div className="header">種別</div>
            <div className="header">カテゴリ</div>
            <div className="header actions"></div>

            {(showAllRules ? rules : rules.slice(0, 10)).map(r => (
              <RuleRow key={r.id} rule={r} onDelete={() => deleteRule(r.id)} />
            ))}

            <NewRuleRow onAdd={addRule} isMobile={isMobile} />
          </div>
        </div>

        {rules.length > 10 && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowAllRules(v => !v)}>
              {showAllRules ? '閉じる' : 'もっと見る'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportRules}>ルールを書き出す</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            JSONインポート <input type="file" accept="application/json" onChange={importRules} />
          </label>
          <button onClick={fetchLatest}>再分類・再計算</button>
        </div>
      </AccordionSection>

      {/* 3. 可視化 */}
      <AccordionSection title="3. 可視化">
        <PeriodSelector value={period} onChange={setPeriod} />

        <div className="grid2" style={{ height: 360 }}>
          {/* 月別総支出（万円単位） */}
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 8, right: 16, left: 0, bottom: 28 }}>
              <XAxis
                dataKey="month"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)}
              />
              <YAxis
                tickFormatter={(v) => (v / 10000).toFixed(1)}
                label={{ value: '万円', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(v) => [`${(v / 10000).toFixed(1)} 万円`, '合計']}
                labelFormatter={(label) => label}
              />
              <Legend content={<ScrollableLegend />} />
              <Bar dataKey="total" name="合計">
                {monthly.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* カテゴリ構成比（固定色） */}
          <ResponsiveContainer>
              <PieChart>
              <Pie data={categoryPieLimited} dataKey="value" nameKey="name" label outerRadius="80%" />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ maxHeight: 300, overflowY: 'auto' }}
                payload={categoryPieLimited.map(item => ({
                  id: item.name,
                  value: item.name,
                  type: 'square',
                  color: item.fill,
                }))}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </AccordionSection>

      {/* 4. その他削減 */}
      <AccordionSection
        title="4.「その他」を減らす（上位20件）"
        defaultOpen={othersTop.length > 0}
        key={`others-${othersTop.length > 0 ? 'has' : 'none'}`}
      >
        {isMobile ? (
          <>
            <button onClick={() => setFilterOpen(true)}>フィルタ</button>
            <FullScreenModal
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              title="フィルタ"
              primaryAction={<button onClick={() => setFilterOpen(false)}>適用</button>}
              secondaryAction={<button onClick={() => setFilterOpen(false)}>キャンセル</button>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label>
                  表示対象：
                  <select
                    value={othersMode}
                    onChange={e => {
                      setOthersMode(e.target.value);
                      setOthersSrcCat('すべて');
                      setOthersKeyword('');
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="unassigned">未分類/「その他」に分類された明細</option>
                    <option value="small">少額カテゴリ（円グラフの「その他(少額)」）</option>
                  </select>
                </label>
                <label>
                  取り込みカテゴリ：
                  <select
                    value={othersSrcCat}
                    onChange={e => setOthersSrcCat(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {othersSrcCatOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  キーワード：
                  <input
                    value={othersKeyword}
                    onChange={e => setOthersKeyword(e.target.value)}
                    placeholder="メモに含む文字列"
                    style={{ width: '100%' }}
                  />
                </label>
                <button onClick={() => { setOthersKeyword(''); setOthersSrcCat('すべて'); }}>
                  リセット
                </button>
              </div>
            </FullScreenModal>
          </>
        ) : (
          <div
            className="small"
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 8,
              flexWrap: 'wrap'
            }}
          >
            <span>表示対象：</span>
            <select
              value={othersMode}
              onChange={e => {
                setOthersMode(e.target.value);
                setOthersSrcCat('すべて');
                setOthersKeyword('');
              }}
              style={{ minWidth: 220, padding: '4px 6px' }}
            >
              <option value="unassigned">未分類/「その他」に分類された明細</option>
              <option value="small">少額カテゴリ（円グラフの「その他(少額)」）</option>
            </select>

            <span>取り込みカテゴリ：</span>
            <select
              value={othersSrcCat}
              onChange={e => setOthersSrcCat(e.target.value)}
              style={{ minWidth: 160, padding: '4px 6px' }}
            >
              {othersSrcCatOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span>キーワード：</span>
            <input
              value={othersKeyword}
              onChange={e => setOthersKeyword(e.target.value)}
              placeholder="メモに含む文字列"
              style={{ minWidth: 220, padding: '4px 6px' }}
            />

            <button onClick={() => { setOthersKeyword(''); setOthersSrcCat('すべて'); }}>
              リセット
            </button>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #eee', padding: 6 }}>店舗/内容</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 140 }}>支出合計</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 260 }}>カテゴリに登録</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 100 }} />
            </tr>
          </thead>
          <tbody>
            {othersTop.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: '#666' }}>
                  該当データがありません（期間や表示対象、フィルタを見直してください）
                </td>
              </tr>
            ) : (
              othersTop.map(row => (
                <OthersRow
                  key={row.name}
                  row={row}
                  onAdd={(cat, mode) => addRule({
                    pattern: row.name,
                    mode, target: 'memo', category: cat, kind: 'expense'
                  })}
                  isMobile={isMobile}
                />
              ))
            )}
          </tbody>
        </table>
      </AccordionSection>
    </div>
  );
} // <= App 閉じ

/** ====== 小さな部品 ====== */

function PeriodSelector({ value, onChange }) {
  const options = [
    { key: '3m', label: 'Last 3 months' },
    { key: '6m', label: '6 months' },
    { key: '1y', label: '1 year' },
    { key: 'all', label: 'All' }
  ];
  return (
    <div className="period-selector">
      {options.map(opt => (
        <button
          key={opt.key}
          className={value === opt.key ? 'active' : ''}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function RuleRow({ rule, onDelete }) {
  return (
    <>
      <div className="sticky-col truncate" title={rule.pattern}>{rule.pattern}</div>
      <div>{rule.target}</div>
      <div>{rule.kind}</div>
      <div>{rule.category}</div>
      <div className="actions">
        <button className="icon-btn" onClick={onDelete} aria-label="削除">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </>
  );
}

function NewRuleRow({ onAdd, isMobile }) {
  const [pattern, setPattern] = useState('');
  const [mode, setMode] = useState('contains');
  const [target, setTarget] = useState('memo');
  const [kind, setKind] = useState('expense');
  const [cat, setCat] = useState('食費');
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!pattern.trim()) return alert('パターンを入力してください');
    onAdd({ pattern: pattern.trim(), mode, target, category: cat, kind });
    setPattern('');
    setOpen(false);
  };

  if (isMobile) {
    return (
      <>
        <div style={{ gridColumn: '1 / -1' }}>
          <button onClick={() => setOpen(true)}>ルール追加</button>
          <FullScreenModal
            open={open}
            onClose={() => setOpen(false)}
            title="ルール追加"
            primaryAction={<button onClick={submit}>追加</button>}
            secondaryAction={<button onClick={() => setOpen(false)}>キャンセル</button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="例）セブン-イレブン"
                style={{ width: '100%' }}
              />
              <div>
                <label>
                  <input
                    type="radio"
                    checked={mode === 'contains'}
                    onChange={() => setMode('contains')}
                  /> 正規表現なし
                </label>{' '}
                <label>
                  <input
                    type="radio"
                    checked={mode === 'regex'}
                    onChange={() => setMode('regex')}
                  /> 正規表現
                </label>
              </div>
              <select value={target} onChange={e => setTarget(e.target.value)}>
                <option value="memo">メモ</option>
                <option value="category">取り込みカテゴリ</option>
              </select>
              <select value={kind} onChange={e => setKind(e.target.value)}>
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </select>
              <select value={cat} onChange={e => setCat(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </FullScreenModal>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sticky-col">
        <input
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="例）セブン-イレブン"
          style={{ width: '100%' }}
        />
        <div className="small">
          <label>
            <input
              type="radio"
              checked={mode === 'contains'}
              onChange={() => setMode('contains')}
            /> 正規表現なし
          </label>{' '}
          <label>
            <input
              type="radio"
              checked={mode === 'regex'}
              onChange={() => setMode('regex')}
            /> 正規表現
          </label>
        </div>
      </div>
      <div>
        <select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="memo">メモ</option>
          <option value="category">取り込みカテゴリ</option>
        </select>
      </div>
      <div>
        <select value={kind} onChange={e => setKind(e.target.value)}>
          <option value="expense">支出</option>
          <option value="income">収入</option>
        </select>
      </div>
      <div>
        <select value={cat} onChange={e => setCat(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="actions">
        <button
          className="icon-btn"
          onClick={submit}
        >
          追加
        </button>
      </div>
    </>
  );
}

function OthersRow({ row, onAdd, isMobile }) {
  const [cat, setCat] = useState('食費');
  const [mode, setMode] = useState('contains');
  const [open, setOpen] = useState(false);

  const submit = () => {
    onAdd(cat, mode);
    setOpen(false);
  };

  return (
    <tr>
      <td className="truncate" title={row.name} style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {row.name}
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {row.total.toLocaleString()} 円
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {isMobile ? (
          <>
            <button onClick={() => setOpen(true)}>ルール追加</button>
            <FullScreenModal
              open={open}
              onClose={() => setOpen(false)}
              title="ルール追加"
              primaryAction={<button onClick={submit}>追加</button>}
              secondaryAction={<button onClick={() => setOpen(false)}>キャンセル</button>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="contains">正規表現なし</option>
                  <option value="regex">正規表現</option>
                </select>
              </div>
            </FullScreenModal>
          </>
        ) : (
          <>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ marginRight: 8 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={mode} onChange={e => setMode(e.target.value)} style={{ marginRight: 8 }}>
              <option value="contains">正規表現なし</option>
              <option value="regex">正規表現</option>
            </select>
            <button onClick={() => onAdd(cat, mode)}>ルール追加</button>
          </>
        )}
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }} />
    </tr>
  );
}

    
