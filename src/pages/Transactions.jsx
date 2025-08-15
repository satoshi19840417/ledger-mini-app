import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../state/StoreContextWithDB';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DEFAULT_CATEGORIES } from '../defaultCategories.js';
import { 
  Search, Filter, Download, FileSpreadsheet, Plus, Save, 
  RefreshCw, X, ChevronLeft, ChevronRight, Calendar,
  DollarSign, Tag, FileText, Settings, Trash2
} from 'lucide-react';
/** @typedef {import('../types').Transaction} Transaction */
/** @typedef {import('../types').Rule} Rule */

export default function Transactions() {
  const { state, dispatch } = useStore();
  /** @type {Transaction[]} */
  const txs = state.transactions;
  const categories = state.categories;
  const unclassifiedCount = txs.filter(tx => !tx.category).length;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [showUnclassifiedOnly, setShowUnclassifiedOnly] = useState(false);
  const [ruleAppliedMessage, setRuleAppliedMessage] = useState('');
  const [excludedFromTotals, setExcludedFromTotals] = useState({});
  const [newRule, setNewRule] = useState({
    pattern: '',
    mode: 'contains',
    target: 'description',
    category: categories[0],
    kind: 'both',
  });

// --- 修正後 ---
const filtered = useMemo(() => {
  return txs.filter((tx) => {
    // 既存フィルタ
    if (showUnclassifiedOnly && tx.category) return false;
    if (
      excludeCardPayments &&
      (tx.category === 'カード支払い' || tx.category === 'カード払い' || tx.category === 'クレカ払い')
    ) return false;

    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;

    // カテゴリフィルタ（プルダウン選択）
    if (selectedCategory && selectedCategory !== '' && tx.category !== selectedCategory) return false;

    if (categoryQuery && categoryQuery.trim() !== '') {
      const c = (tx.category || '').toLowerCase();
      if (!c.includes(categoryQuery.toLowerCase().trim())) return false;
    }

    // 既存: キーワード検索
    if (keyword && keyword.trim() !== '') {
      const k = keyword.toLowerCase().trim();
      const target = `${tx.description || ''} ${tx.detail || ''} ${tx.memo || ''}`.toLowerCase();
      if (!target.includes(k)) return false;
    }

    // 金額・種別
    const amt = Math.abs(Number(tx.amount));
    if (minAmount !== '' && !Number.isNaN(Number(minAmount)) && amt < Number(minAmount)) return false;
    if (maxAmount !== '' && !Number.isNaN(Number(maxAmount)) && amt > Number(maxAmount)) return false;

    if (type === 'income' && tx.kind !== 'income') return false;
    if (type === 'expense' && tx.kind !== 'expense') return false;

    return true;
  });
}, [
  txs,
  startDate, endDate,
  selectedCategory, categoryQuery,
  keyword, minAmount, maxAmount, type,
  excludeCardPayments, showUnclassifiedOnly,
]);

// ページングリセット（依存も統合）
useEffect(() => {
  setPage(1);
}, [
  startDate, endDate,
  selectedCategory, categoryQuery,
  keyword, minAmount, maxAmount, type,
  excludeCardPayments, showUnclassifiedOnly,
]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageTxs = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transactions.xlsx');
  };

  const openRuleModal = (tx) => {
    setSelectedTx(tx);
    setNewRule({
      pattern: tx.description || tx.detail || '',
      mode: 'contains',
      target: 'description',
      category: tx.category || categories[0],
      kind: tx.kind || 'both',
    });
    setShowRuleModal(true);
  };

  const saveRule = () => {
    const rules = state.rules || [];
    const updatedRules = [...rules, newRule];
    dispatch({ type: 'setRules', payload: updatedRules });
    // ルール保存後、自動的に未分類の取引にルールを適用
    setRuleAppliedMessage('ルールを保存し、全取引に適用しています...');
    setTimeout(() => {
      dispatch({ type: 'applyRules' });
      setRuleAppliedMessage('ルールが適用されました');
      setTimeout(() => setRuleAppliedMessage(''), 3000);
    }, 100);
    setShowRuleModal(false);
    setSelectedTx(null);
  };

  const applyRuleToTransaction = () => {
    if (!selectedTx) return;
    const updatedTxs = state.transactions.map(tx => 
      tx.id === selectedTx.id ? { ...tx, category: newRule.category } : tx
    );
    dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
    setShowRuleModal(false);
    setSelectedTx(null);
  };

  const handleCategoryChange = (txId, newCategory) => {
    setEditedCategories(prev => ({
      ...prev,
      [txId]: newCategory
    }));
  };
  
  const handleExcludeToggle = (txId, excludeFromTotals) => {
    setExcludedFromTotals(prev => ({
      ...prev,
      [txId]: excludeFromTotals
    }));
  };

  const applyEditedCategories = () => {
    const hasEdits = Object.keys(editedCategories).length > 0 || Object.keys(excludedFromTotals).length > 0;
    if (!hasEdits) return;
    
    const updatedTxs = state.transactions.map(tx => {
      let updated = { ...tx };
      if (editedCategories[tx.id] !== undefined) {
        updated.category = editedCategories[tx.id];
      }
      if (excludedFromTotals[tx.id] !== undefined) {
        updated.excludeFromTotals = excludedFromTotals[tx.id];
      }
      return updated;
    });
    
    dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
    setEditedCategories({});
    setExcludedFromTotals({});
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setCategoryQuery('');
    setKeyword('');
    setMinAmount('');
    setMaxAmount('');
    setType('all');
    setExcludeCardPayments(false);
    setShowUnclassifiedOnly(false);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">取引一覧</h1>
        <Badge variant="outline" className="text-sm">
          <FileText className="w-3 h-3 mr-1" />
          {filtered.length} 件の取引
        </Badge>
      </div>
      
      {ruleAppliedMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="text-green-800 text-center font-medium">
              {ruleAppliedMessage}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* フィルター設定カード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              フィルター設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {!showUnclassifiedOnly && unclassifiedCount > 0 && (
                  <Button
                    onClick={() => setShowUnclassifiedOnly(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Tag className="w-3 h-3 mr-2" />
                    未分類 {unclassifiedCount}件を表示
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(Object.keys(editedCategories).length > 0 || Object.keys(excludedFromTotals).length > 0) && (
                  <Button 
                    onClick={applyEditedCategories}
                    variant="default"
                    size="sm"
                  >
                    <Save className="w-3 h-3 mr-2" />
                    変更を保存 ({Object.keys(editedCategories).length + Object.keys(excludedFromTotals).length}件)
                  </Button>
                )}
                <Button onClick={exportCsv} variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-2" />
                  CSV出力
                </Button>
                <Button onClick={exportExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="w-3 h-3 mr-2" />
                  Excel出力
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {/* 日付フィルター */}
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  開始日
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  終了日
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              {/* カテゴリ選択 */}
              <div className="space-y-2">
                <Label htmlFor="category-select" className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  カテゴリ選択
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="全カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全カテゴリ</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* カテゴリ検索 */}
              <div className="space-y-2">
                <Label htmlFor="category-search" className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  カテゴリ検索
                </Label>
                <Input
                  id="category-search"
                  type="text"
                  placeholder="カテゴリ検索"
                  value={categoryQuery}
                  onChange={e => setCategoryQuery(e.target.value)}
                />
              </div>

              {/* キーワード検索 */}
              <div className="space-y-2">
                <Label htmlFor="keyword-search" className="text-sm font-medium flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  キーワード
                </Label>
                <Input
                  id="keyword-search"
                  type="text"
                  placeholder="キーワード"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
              </div>

              {/* 金額範囲 */}
              <div className="space-y-2">
                <Label htmlFor="min-amount" className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  最小金額
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="最小金額"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-amount" className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  最大金額
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="最大金額"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                />
              </div>

              {/* 取引タイプ */}
              <div className="space-y-2">
                <Label htmlFor="type-select" className="text-sm font-medium">取引タイプ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="expense">支出</SelectItem>
                    <SelectItem value="income">収入</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* チェックボックスオプション */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-card"
                  checked={excludeCardPayments}
                  onCheckedChange={setExcludeCardPayments}
                />
                <Label htmlFor="exclude-card" className="text-sm font-medium">
                  カード支払い除外
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unclassified-only"
                  checked={showUnclassifiedOnly}
                  onCheckedChange={setShowUnclassifiedOnly}
                />
                <Label htmlFor="unclassified-only" className="text-sm font-medium">
                  未分類のみ {unclassifiedCount > 0 && `(${unclassifiedCount}件)`}
                </Label>
              </div>
              
              <Button 
                onClick={clearFilters}
                variant="outline"
                size="sm"
              >
                <X className="w-3 h-3 mr-2" />
                条件クリア
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* データテーブルカード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">取引データ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      日付
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap">
                      <Tag className="w-4 h-4 inline mr-1" />
                      カテゴリ
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      金額
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 min-w-[150px]">
                      <FileText className="w-4 h-4 inline mr-1" />
                      内容
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 min-w-[100px]">
                      メモ
                    </th>
                    <th className="text-center p-3 font-semibold text-gray-700 whitespace-nowrap">
                      集計対象
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap">
                      <Settings className="w-4 h-4 inline mr-1" />
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageTxs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        該当取引がありません
                      </td>
                    </tr>
                  ) : (
                    pageTxs.map((tx, idx) => {
                      const isExcluded = excludedFromTotals[tx.id] !== undefined 
                        ? excludedFromTotals[tx.id] 
                        : tx.excludeFromTotals;
                      return (
                        <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${isExcluded ? 'opacity-60' : ''}`}>
                          <td className="p-3 text-sm">{tx.date}</td>
                          <td className="p-3">
                            <Select
                              value={editedCategories[tx.id] || tx.category || ''}
                              onValueChange={(value) => handleCategoryChange(tx.id, value)}
                            >
                              <SelectTrigger className={`w-full h-8 text-xs ${
                                editedCategories[tx.id] ? 'bg-orange-50 border-orange-300' : ''
                              }`}>
                                <SelectValue placeholder="未分類" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">未分類</SelectItem>
                                {DEFAULT_CATEGORIES.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`p-3 text-right text-sm font-medium ${
                            isExcluded ? 'line-through' : ''
                          } ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">{tx.description || tx.detail || ''}</td>
                          <td className="p-3 text-sm text-gray-600">{tx.memo || ''}</td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={!isExcluded}
                              onCheckedChange={(checked) => handleExcludeToggle(tx.id, !checked)}
                              title={isExcluded ? '集計対象外' : '集計対象'}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button 
                                type="button"
                                onClick={() => openRuleModal(tx)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                ルール作成
                              </Button>
                              {(editedCategories[tx.id] || excludedFromTotals[tx.id] !== undefined) && (
                                <Button 
                                  type="button"
                                  onClick={() => {
                                    const updatedTxs = state.transactions.map(t => {
                                      if (t.id === tx.id) {
                                        let updated = { ...t };
                                        if (editedCategories[tx.id] !== undefined) {
                                          updated.category = editedCategories[tx.id];
                                        }
                                        if (excludedFromTotals[tx.id] !== undefined) {
                                          updated.excludeFromTotals = excludedFromTotals[tx.id];
                                        }
                                        return updated;
                                      }
                                      return t;
                                    });
                                    dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
                                    setEditedCategories(prev => {
                                      const newState = { ...prev };
                                      delete newState[tx.id];
                                      return newState;
                                    });
                                    setExcludedFromTotals(prev => {
                                      const newState = { ...prev };
                                      delete newState[tx.id];
                                      return newState;
                                    });
                                  }}
                                  variant="default"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  データ反映
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const pageNum = i + 1;
                if (totalPages <= 10) {
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="min-w-[32px]"
                    >
                      {pageNum}
                    </Button>
                  );
                }
                // 省略表示のロジック（簡略化）
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="min-w-[32px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-gray-500 ml-2">
                {page} / {totalPages} ページ
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ルール作成モーダル */}
      {showRuleModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowRuleModal(false)}
        >
          <Card className="w-full max-w-md mx-4 max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                分類ルール作成
              </CardTitle>
            </CardHeader>
            <CardContent onClick={e => e.stopPropagation()}>
              {selectedTx && (
                <Card className="mb-4 bg-gray-50">
                  <CardContent className="p-3">
                    <div className="text-sm font-medium mb-2">対象明細:</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>日付: {selectedTx.date}</div>
                      <div>内容: {selectedTx.description || selectedTx.detail || ''}</div>
                      <div>金額: {selectedTx.amount.toLocaleString()}円</div>
                      <div>現在のカテゴリ: 
                        <Badge variant="outline" className="ml-1">
                          {selectedTx.category || '未分類'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="pattern-input">パターン</Label>
                  <Input
                    id="pattern-input"
                    type="text"
                    value={newRule.pattern}
                    onChange={e => setNewRule(r => ({ ...r, pattern: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="mode-select">マッチング方法</Label>
                  <Select value={newRule.mode} onValueChange={value => setNewRule(r => ({ ...r, mode: value }))}>
                    <SelectTrigger id="mode-select" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">部分一致</SelectItem>
                      <SelectItem value="regex">正規表現</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="target-select">対象フィールド</Label>
                  <Select value={newRule.target} onValueChange={value => setNewRule(r => ({ ...r, target: value }))}>
                    <SelectTrigger id="target-select" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="description">説明</SelectItem>
                      <SelectItem value="detail">詳細</SelectItem>
                      <SelectItem value="memo">メモ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category-select">カテゴリ</Label>
                  <Select value={newRule.category} onValueChange={value => setNewRule(r => ({ ...r, category: value }))}>
                    <SelectTrigger id="category-select" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="kind-select">適用対象</Label>
                  <Select value={newRule.kind} onValueChange={value => setNewRule(r => ({ ...r, kind: value }))}>
                    <SelectTrigger id="kind-select" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">両方</SelectItem>
                      <SelectItem value="expense">支出のみ</SelectItem>
                      <SelectItem value="income">収入のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button 
                    onClick={applyRuleToTransaction}
                    variant="outline"
                    className="flex-1"
                  >
                    この明細のみ変更
                  </Button>
                  <Button 
                    onClick={saveRule}
                    className="flex-1"
                  >
                    ルールを保存
                  </Button>
                  <Button 
                    onClick={() => setShowRuleModal(false)}
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}