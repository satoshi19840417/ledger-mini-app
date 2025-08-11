// === App.jsx (Part 1/3): Imports, utilities, constants, state ===
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';
import { useSession } from './useSession';
import './App.css';
import AccordionSection from './AccordionSection';
import FullScreenModal from './FullScreenModal';
import { CATEGORIES } from './categories';
const Charts = lazy(() => import('./Charts'));
const OthersTable = lazy(() => import('./OthersTable'));


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

function normalizeCategory(raw) {
  const s = (raw ?? '').toString().trim();
  return CATEGORIES.includes(s) ? s : 'その他';
}

/** 表示カテゴリ候補 */
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


/** ルール適用（先勝ち） */
function applyRules(items, rules) {
  return items.map(t => {
    const baseCat = normalizeCategory(t.category);
    let assignedCat = baseCat;
    let assignedKind = t.kind;
    for (const r of rules) {
      const hay = (r.target === 'memo' ? (t.memo || '') : baseCat);
      let ok = false;
      if (r.mode === 'contains') ok = hay.includes(r.pattern);
      else { try { ok = new RegExp(r.pattern).test(hay); } catch { ok = false; } }
      if (ok) { assignedCat = r.category; assignedKind = r.kind; break; }
    }
    return { ...t, assignedCat: normalizeCategory(assignedCat), assignedKind };
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

  // 「その他」フィルタ（URL クエリから初期値を取得）
  const initialQuery = useMemo(() => new URLSearchParams(window.location.search), []);
  const [othersCats, setOthersCats] = useState(() => {
    const cats = initialQuery.get('cats');
    return cats ? cats.split(',').filter(Boolean) : [];
    });
  const [othersKeywordInput, setOthersKeywordInput] = useState(() => initialQuery.get('q') || '');
  const [othersKeyword, setOthersKeyword] = useState(() => initialQuery.get('q') || '');

  // キーワード入力は 300ms デバウンス
  useEffect(() => {
    const id = setTimeout(() => setOthersKeyword(othersKeywordInput), 300);
    return () => clearTimeout(id);
  }, [othersKeywordInput]);

  // フィルタ状態を URL クエリに保持
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (othersKeyword) params.set('q', othersKeyword); else params.delete('q');
    if (othersCats.length) params.set('cats', othersCats.join(',')); else params.delete('cats');
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? '?' + qs : ''}`;
    window.history.replaceState(null, '', url);
  }, [othersKeyword, othersCats]);

  // mobile detection & modal state
  const [isMobile, setIsMobile] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesText, setRulesText] = useState('');
  const [rulesTextOpen, setRulesTextOpen] = useState(false);
  const [rulesTextMode, setRulesTextMode] = useState('export'); // 'export' | 'import'
  const fileInputRef = useRef(null);

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
        const byCat = groupBy(onlyExpense, t => normalizeCategory(t.assignedCat));
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
          const cat = (t.category || '(空)');
          const catOk = othersCats.length === 0 ? true : othersCats.includes(cat);
          const kwOk = othersKeyword
            ? ((t.memo || '').includes(othersKeyword) || (t.store || '').includes(othersKeyword))
            : true;
          return catOk && kwOk;
        });
        const byMemo = groupBy(filtered, t => (t.memo || '').trim() || '(メモなし)');
        const rows = Array.from(byMemo.entries()).map(([name, v]) => ({
          name,
          total: sumBy(v.filter(x => x.assignedKind === 'expense'), x => x.amount)
        }));
        return rows.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 20);
      }, [othersBase, othersCats, othersKeyword]);

      /** 取り込みカテゴリの候補（othersBase を元に生成） */
      const othersCatOptions = useMemo(() => {
        const set = new Set(othersBase.map(t => (t.category?.trim() || '(空)')));
        return Array.from(set).sort();
      }, [othersBase]);
    
      /** ====== ルール JSON / テキスト 入出力 ====== */
      async function exportRules() {
        const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'rules.json'; a.click(); URL.revokeObjectURL(url);
      }
      async function exportRulesAsText() {
        const text = rules.map(r => [r.pattern, r.target, r.kind, r.category].join('\t')).join('\n');
        setRulesTextMode('export');
        setRulesText(text);
        const copy = window.confirm('クリップボードにコピーしますか?\nキャンセルするとファイルとして保存します');
        if (copy) {
          try {
            await navigator.clipboard.writeText(text);
            alert('テキスト形式のルールをクリップボードにコピーしました');
          } catch (err) {
            setRulesTextOpen(true);
          }
        } else {
          try {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rules.txt';
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            setRulesTextOpen(true);
          }
        }
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
          alert('JSONの読み込みに失敗しました: ' + err.message + '（テキスト形式も利用できます）');
        }
        e.target.value = '';
      }
      async function importRulesFromText(text) {
        try {
          const rows = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
              const [pattern = '', target = 'memo', kind = 'expense', category = ''] = line.split('\t');
              return {
                user_id: session.user.id,
                pattern: String(pattern),
                target: (target === 'category' ? 'category' : 'memo'),
                kind: (kind === 'income' ? 'income' : 'expense'),
                category: String(category),
              };
            })
            .filter(r => r.pattern && r.category);
          if (!rows.length) return alert('取り込むルールがありません');
          const { error } = await supabase.from('rules').insert(rows);
          if (error) alert(error.message); else await fetchLatest();
        } catch (err) {
          alert('テキストの読み込みに失敗しました: ' + err.message + '（JSON形式も利用できます）');
        }
      }
    
      // === Part 2 ここまで ===
      // この直後に Part 3（UI の描画：JSX と最小 CSS）を続けて貼り付けてください。
        /** ====== 未ログイン画面 ====== */
  if (!session) {
    return (
      <>
        <header className="app-bar">
          <span className="app-bar-title">家計簿カテゴリ管理ミニアプリ</span>
        </header>
        <div className="container app-content">
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
      </>
    );
  }

  /** ====== ログイン後 UI ====== */
  return (
    <>
      <header className="app-bar">
        <span className="app-bar-title">家計簿カテゴリ管理ミニアプリ</span>
        <div className="app-bar-actions">
          <button className="menu-btn" onClick={() => setMenuOpen(v => !v)}>⋮</button>
          <button
            onClick={fetchLatest}
            disabled={loading}
            title="最新データを取得して再分類します"
            style={{
              marginLeft: 8,
              padding: '6px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,.06)'
            }}
            aria-label="再計算"
          >
            {loading ? '再計算中…' : '再計算'}
          </button>
          {menuOpen && (
            <div className="overflow-menu">
              <button onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}>Upload CSV</button>
              <button onClick={() => { fetchLatest(); setMenuOpen(false); }}>Recalculate</button>
              <button onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}>Logout</button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={onCsv}
            style={{ display: 'none' }}
          />
        </div>
      </header>
      <div className="container app-content">
        <div style={{ marginBottom: 8 }}>
          <strong>{session.user.email}</strong>
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
          <button onClick={exportRules}>ルールを書き出す（JSON）</button>
          <button onClick={exportRulesAsText}>ルールを書き出す（テキスト）</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            JSONインポート（ファイル） <input type="file" accept="application/json" onChange={importRules} />
          </label>
          <button onClick={() => { setRulesTextMode('import'); setRulesText(''); setRulesTextOpen(true); }}>テキストインポート（貼り付け）</button>
          <button onClick={fetchLatest}>再分類・再計算</button>
        </div>
        <FullScreenModal
          open={rulesTextOpen}
          onClose={() => setRulesTextOpen(false)}
          title={rulesTextMode === 'export' ? 'ルール（テキスト）' : 'ルールのテキストインポート'}
          primaryAction={
            rulesTextMode === 'import'
              ? <button onClick={async () => { await importRulesFromText(rulesText); setRulesTextOpen(false); }}>インポート</button>
              : <button onClick={() => setRulesTextOpen(false)}>閉じる</button>
          }
          secondaryAction={rulesTextMode === 'import' ? <button onClick={() => setRulesTextOpen(false)}>キャンセル</button> : null}
        >
          <textarea
            value={rulesText}
            onChange={e => setRulesText(e.target.value)}
            style={{ width: '100%', height: '100%' }}
          />
        </FullScreenModal>
      </AccordionSection>

      {/* 3. 可視化 */}
      <AccordionSection title="3. 可視化">
        <PeriodSelector value={period} onChange={setPeriod} />

        <Suspense fallback={<ChartSkeleton />}>
          <Charts monthly={monthly} categoryPieLimited={categoryPieLimited} />
        </Suspense>
      </AccordionSection>

      {/* 4. その他削減 */}
      <AccordionSection
        title="4.「その他」を減らす（上位20件）"
        defaultOpen={othersTop.length > 0}
        key={`others-${othersTop.length > 0 ? 'has' : 'none'}`}
      >
        {/* セクション常設の再計算ボタン */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginBottom: 8,
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1,
            paddingTop: 4
          }}
        >
          <button
            onClick={fetchLatest}
            disabled={loading}
            title="最新データを取得して再分類します"
            style={{
              padding: '6px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,.06)'
            }}
            aria-label="再計算"
          >
            {loading ? '再計算中…' : '再計算'}
          </button>
        </div>
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
                      setOthersCats([]);
                      setOthersKeywordInput('');
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
                    multiple
                    value={othersCats}
                    onChange={e => setOthersCats(Array.from(e.target.selectedOptions, o => o.value))}
                    style={{ width: '100%' }}
                    size={Math.min(Math.max(othersCatOptions.length, 1), 8)}
                  >
                    {othersCatOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  キーワード：
                  <input
                    value={othersKeywordInput}
                    onChange={e => setOthersKeywordInput(e.target.value)}
                    placeholder="メモに含む文字列"
                    style={{ width: '100%' }}
                  />
                </label>
                <button onClick={() => { setOthersKeywordInput(''); setOthersKeyword(''); setOthersCats([]); }}>
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
                setOthersCats([]);
                setOthersKeywordInput('');
                setOthersKeyword('');
              }}
              style={{ minWidth: 220, padding: '4px 6px' }}
            >
              <option value="unassigned">未分類/「その他」に分類された明細</option>
              <option value="small">少額カテゴリ（円グラフの「その他(少額)」）</option>
            </select>

            <span>取り込みカテゴリ：</span>
            <select
              multiple
              value={othersCats}
              onChange={e => setOthersCats(Array.from(e.target.selectedOptions, o => o.value))}
              style={{ minWidth: 160, padding: '4px 6px' }}
              size={Math.min(Math.max(othersCatOptions.length, 1), 8)}
            >
              {othersCatOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span>キーワード：</span>
            <input
              value={othersKeywordInput}
              onChange={e => setOthersKeywordInput(e.target.value)}
              placeholder="メモに含む文字列"
              style={{ minWidth: 220, padding: '4px 6px' }}
            />

            <button onClick={() => { setOthersKeywordInput(''); setOthersKeyword(''); setOthersCats([]); }}>
              リセット
            </button>
          </div>
        )}

        <Suspense fallback={<TableSkeleton rows={othersTop.length} />}>
          <OthersTable
            rows={othersTop}
            addRule={addRule}
            isMobile={isMobile}
          />
        </Suspense>
      </AccordionSection>
    </div>
    {isMobile && (
      <button
        className="recalc-fixed"
        onClick={fetchLatest}
        disabled={loading}
        aria-label="再計算"
      >
        {loading ? '再計算中…' : '再計算'}
      </button>
    )}
  </>
  );
} // <= App 閉じ

/** ====== 小さな部品 ====== */

function PeriodSelector({ value, onChange }) {
  const options = [
    { key: '3m', label: '直近3ヶ月' },
    { key: '6m', label: '6ヶ月' },
    { key: '1y', label: '1年' },
    { key: 'all', label: '全期間' }
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


function ChartSkeleton() {
  return (
    <div className="grid2" style={{ height: 360 }}>
      <div style={{ background: '#f3f4f6', borderRadius: 4 }} />
      <div style={{ background: '#f3f4f6', borderRadius: 4 }} />
    </div>
  );
}

function TableSkeleton({ rows }) {
  const count = Math.max(rows, 3);
  return (
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
        {Array.from({ length: count }).map((_, idx) => (
          <tr key={idx}>
            <td colSpan={4} style={{ padding: 16 }}>
              <div style={{ background: '#f3f4f6', height: 16, borderRadius: 4 }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
