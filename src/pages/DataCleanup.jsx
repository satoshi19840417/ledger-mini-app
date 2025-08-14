import { useState, useEffect } from 'react';
import { useStore } from '../state/StoreContextWithDB.jsx';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/database.js';
import { useSession } from '../useSession.js';

export default function DataCleanup() {
  const { state, dispatch, loadFromDatabase, syncWithDatabase } = useStore();
  const { session } = useSession();
  const [duplicates, setDuplicates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groupBy, setGroupBy] = useState('date'); // 'date', 'amount', 'description'

  // 重複を検出する関数
  const analyzeDuplicates = () => {
    setIsAnalyzing(true);
    const duplicateGroups = {};
    
    // トランザクションをグループ化
    state.transactions.forEach(tx => {
      let key;
      if (groupBy === 'date') {
        // 日付、金額、説明で重複をチェック
        key = `${tx.date}_${tx.amount}_${tx.description || ''}`;
      } else if (groupBy === 'amount') {
        // 金額と説明で重複をチェック
        key = `${tx.amount}_${tx.description || ''}`;
      } else {
        // 説明のみで重複をチェック
        key = tx.description || '';
      }
      
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(tx);
    });
    
    // 重複のあるグループのみを抽出
    const duplicatesList = [];
    Object.entries(duplicateGroups).forEach(([key, group]) => {
      if (group.length > 1) {
        duplicatesList.push({
          key,
          count: group.length,
          transactions: group.sort((a, b) => {
            // 作成日時でソート（古いものが上）
            return new Date(a.created_at || 0) - new Date(b.created_at || 0);
          })
        });
      }
    });
    
    // 重複数が多い順にソート
    duplicatesList.sort((a, b) => b.count - a.count);
    setDuplicates(duplicatesList);
    setIsAnalyzing(false);
    
    if (duplicatesList.length === 0) {
      toast.success('重複データは見つかりませんでした');
    } else {
      const totalDuplicates = duplicatesList.reduce((sum, group) => sum + group.count - 1, 0);
      toast.success(`${duplicatesList.length}グループ、合計${totalDuplicates}件の重複が見つかりました`);
    }
  };

  // 選択されたIDを追加/削除
  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // グループ内の重複のみを選択（最初の1件を残す）
  const selectDuplicatesInGroup = (group) => {
    const newSelection = new Set(selectedIds);
    // 最初の1件以外を選択
    group.transactions.slice(1).forEach(tx => {
      newSelection.add(tx.id);
    });
    setSelectedIds(newSelection);
  };

  // 全ての重複を選択（各グループの最初の1件を残す）
  const selectAllDuplicates = () => {
    const newSelection = new Set();
    duplicates.forEach(group => {
      // 各グループの最初の1件以外を選択
      group.transactions.slice(1).forEach(tx => {
        newSelection.add(tx.id);
      });
    });
    setSelectedIds(newSelection);
    toast.success(`${newSelection.size}件の重複を選択しました`);
  };

  // 選択されたデータを削除
  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('削除するデータを選択してください');
      return;
    }
    
    if (!confirm(`${selectedIds.size}件のデータを削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      // ローカルストレージから削除
      const remainingTransactions = state.transactions.filter(tx => !selectedIds.has(tx.id));
      
      // ストアを更新
      dispatch({
        type: 'importTransactions',
        payload: remainingTransactions,
        append: false
      });
      
      // データベースと同期
      if (session?.user?.id) {
        await syncWithDatabase();
      }
      
      toast.success(`${selectedIds.size}件のデータを削除しました`);
      setSelectedIds(new Set());
      setDuplicates([]);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // 特定の日付のデータを分析する関数
  const analyzeSpecificDate = (targetDate) => {
    const filtered = state.transactions.filter(tx => tx.date === targetDate);
    const duplicateGroups = {};
    
    filtered.forEach(tx => {
      const key = `${tx.amount}_${tx.category || ''}_${tx.description || ''}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(tx);
    });
    
    const duplicatesList = [];
    Object.entries(duplicateGroups).forEach(([key, group]) => {
      if (group.length > 1) {
        duplicatesList.push({
          key,
          count: group.length,
          transactions: group
        });
      }
    });
    
    return {
      total: filtered.length,
      unique: Object.keys(duplicateGroups).length,
      duplicates: duplicatesList
    };
  };

  // 2025-08-10のデータを分析
  useEffect(() => {
    const result = analyzeSpecificDate('2025-08-10');
    if (result.total > 100) {
      console.warn(`警告: 2025-08-10に${result.total}件のデータがあります（ユニーク: ${result.unique}件）`);
    }
  }, [state.transactions]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">データクリーンアップ</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">重複データの検出</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            重複判定基準
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border rounded-lg w-full md:w-auto"
          >
            <option value="date">日付 + 金額 + 説明</option>
            <option value="amount">金額 + 説明</option>
            <option value="description">説明のみ</option>
          </select>
        </div>
        
        <div className="flex gap-3 mb-4">
          <button
            onClick={analyzeDuplicates}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing ? '分析中...' : '重複を検出'}
          </button>
          
          {duplicates.length > 0 && (
            <>
              <button
                onClick={selectAllDuplicates}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                全ての重複を選択
              </button>
              
              <button
                onClick={deleteSelected}
                disabled={isDeleting || selectedIds.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : `選択した${selectedIds.size}件を削除`}
              </button>
            </>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          合計 {state.transactions.length} 件のトランザクション
        </div>
      </div>
      
      {/* 重複データの表示 */}
      {duplicates.length > 0 && (
        <div className="space-y-4">
          {duplicates.map((group, groupIndex) => (
            <div key={groupIndex} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">
                  {group.count} 件の重複
                </h3>
                <button
                  onClick={() => selectDuplicatesInGroup(group)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  重複のみ選択（最初の1件を残す）
                </button>
              </div>
              
              <div className="space-y-2">
                {group.transactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className={`p-3 border rounded-lg ${
                      selectedIds.has(tx.id) ? 'bg-red-50 border-red-300' : 'bg-gray-50'
                    } ${index === 0 ? 'border-green-300' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          disabled={index === 0}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="flex gap-4 text-sm">
                            <span className="font-medium">{tx.date}</span>
                            <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                              ¥{Math.abs(tx.amount).toLocaleString()}
                            </span>
                            <span>{tx.category}</span>
                            <span className="text-gray-600">{tx.description}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {tx.detail && <span className="mr-4">詳細: {tx.detail}</span>}
                            {tx.memo && <span>メモ: {tx.memo}</span>}
                          </div>
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          保持
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 警告: 2025-08-10の大量データ */}
      {state.transactions.filter(tx => tx.date === '2025-08-10').length > 100 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">⚠️ 異常なデータ検出</h3>
          <p className="text-sm text-yellow-700">
            2025-08-10に{state.transactions.filter(tx => tx.date === '2025-08-10').length}件のデータがあります。
            これは異常に多い可能性があります。重複検出を実行して確認してください。
          </p>
        </div>
      )}
    </div>
  );
}