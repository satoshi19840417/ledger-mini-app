/**
 * データをCSV形式でエクスポートするユーティリティ
 */

/**
 * トランザクションデータをCSV形式に変換
 * @param {Array} transactions - トランザクションの配列
 * @returns {string} CSV文字列
 */
export function transactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    return '';
  }

  // ヘッダー行
  const headers = [
    '日付',
    '金額',
    'カテゴリ',
    '説明',
    '詳細',
    'メモ',
    '種別',
    'ID'
  ];

  // データ行
  const rows = transactions.map(tx => {
    return [
      tx.date || tx.occurred_on || '',
      tx.amount || 0,
      tx.category || '',
      tx.description || '',
      tx.detail || '',
      tx.memo || '',
      tx.kind || 'expense',
      tx.id || ''
    ];
  });

  // CSV文字列を生成（BOM付きでExcelでの文字化けを防ぐ）
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // セル内にカンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  // BOM付きUTF-8
  return '\uFEFF' + csvContent;
}

/**
 * ルールデータをCSV形式に変換
 * @param {Array} rules - ルールの配列
 * @returns {string} CSV文字列
 */
export function rulesToCSV(rules) {
  if (!rules || rules.length === 0) {
    return '';
  }

  // ヘッダー行
  const headers = [
    'パターン',
    '正規表現',
    'キーワード',
    'カテゴリ',
    'モード',
    '対象',
    '種別',
    'フラグ',
    'ID'
  ];

  // データ行
  const rows = rules.map(rule => {
    return [
      rule.pattern || '',
      rule.regex || '',
      rule.keyword || '',
      rule.category || '',
      rule.mode || 'contains',
      rule.target || '',
      rule.kind || 'both',
      rule.flags || 'i',
      rule.id || ''
    ];
  });

  // CSV文字列を生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  // BOM付きUTF-8
  return '\uFEFF' + csvContent;
}

/**
 * CSVファイルをダウンロード
 * @param {string} csvContent - CSV文字列
 * @param {string} filename - ファイル名
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // メモリ解放
  URL.revokeObjectURL(url);
}

/**
 * 期間でフィルタリングされたトランザクションを取得
 * @param {Array} transactions - トランザクションの配列
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @returns {Array} フィルタリングされたトランザクション
 */
export function filterTransactionsByPeriod(transactions, startDate, endDate) {
  if (!startDate && !endDate) {
    return transactions;
  }
  
  return transactions.filter(tx => {
    const date = tx.date || tx.occurred_on;
    if (!date) return false;
    
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    
    return true;
  });
}

/**
 * 現在の日付をYYYYMMDD形式で取得
 * @returns {string} YYYYMMDD形式の日付
 */
export function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}