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
      setError('パスワードが一致しません');
      return;
    }

    if (!supabase) {
      setError('Supabase接続が利用できません');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section>
        <h2>パスワード更新</h2>
        <div className='card'>
          <p>パスワードを更新しました。ログインし直してください。</p>
          <a href='/login'>ログイン画面へ</a>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2>パスワード更新</h2>
      <div className='card'>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>
            新しいパスワード
            <input
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            確認
            <input
              type='password'
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button type='submit' disabled={loading}>
            {loading ? '更新中...' : '更新'}
          </button>
        </form>
      </div>
    </section>
  );
}

