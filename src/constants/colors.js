// カラーシステム定義
export const COLORS = {
  // プライマリカラー
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryLight: '#dbeafe',
  
  // 収支カラー
  income: '#10b981',
  incomeHover: '#059669',
  incomeLight: '#d1fae5',
  
  expense: '#ef4444',
  expenseHover: '#dc2626',
  expenseLight: '#fee2e2',
  
  // グレースケール
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  
  // セマンティックカラー
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // 背景色
  background: '#f9fafb',
  surface: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // テキスト色
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff'
  },
  
  // ボーダー色
  border: {
    default: '#e5e7eb',
    focus: '#3b82f6',
    error: '#ef4444'
  }
};

// シャドウ定義
export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  xl: '0 20px 25px rgba(0,0,0,0.1)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.06)'
};

// アニメーション定義
export const TRANSITIONS = {
  fast: 'all 0.15s ease',
  default: 'all 0.2s ease',
  slow: 'all 0.3s ease',
  spring: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

// ブレイクポイント定義
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// 間隔定義
export const SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem'   // 64px
};

// フォントサイズ定義
export const FONT_SIZES = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem'  // 36px
};

// ボーダー半径定義
export const BORDER_RADIUS = {
  none: '0',
  sm: '0.125rem',  // 2px
  default: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px'
};

// Z-Index定義
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};