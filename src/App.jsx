import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';
import { useSession } from './useSession';

function makeHash(t) {
  return btoa([t.occurred_on, t.category || '', t.memo || '', t.amount, t.kind].join('|'));
}
function normalizeRow(r, userId) {
  const occurred_on = (r.date || r.occurred_on || r['日付'] || '').trim();
  const category    = (r.category || r['カテゴリ'] || r['分類'] || '').trim();
  const memo        = (r.memo || r['メモ'] || r['摘要'] || '').trim();
  const amount      = Number(String(r.amount ?? r['金額'] ?? '').replace(/[, ]/g, ''));
  let kind = (r.kind || r.type || r['種別'] || '').toString().toLowerCase();
  if (!kind) kind = amount >= 0 ? 'income' : 'expense';
  if (kind.startsWith('収')) kind = 'income';
  if (kind.startsWith('支') || kind.startsWith('出') || kind === '-') kind = 'expense';
  const t = { occurred_on, category, memo, amount: Math.abs(amount), kind, user_id: userId };
  return { ...t, hash: makeHash(t) };
}

export default function App() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!session) return;
    supabase.from('transactions').select('*').order('occurred_on', { ascending: false })
      .then(({ data, error }) => { if (error) alert(error.message); else setItems(data || []); });
  }, [session]);

  async function login(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 本番で試すときもここで自動で正しいURLに戻ります
        emailRedirectTo: import.meta.env.DEV
          ? 'http://localhost:5173'
          : 'https://ledger-mini-app.netlify.app'
      }
    });
    if (error) alert(error.message);
    else alert('メールのログインリンクを送信しました。メールを開いて戻ってください。');
  }

  async function onCsv(e) {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    const rows = await new Promise((resolve, reject) =>
      Papa.parse(file, { header: true, skipEmptyLines: true,
        complete: (res) => resolve(res.data), error: reject })
    );
    const payload = rows.map(r => normalizeRow(r, session.user.id)).filter(t => t.occurred_on);
    const { error } = await supabase.from('transactions')
      .upsert(payload, { onConflict: 'user_id,hash' });
    if (error) return alert(error.message);

    const { data } = await supabase.from('transactions')
      .select('*').order('occurred_on', { ascending: false });
    setItems(data || []);
    alert('取り込み＆同期しました。');
    e.target.value = '';
  }

  if (!session) {
    return (
      <div style={{ padding: 24 }}>
        <h2>ログイン</h2>
        <form onSubmit={login}>
          <input type="email" placeholder="メールアドレス"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <button type="submit">ログインリンク送信</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div><strong>{session.user.email}</strong></div>
      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".csv" onChange={onCsv} />
      </div>
      <ul style={{ marginTop: 16 }}>
        {items.map(t => (
          <li key={t.id}>
            {t.occurred_on} / {t.category || '-'} / {t.memo || '-'} / {t.amount} / {t.kind}
          </li>
        ))}
      </ul>
    </div>
  );
}
