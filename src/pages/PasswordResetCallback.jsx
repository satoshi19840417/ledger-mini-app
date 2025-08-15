import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function PasswordResetCallback() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError('パスワードは8文字以上で英字と数字を含めてください');
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
        <form onSubmit={handleSubmit} className='text-left'>
          <label htmlFor='password'>新しいパスワード</label>
          <div className='password-field'>
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              pattern='(?=.*[A-Za-z])(?=.*\d).+'
              aria-describedby='password-hint'
            />
            <button
              type='button'
              onClick={() => setShowPassword(prev => !prev)}
              aria-pressed={showPassword}
            >
              {showPassword ? '非表示' : '表示'}
            </button>
          </div>
          <p id='password-hint'>8文字以上・英数字混在</p>
          <label htmlFor='confirm'>確認</label>
          <div className='password-field'>
            <input
              id='confirm'
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              pattern='(?=.*[A-Za-z])(?=.*\d).+'
            />
            <button
              type='button'
              onClick={() => setShowConfirm(prev => !prev)}
              aria-pressed={showConfirm}
            >
              {showConfirm ? '非表示' : '表示'}
            </button>
          </div>
          <button type='submit' disabled={loading}>
            {loading ? '更新中...' : '更新'}
          </button>
        </form>
      </div>
    </section>
  );
}

