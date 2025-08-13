import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PasswordResetCallback() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!password || !confirm) {
      setError('パスワードを入力してください');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== confirm) {
      setError('確認用パスワードが一致しません');
      return;
    }
    if (!supabase) {
      setError('Supabase が初期化されていません');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  };

  if (success) {
    return (
      <section>
        <h2>パスワード再設定</h2>
        <p>パスワードを更新しました。再度ログインしてください。</p>
        <a href='/login'>ログイン画面へ</a>
      </section>
    );
  }

  return (
    <section>
      <h2>パスワード再設定</h2>
      <form onSubmit={handleSubmit}>
        <label>
          新しいパスワード
          <input
            type='password'
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <label>
          確認用パスワード
          <input
            type='password'
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type='submit' disabled={loading}>
          {loading ? '更新中...' : '更新'}
        </button>
      </form>
    </section>
  );
}

