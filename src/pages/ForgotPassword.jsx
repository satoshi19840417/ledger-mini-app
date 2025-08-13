import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback',
      });
      if (error) throw error;
      setMessage('パスワード再設定用のメールを送信しました。');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>パスワード再発行</h2>
      <div className='card'>
        {message && (
          <p role='status' style={{ color: '#16a34a' }}>
            {message}
          </p>
        )}
        {error && (
          <p role='alert' style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <label htmlFor='email'>メールアドレス</label>
          <input
            id='email'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            pattern='[^\s@]+@[^\s@]+\.[^\s@]+'
            disabled={loading}
          />
          <button type='submit' disabled={loading}>
            {loading ? '送信中...' : '送信'}
          </button>
        </form>
      </div>
    </section>
  );
}
