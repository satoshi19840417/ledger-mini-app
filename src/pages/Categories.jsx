import { useState } from 'react';
import { useStore } from '../state/StoreContextWithDB';

export default function Categories() {
  const { state, dispatch } = useStore();
  const categories = state.categories;
  const [newCat, setNewCat] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const addCategory = e => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name || categories.includes(name)) return;
    dispatch({ type: 'addCategory', payload: name });
    setNewCat('');
  };

  const startEdit = idx => {
    setEditingIndex(idx);
    setEditingValue(categories[idx]);
  };

  const saveEdit = idx => {
    const name = editingValue.trim();
    if (!name) return;
    dispatch({
      type: 'updateCategory',
      payload: { oldCategory: categories[idx], newCategory: name }
    });
    setEditingIndex(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const deleteCat = cat => {
    if (!window.confirm(`${cat} を削除しますか？`)) return;
    dispatch({ type: 'deleteCategory', payload: cat });
  };

  return (
    <section>
      <h2>カテゴリ管理</h2>
      <div className='card'>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {categories.map((c, idx) => (
              <tr key={c}>
                {editingIndex === idx ? (
                  <>
                    <td style={{ padding: 4 }}>
                      <input
                        type='text'
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                      />
                    </td>
                    <td style={{ padding: 4, width: 120 }}>
                      <button onClick={() => saveEdit(idx)}>保存</button>
                      <button onClick={cancelEdit}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 4 }}>{c}</td>
                    <td style={{ padding: 4, width: 120 }}>
                      <button onClick={() => startEdit(idx)}>編集</button>
                      <button onClick={() => deleteCat(c)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addCategory} style={{ marginTop: 8, display: 'flex', gap: 4 }}>
          <input
            type='text'
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            placeholder='新規カテゴリ'
          />
          <button type='submit'>追加</button>
        </form>
      </div>
    </section>
  );
}
