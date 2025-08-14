import Papa from 'papaparse';

/** @typedef {import('../types').Transaction} Transaction */

// Aliases for header names mapping to canonical keys
const HEADER_ALIASES = {
  date: ['date', '日付', '日時', '取引日', 'ご利用年月日', '年月日'],
  amount: [
    'amount',
    '金額',
    '支出金額',
    '入金金額',
    '出金額',
    'ご利用金額（キャッシングでは元金になります）',
  ],
  deposit: ['deposit', 'お預入れ'],
  withdraw: ['withdraw', 'お引出し'],
  description: ['description', '説明', '内容', 'ご利用場所', 'お取り扱い内容'],
  detail: ['detail', '内訳', '相手先', '支店', '店名', 'ご利用内容'],
  memo: ['memo', 'メモ', '摘要', '備考', 'コメント', '支払区分', 'お支払開始月'],
  category: ['category', 'カテゴリ', '費目', '科目', '分類', '項目', 'ラベル'],
  kind: ['kind', '収支', 'タイプ', '種別', '入出金', '取引種別', '種別（ショッピング、キャッシング、その他）'],
  id: ['id', 'ID', 'トランザクションID', '取引ID'],
};

// Normalize header names using aliases above
function normalizeHeader(header) {
  const lower = header.trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === lower)) {
      return canon;
    }
  }
  return header.trim();
}

// Read a file as text with specified encoding
function readAsText(file, encoding) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file, encoding);
  });
}

// Try reading in UTF-8 first, fall back to Shift-JIS based on replacement character count
async function readWithFallback(file) {
  const utf8 = await readAsText(file, 'utf-8');
  if (!utf8.includes('\uFFFD')) return utf8;
  const sjis = await readAsText(file, 'shift-jis');
  const count = (s) => (s.match(/\uFFFD/g) || []).length;
  return count(utf8) <= count(sjis) ? utf8 : sjis;
}

// Convert dates like "YYYY年M月D日" or "YYYY/M/D" to "YYYY-MM-DD"
function parseJapaneseDate(str) {
  const s = String(str).trim();
  let m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (m) {
    const [, y, mth, d] = m;
    return `${y}-${mth.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const [, y, mth, d] = m;
    return `${y}-${mth.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

// Convert row object to Transaction with validation error reporting
function rowToTransaction(row) {
  const dateStr = row.date ? parseJapaneseDate(row.date) : '';
  if (!dateStr) return { tx: null, error: 'Missing date' };

  let amount;
  let sourceAmount;
  if (row.amount != null && String(row.amount).trim() !== '') {
    sourceAmount = row.amount;
    amount = Number(String(row.amount).replace(/,/g, ''));
  } else if (row.deposit != null && String(row.deposit).trim() !== '') {
    sourceAmount = row.deposit;
    amount = Math.abs(Number(String(row.deposit).replace(/,/g, '')));
  } else if (row.withdraw != null && String(row.withdraw).trim() !== '') {
    sourceAmount = row.withdraw;
    amount = -Math.abs(Number(String(row.withdraw).replace(/,/g, '')));
  } else {
    return { tx: null, error: 'Missing amount' };
  }

  if (Number.isNaN(amount)) {
    return { tx: null, error: `Invalid amount: ${sourceAmount}` };
  }
  /** @type {'income'|'expense'|undefined} */
  let kind;
  if (row.kind) {
    const k = String(row.kind).toLowerCase();
    if (/(expense|支出|出金|ショッピング|キャッシング)/.test(k)) {
      kind = 'expense';
    } else if (/(income|収入|入金)/.test(k)) {
      // TODO: Add more income type keywords if additional deposit kinds are introduced
      kind = 'income';
    }
  }
  if (!kind) {
    kind = amount < 0 ? 'expense' : 'income';
  }
  amount = kind === 'expense' ? -Math.abs(amount) : Math.abs(amount);

  const tx = {
    date: new Date(dateStr).toISOString().slice(0, 10),
    amount,
    kind,
  };
  if (row.id) tx.id = row.id;  // IDフィールドを保持
  if (row.description) tx.description = row.description;
  if (row.detail) tx.detail = row.detail;
  if (row.memo) tx.memo = row.memo;
  if (row.category) tx.category = row.category;
  return { tx, error: null };
}

/**
 * Parse multiple CSV files and convert to Transaction objects.
 * @param {FileList|File[]} files
 * @returns {Promise<{ transactions: Transaction[]; headerMap: Record<string, string>; errors: string[] }>}
 */
export async function parseCsvFiles(files) {
  const list = Array.from(files);
  /** @type {Transaction[]} */
  const transactions = [];
  /** @type {Record<string, string>} */
  const headerMap = {};
  /** @type {string[]} */
  const errors = [];
  for (const file of list) {
    const text = await readWithFallback(file);
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      beforeFirstChunk(chunk) {
        const lines = chunk.split(/\r?\n/);
        if (lines[0].includes('月別ご利用明細')) {
          return lines.slice(1).join('\n');
        }
        return chunk;
      },
      transformHeader(header) {
        const canon = normalizeHeader(header);
        if (!(canon in headerMap)) headerMap[canon] = header.trim();
        return canon;
      },
    });

    // Capture Papa.parse errors
    for (const err of parsed.errors) {
      const rowInfo = typeof err.row === 'number' ? `Row ${err.row}: ` : '';
      errors.push(`${rowInfo}${err.message}`);
    }

    // Validate mandatory columns
    const fields = parsed.meta.fields || [];
    if (!fields.includes('date')) {
      errors.push('Missing mandatory column: date');
    }
    if (!['amount', 'deposit', 'withdraw'].some((f) => fields.includes(f))) {
      errors.push('Missing mandatory column: amount/deposit/withdraw');
    }

    parsed.data.forEach((row, i) => {
      const { tx, error } = rowToTransaction(row);
      if (tx) transactions.push(tx);
      else if (error) errors.push(`Row ${i + 1}: ${error}`);
    });
  }
  return { transactions, headerMap, errors };
}

export { normalizeHeader, rowToTransaction };
