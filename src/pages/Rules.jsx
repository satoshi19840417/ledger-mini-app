import { useStore } from '../state/StoreContext';
/** @typedef {import('../types').Rule} Rule */

export default function Rules() {
  const { state } = useStore();
  /** @type {Rule[]} */
  const rules = state.rules;
  return (
    <section>
      <h2>再分類ルール</h2>
      <div className='card'>（{rules.length}件のルール）</div>
    </section>
  );
}
