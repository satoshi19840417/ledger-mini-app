import { useState } from 'react';
import { useStore } from '../state/StoreContext';
import { parseCsvFiles } from '../utils/csv.js';

export default function ImportCsv() {
  const { dispatch } = useStore();
  const [append, setAppend] = useState(true);

  async function handleChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const txs = await parseCsvFiles(files);
    dispatch({ type: 'importTransactions', payload: txs, append });
    e.target.value = '';
  }

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
      </div>
    </section>
  );
}
