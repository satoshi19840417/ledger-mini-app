import { useState, useRef } from 'react';
import { useStore } from '../state/StoreContextWithDB';

export default function Categories() {
  const { state, dispatch } = useStore();
  const categories = state.categories;
  const [newCat, setNewCat] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragCounter = useRef(0);

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
    // このカテゴリを使用している取引とルールの数を計算
    const affectedTransactions = state.transactions.filter(tx => tx.category === cat);
    const affectedRules = state.rules.filter(rule => rule.category === cat);
    
    let warningMessage = `「${cat}」を削除しますか？\n\n`;
    
    if (affectedTransactions.length > 0) {
      warningMessage += `⚠️ ${affectedTransactions.length}件の取引がこのカテゴリを使用しています。\n`;
      warningMessage += `  → これらの取引は「その他」に変更されます。\n\n`;
    }
    
    if (affectedRules.length > 0) {
      warningMessage += `⚠️ ${affectedRules.length}件の自動分類ルールがこのカテゴリを使用しています。\n`;
      warningMessage += `  → これらのルールは削除されます。\n\n`;
    }
    
    if (affectedTransactions.length === 0 && affectedRules.length === 0) {
      warningMessage += `このカテゴリを使用しているデータはありません。`;
    } else {
      warningMessage += `この操作は取り消せません。本当に削除しますか？`;
    }
    
    if (!window.confirm(warningMessage)) return;
    dispatch({ type: 'deleteCategory', payload: cat });
  };

  // ドラッグ&ドロップのハンドラ
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    // ドラッグ中のアイテムを半透明にする
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '';
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnter = (index) => {
    dragCounter.current++;
    if (draggedItem !== null && draggedItem !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newCategories = [...categories];
    const draggedCategory = newCategories[draggedItem];
    
    // ドラッグされたアイテムを削除
    newCategories.splice(draggedItem, 1);
    
    // 新しい位置に挿入
    const insertIndex = dropIndex > draggedItem ? dropIndex - 1 : dropIndex;
    newCategories.splice(insertIndex, 0, draggedCategory);
    
    dispatch({ type: 'reorderCategories', payload: newCategories });
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  // 上下ボタンでの並び替え
  const moveCategory = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    
    const newCategories = [...categories];
    [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
    
    dispatch({ type: 'reorderCategories', payload: newCategories });
  };

  return (
    <section>
      <h2>カテゴリ管理</h2>
      <div className='card'>
        <p style={{ marginBottom: 12, color: '#666', fontSize: '0.9em' }}>
          ドラッグ&ドロップまたは↑↓ボタンで並び順を変更できます
        </p>
        <table className='text-left' style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {categories.map((c, idx) => (
              <tr 
                key={c}
                draggable={editingIndex !== idx}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => handleDragEnter(idx)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                style={{
                  cursor: editingIndex !== idx ? 'move' : 'default',
                  backgroundColor: dragOverIndex === idx ? '#f0f0f0' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                {editingIndex === idx ? (
                  <>
                    <td style={{ padding: 8, width: 30 }}>
                      <span style={{ cursor: 'not-allowed', opacity: 0.5 }}>≡</span>
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type='text'
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 8, width: 180 }}>
                      <button onClick={() => saveEdit(idx)}>保存</button>
                      <button onClick={cancelEdit}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 8, width: 30 }}>
                      <span style={{ cursor: 'move' }}>≡</span>
                    </td>
                    <td style={{ padding: 8 }}>{c}</td>
                    <td style={{ padding: 8, width: 180, whiteSpace: 'nowrap' }}>
                      <button 
                        onClick={() => moveCategory(idx, 'up')} 
                        disabled={idx === 0}
                        title="上へ移動"
                        style={{ 
                          padding: '4px 8px',
                          marginRight: 4,
                          opacity: idx === 0 ? 0.5 : 1,
                          cursor: idx === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => moveCategory(idx, 'down')} 
                        disabled={idx === categories.length - 1}
                        title="下へ移動"
                        style={{ 
                          padding: '4px 8px',
                          marginRight: 8,
                          opacity: idx === categories.length - 1 ? 0.5 : 1,
                          cursor: idx === categories.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ↓
                      </button>
                      <button onClick={() => startEdit(idx)}>編集</button>
                      <button onClick={() => deleteCat(c)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addCategory} className='text-left' style={{ marginTop: 12, display: 'flex', gap: 4 }}>
          <input
            type='text'
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            placeholder='新規カテゴリ'
            style={{ flex: 1 }}
          />
          <button type='submit'>追加</button>
        </form>
      </div>
    </section>
  );
}