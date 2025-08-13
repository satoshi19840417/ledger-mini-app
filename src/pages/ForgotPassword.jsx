import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase接続が利用できません。');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback',
      });
      if (error) throw error;
      setStatus('success');
      setMessage('パスワード再設定メールを送信しました。');
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <section>
      <h2>パスワード再設定</h2>
      <div className='card'>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
          <label htmlFor='email'>
            メールアドレス
            <input
              id='email'
              type='email'
              required
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <button type='submit' disabled={status === 'loading'}>
            {status === 'loading' ? '送信中...' : '送信'}
          </button>
          <p aria-live='polite' style={{ minHeight: '1.5em', color: status === 'error' ? '#dc2626' : '#16a34a' }}>
            {status === 'success' || status === 'error' ? message : ''}
          </p>
        </form>
      </div>
    </section>
  );
}
