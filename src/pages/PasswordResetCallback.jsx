import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PasswordResetCallback() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!supabase) {
      setError('Supabase接続が利用できません。');
      setReady(true);
      return;
    }
    if (!code) {
      setError('コードが見つかりません。');
      setReady(true);
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError(error.message);
      setReady(true);
    });
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase接続が利用できません。');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('パスワードを更新しました。');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <p>読み込み中...</p>;
  }

  return (
    <section className='card' style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2>新しいパスワードを設定</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label>
          パスワード
          <input
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
        <button type='submit' disabled={loading}>
          更新
        </button>
      </form>
    </section>
  );
}
