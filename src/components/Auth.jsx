import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './Auth.css';

export default function Auth({ onSkipAuth }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const normalizeAuthError = (error) => {
    if (!error?.message) return '';
    return error.message === 'Invalid login credentials'
      ? 'メールアドレスまたはパスワードが正しくありません。'
      : error.message.includes('Email address') && error.message.includes('invalid')
      ? '有効なメールアドレスを入力してください（例: your-email@gmail.com）'
      : error.message;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      setError('Supabase接続が利用できません。ローカルモードをご利用ください。');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
          setError('このメールアドレスは既に登録されています。ログインしてください。');
        } else if (data?.user && data?.session) {
          setMessage('登録が完了しました！自動的にログインしています...');
          window.location.reload();
        } else {
          setMessage('確認メールを送信しました。メールをご確認ください。');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        setMessage('ログインに成功しました！');
        window.location.reload();
      }
    } catch (error) {
      setError(error.message === 'Invalid login credentials' 
        ? 'メールアドレスまたはパスワードが正しくありません。' 
        : error.message.includes('Email address') && error.message.includes('invalid')
        ? '有効なメールアドレスを入力してください（例: your-email@gmail.com）'
        : error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Supabase接続が利用できません。ローカルモードをご利用ください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });

      if (error) throw error;

      if (data?.url) window.location.href = data.url;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!supabase) {
      setError('Supabase接続が利用できません。ローカルモードをご利用ください。');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage('パスワードリセットのメールを送信しました。');
    } catch (error) {
      setError(normalizeAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLocalMode = () => {
    // ローカルストレージモードで起動
    localStorage.setItem('localMode', 'true');
    if (onSkipAuth) {
      onSkipAuth();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 4v16" />
            <path d="M17 4v16" />
            <path d="M2 10h20" />
            <path d="M2 14h20" />
          </svg>
        </div>
        
        <h1 className="auth-title">家計簿カテゴリ管理</h1>
        <h2 className="auth-subtitle">{isSignUp ? '新規登録' : 'ログイン'}</h2>
        
        {message && (
          <div className="auth-message success">{message}</div>
        )}
        
        {error && (
          <div className="auth-message error">{error}</div>
        )}

        {/* ローカルモードボタン */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleLocalMode}
            className="auth-button primary"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            💾 ローカルストレージモードで開始
          </button>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', marginTop: '0.5rem' }}>
            アカウント登録なしで、ブラウザ内にデータを保存します
          </p>
        </div>

        <div className="auth-divider">
          <span>または</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="auth-button google"
          disabled={loading || !supabase}
        >
          Google でログイン
        </button>
        {!supabase && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#dc2626',
              textAlign: 'center',
              marginTop: '-0.5rem',
              marginBottom: '1rem',
            }}
          >
            Supabase設定が必要
          </p>
        )}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              ※ クラウド同期には実際のメールアドレスが必要です
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? '処理中...' : (isSignUp ? '登録' : 'ログイン')}
          </button>
          {!isSignUp && (
            <div className="forgot-password">
              <button type="button" className="auth-link" onClick={handlePasswordReset}>
                パスワードをお忘れですか？
              </button>
            </div>
          )}
        </form>

        <div className="auth-switch">
          {isSignUp ? (
            <>
              既にアカウントをお持ちですか？{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setMessage('');
                  setError('');
                }}
                className="auth-link"
              >
                ログイン
              </button>
            </>
          ) : (
            <>
              アカウントをお持ちでないですか？{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setMessage('');
                  setError('');
                }}
                className="auth-link"
              >
                新規登録
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            💡 選択できるモード
          </h3>
          <ul style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '1rem', lineHeight: '1.5' }}>
            <li><strong>ローカルストレージモード:</strong> データはブラウザに保存（同期なし）</li>
            <li><strong>クラウド同期モード:</strong> 複数デバイスでデータ共有（要登録）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}