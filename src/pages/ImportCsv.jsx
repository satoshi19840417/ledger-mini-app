import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { useStore } from '../state/StoreContext';

/** @typedef {import('../types').Transaction} Transaction */

/**
 * Detects likely headers for known fields.
 * @param {string[]} fields
 */
function summarizeHeaders(fields) {
  const lower = fields.map(f => f.toLowerCase());
  const find = (patterns) => {
    const idx = lower.findIndex(f => patterns.some(p => f.includes(p)));
    return idx >= 0 ? fields[idx] : null;
  };
  return {
    date: find(['date', 'day']),
    description: find(['description', 'desc', 'detail', 'memo']),
    amount: find(['amount', 'value', 'money', 'price', 'debit', 'credit']),
  };
}

/**
 * Converts parsed CSV rows into transactions based on detected headers.
 * @param {Object[]} rows
 * @param {{date: string|null, description: string|null, amount: string|null}} summary
 * @returns {Transaction[]}
 */
function rowsToTransactions(rows, summary) {
  const { date, description, amount } = summary;
  return rows.map(r => ({
    date: date ? r[date] : '',
    description: description ? r[description] : '',
    amount: amount ? Number(r[amount]) || 0 : 0,
  }));
}

export default function ImportCsv() {
  const { dispatch } = useStore();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [headerSummary, setHeaderSummary] = useState(null);

  const handleFiles = (files) => {
    const f = files?.[0];
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      header: true,
      preview: 50,
      skipEmptyLines: true,
      complete: (results) => {
        setRows(results.data || []);
        setErrors(results.errors || []);
        const fields = results.meta?.fields || [];
        setHeaderSummary(summarizeHeaders(fields));
      },
      error: (err) => {
        setErrors([err]);
      },
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const parsedTx = rowsToTransactions(rows, headerSummary || { date: null, description: null, amount: null });

  const importAndApply = (append) => {
    if (!parsedTx.length) return;
    dispatch({ type: 'importTransactions', payload: parsedTx, append });
    dispatch({ type: 'applyRules' });
  };

  return (
    <section>
      <h2>CSV取込</h2>
      <div
        className="border p-4 text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {file ? `${file.name} を選択中` : 'ここにCSVファイルをドロップ、またはクリックして選択'}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {headerSummary && (
        <div className="mt-4">
          <h3 className="font-bold">ヘッダー推測</h3>
          <ul className="list-disc list-inside text-left">
            <li>date: {headerSummary.date || '不明'}</li>
            <li>description: {headerSummary.description || '不明'}</li>
            <li>amount: {headerSummary.amount || '不明'}</li>
          </ul>
        </div>
      )}
      {rows.length > 0 && (
        <div className="overflow-auto mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((h) => (
                  <th key={h} className="border px-2 py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="odd:bg-gray-100">
                  {Object.keys(row).map((h) => (
                    <td key={h} className="border px-2 py-1">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {errors.length > 0 && (
        <ul className="mt-4 text-left text-red-600">
          {errors.map((err, idx) => (
            <li key={idx}>{`Row ${'row' in err ? err.row : ''} ${err.message}`}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="btn"
          onClick={() => importAndApply(true)}
          disabled={!parsedTx.length}
        >
          追加入力
        </button>
        <button
          className="btn"
          onClick={() => importAndApply(false)}
          disabled={!parsedTx.length}
        >
          置き換え
        </button>
      </div>
    </section>
  );
}
