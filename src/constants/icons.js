// カテゴリアイコンマッピング
export const CATEGORY_ICONS = {
  // 支出カテゴリ
  '食費': '🍽️',
  '外食費': '🍜',
  '家賃': '🏠',
  '住居・光熱': '💡',
  '日用品・消耗品': '🧻',
  '通信': '📱',
  '交通・移動': '🚗',
  '医療・健康': '🏥',
  '衣服・美容': '👕',
  '趣味・娯楽': '🎮',
  '旅行・レジャー': '✈️',
  '教育・書籍': '📚',
  '交際費': '🍻',
  'ビジネス': '💼',
  '税金・保険': '📋',
  'Amazon': '📦',
  'カード払い': '💳',
  'カード支払い': '💳',
  
  // 収入カテゴリ
  '収入': '💰',
  '給与': '💰',
  '投資利益': '📈',
  '雑収入': '💵',
  '返金': '↩️',
  '仕送り': '💌',
  '売電': '⚡',
  'その他収入': '💸',
  
  // その他
  'その他': '📌',
  '不明': '❓'
};

// ナビゲーションアイコン
export const NAV_ICONS = {
  // メインナビゲーション
  dashboard: '📊',
  monthly: '📅',
  analysis: '🔍',
  yearly: '📈',
  
  // データ管理
  import: '📥',
  export: '📤',
  cleanup: '🧹',
  rules: '⚙️',
  others: '📋',
  tx: '📝',
  categories: '🏷️',
  
  // 設定
  prefs: '🎨',
  settings: '👤',
  uitest: '🧪',
  
  // アクション
  sync: '🔄',
  logout: '🚪',
  login: '🔑',
  save: '💾',
  delete: '🗑️',
  edit: '✏️',
  add: '➕',
  remove: '➖',
  filter: '🔽',
  search: '🔎',
  refresh: '🔄',
  close: '❌',
  check: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  error: '❌',
  success: '✅'
};

// ステータスアイコン
export const STATUS_ICONS = {
  syncing: '🔄',
  synced: '✅',
  error: '❌',
  pending: '⏳',
  loading: '⌛',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️'
};

// 収支アイコン
export const AMOUNT_ICONS = {
  income: '➕',
  expense: '➖',
  balance: '⚖️',
  up: '📈',
  down: '📉',
  equal: '➡️'
};

// デフォルトアイコン取得関数
export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['その他'];
}

export function getNavIcon(key) {
  return NAV_ICONS[key] || '📄';
}

export function getStatusIcon(status) {
  return STATUS_ICONS[status] || STATUS_ICONS.info;
}

export function getAmountIcon(type) {
  return AMOUNT_ICONS[type] || AMOUNT_ICONS.balance;
}