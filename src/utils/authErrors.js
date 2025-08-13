export function normalizeAuthError(error) {
  const message = error?.message || '';
  if (message === 'Invalid login credentials') {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }
  if (message === 'Email not confirmed') {
    return 'メールアドレスが確認されていません。メールをご確認ください。';
  }
  if (message.toLowerCase().includes('rate limit') || error?.status === 429) {
    return '一定回数を超過しました。しばらく待ってから再度お試しください。';
  }
  return message;
}
