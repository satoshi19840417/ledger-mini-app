import { useState } from 'react';
import { useStore } from '../state/StoreContext';
import { parseCsvFiles } from '../utils/csv.js';

export default function ImportCsv() {
  const { dispatch } = useStore();
  const [append, setAppend] = useState(true);
  const [preview, setPreview] = useState([]);
  const [headerMap, setHeaderMap] = useState({});
  const [errors, setErrors] = useState([]);

  async function handleChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const {
      transactions,
      headerMap: map,
      errors: errs,
    } = await parseCsvFiles(files);
    setPreview(transactions);
    setHeaderMap(map);
    setErrors(errs);
    if (transactions.length > 0) {
      dispatch({ type: 'importTransactions', payload: transactions, append });
      dispatch({ type: 'applyRules' });
    }
    e.target.value = '';
  }

  const KNOWN_FIELDS = [
    'date',
    'description',
    'detail',
    'memo',
    'amount',
    'category',
    'kind',
  ];

  return (
    <section>
      <h2>CSV取込</h2>
      <div className='card'>
        <div className='space-y-2'>
          <input type='file' multiple onChange={handleChange} />
          <label className='block'>
            <input
              type='checkbox'
              checked={append}
              onChange={(e) => setAppend(e.target.checked)}
            />
            <span className='ml-2'>既存の取引に追加する</span>
          </label>
        </div>
        {(preview.length > 0 || errors.length > 0) && (
          <div className='mt-4 space-y-2'>
            {preview.length > 0 && (
              <>
                <div className='text-sm text-gray-700'>
                  {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                    <span key={f} className='mr-4'>
                      {f} ↔ {headerMap[f]}
                    </span>
                  ))}
                </div>
                <div className='overflow-x-auto'>
                  <table className='min-w-full text-sm'>
                    <thead>
                      <tr>
                        {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                          <th key={f} className='px-2 py-1 text-left'>
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((tx, i) => (
                        <tr key={i} className='border-t'>
                          {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                            <td key={f} className='px-2 py-1'>
                              {tx[f] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {errors.length > 0 && (
              <ul className='text-sm text-red-600 list-disc list-inside'>
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
