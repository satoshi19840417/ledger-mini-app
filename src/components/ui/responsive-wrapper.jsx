import React from 'react';

/**
 * レスポンシブラッパーコンポーネント
 * モバイルでのはみ出しを防ぐ汎用ラッパー
 */
export const ResponsiveWrapper = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-hidden ${className}`}>
      <div className="w-full max-w-full">
        {children}
      </div>
    </div>
  );
};

/**
 * テーブルラッパーコンポーネント
 * モバイルでテーブルをスクロール可能にする
 */
export const ResponsiveTable = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto -mx-4 px-4 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
};

/**
 * カードラッパーコンポーネント
 * モバイルでカードの余白を調整
 */
export const ResponsiveCard = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-full md:max-w-none ${className}`}>
      <div className="mx-2 md:mx-0">
        {children}
      </div>
    </div>
  );
};

/**
 * グラフラッパーコンポーネント
 * Rechartsグラフのレスポンシブ対応
 */
export const ResponsiveChart = ({ children, height = 300, className = '' }) => {
  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <div className="w-full h-full" style={{ minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;