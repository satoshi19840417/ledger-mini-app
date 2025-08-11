import { useStore } from '../state/StoreContext';
/** @typedef {import('../types').Transaction} Transaction */

export default function Transactions() {
  const { state } = useStore();
  /** @type {Transaction[]} */
  const txs = state.transactions;
  return (
    <section>
      <h2>取引一覧</h2>
      <div className='card'>（{txs.length} 件の取引）</div>
    </section>
  );
}
