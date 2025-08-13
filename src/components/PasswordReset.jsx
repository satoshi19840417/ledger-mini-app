import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { toast } from 'react-hot-toast';

export default function PasswordReset() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // URLパラメータからトークンを確認
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      setIsValidToken(true);
    } else {
      setError('無効なリセットリンクです。パスワードリセットを再度リクエストしてください。');
    }
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      setError('Supabase接続が利用できません。');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage('パスワードが正常に更新されました。ログイン画面に戻ります...');
      toast.success('パスワードが更新されました');
      
      // 3秒後にトップページへリダイレクト
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error) {
      setError(error.message || 'パスワードの更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              <path d="M12 22V2"/>
            </svg>
          </div>
          
          <h1 className="auth-title">パスワードリセット</h1>
          
          <div className="auth-message error">{error}</div>
          
          <button
            onClick={() => window.location.href = '/'}
            className="auth-button primary"
            style={{ marginTop: '1rem' }}
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            <path d="M12 22V2"/>
          </svg>
        </div>
        
        <h1 className="auth-title">新しいパスワードを設定</h1>
        
        {message && (
          <div className="auth-message success">{message}</div>
        )}
        
        {error && (
          <div className="auth-message error">{error}</div>
        )}

        <form onSubmit={handlePasswordUpdate} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">新しいパスワード</label>
            <input
              id="password"
              type="password"
              placeholder="6文字以上で入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="もう一度入力"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            className="auth-button primary"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>

        <div className="auth-switch">
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="auth-link"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    </div>
  );
}