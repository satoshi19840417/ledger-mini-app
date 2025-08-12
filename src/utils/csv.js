import Papa from 'papaparse';

/** @typedef {import('../types').Transaction} Transaction */

// Aliases for header names mapping to canonical keys
const HEADER_ALIASES = {
  date: ['date', '日付', '日時', '取引日', 'ご利用年月日'],
  amount: ['amount', '金額', '支出金額', '入金金額', '出金額', 'ご利用金額（キャッシングでは元金になります）'],
  description: ['description', '説明', '内容', 'ご利用場所'],
  detail: ['detail', '内訳', '相手先', '支店', '店名', 'ご利用内容'],
  memo: ['memo', 'メモ', '摘要', '備考', 'コメント', '支払区分', 'お支払開始月'],
  category: ['category', 'カテゴリ', '費目', '科目', '分類', '項目'],
  kind: ['kind', '収支', 'タイプ', '種別', '入出金', '取引種別', '種別（ショッピング、キャッシング、その他）'],
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

// Convert row object to Transaction with validation error reporting
function rowToTransaction(row) {
  if (!row.date) return { tx: null, error: 'Missing date' };
  if (!row.amount) return { tx: null, error: 'Missing amount' };

  let amount = Number(String(row.amount).replace(/,/g, ''));
  if (Number.isNaN(amount)) return { tx: null, error: `Invalid amount: ${row.amount}` };
  if (row.kind) {
    const kind = String(row.kind).toLowerCase();
    if (/(expense|支出|出金)/.test(kind)) {
      amount = -Math.abs(amount);
    } else if (/(income|収入|入金)/.test(kind)) {
      amount = Math.abs(amount);
    }
  }

  const tx = {
    date: new Date(row.date).toISOString().slice(0, 10),
    amount,
  };
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
    const required = ['date', 'amount'];
    for (const field of required) {
      if (!parsed.meta.fields || !parsed.meta.fields.includes(field)) {
        errors.push(`Missing mandatory column: ${field}`);
      }
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
