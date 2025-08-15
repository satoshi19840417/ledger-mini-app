import { useMemo, useState, useEffect } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import BarByCategory from '../BarByCategory.jsx';
import { useStore } from '../state/StoreContextWithDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Filter, X, JapaneseYen, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../utils/currency.js';

export default function Monthly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
  filterMode,
  onFilterModeChange,
}) {
  const { state } = useStore();
  const categories = state.categories;
  const [selectedCategory, setSelectedCategory] = useState('');
  const [comparePeriod, setComparePeriod] = useState('3m');
  
  // フィルタリング処理
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // その他フィルター
    if (filterMode.others === 'exclude') {
      filtered = filtered.filter(tx => tx.category !== 'その他');
    } else if (filterMode.others === 'only') {
      filtered = filtered.filter(tx => tx.category === 'その他');
    }

    return filtered;
  }, [transactions, filterMode]);

  const months = useMemo(() => {
    const txs = selectedCategory
      ? filteredTransactions.filter((tx) => tx.category === selectedCategory)
      : filteredTransactions;
    const set = new Set(
      txs
        .filter((tx) => tx.kind === kind)
        .map((tx) => tx.date.slice(0, 7)),
    );
    return Array.from(set).sort();
  }, [filteredTransactions, kind, selectedCategory]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[months.length - 1] || '',
  );

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months]);

  const monthTxs = useMemo(
    () => {
      let txs = filteredTransactions.filter(
        (tx) => tx.kind === kind && tx.date.slice(0, 7) === selectedMonth,
      );
      if (selectedCategory) {
        txs = txs.filter((tx) => tx.category === selectedCategory);
      }
      return txs;
    },
    [filteredTransactions, selectedMonth, kind, selectedCategory],
  );

  // 月の合計金額を計算
  const monthTotal = useMemo(() => {
    return monthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [monthTxs]);

  // 日別の集計データを作成
  const dailyData = useMemo(() => {
    void selectedCategory; // 依存配列に含めるため
    if (!selectedMonth) return [];

    const dailyMap = {};
    monthTxs.forEach((tx) => {
      const day = tx.date.slice(8, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { day: parseInt(day), amount: 0, count: 0, transactions: [] };
      }
      dailyMap[day].amount += Math.abs(tx.amount);
      dailyMap[day].count += 1;
      dailyMap[day].transactions.push(tx);
    });
    
    // 月の日数を取得
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 全日付のデータを作成（取引がない日は0）
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      data.push({
        day,
        amount: dailyMap[dayStr]?.amount || 0,
        count: dailyMap[dayStr]?.count || 0,
        transactions: dailyMap[dayStr]?.transactions || []
      });
    }
    
    return data;
  }, [selectedMonth, selectedCategory, monthTxs]);

  // カテゴリ別の詳細データ
  const categoryDetails = useMemo(() => {
    const categoryMap = {};
    monthTxs.forEach((tx) => {
      const cat = tx.category || 'その他';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, count: 0, transactions: [] };
      }
      categoryMap[cat].amount += Math.abs(tx.amount);
      categoryMap[cat].count += 1;
      categoryMap[cat].transactions.push(tx);
    });

    return Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTxs]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* フィルター設定カード */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              フィルター設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {months.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="month-select">月選択</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-select">
                    <SelectValue placeholder="月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="compare-period">比較期間</Label>
              <Select value={comparePeriod} onValueChange={setComparePeriod}>
                <SelectTrigger id="compare-period">
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">直近3ヶ月</SelectItem>
                  <SelectItem value="6m">直近6ヶ月</SelectItem>
                  <SelectItem value="1y">直近1年</SelectItem>
                  <SelectItem value="all">全期間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-select">カテゴリ</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="全カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全カテゴリー</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                  className="w-full justify-start"
                >
                  <X className="w-3 h-3 mr-2" />
                  フィルターをクリア
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">フィルター設定</Label>

              {/* その他フィルター */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">その他</Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    size="sm"
                    variant={filterMode.others === 'include' ? 'default' : 'outline'}
                    onClick={() => onFilterModeChange({ ...filterMode, others: 'include' })}
                    className="text-xs"
                  >
                    含む
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode.others === 'exclude' ? 'default' : 'outline'}
                    onClick={() => onFilterModeChange({ ...filterMode, others: 'exclude' })}
                    className="text-xs"
                  >
                    除外
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode.others === 'only' ? 'default' : 'outline'}
                    onClick={() => onFilterModeChange({ ...filterMode, others: 'only' })}
                    className="text-xs"
                  >
                    のみ
                  </Button>
                </div>
              </div>
            </div>

            {(filterMode.others !== 'include' || selectedCategory) && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  フィルター適用中: {filteredTransactions.length}件
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* グラフ表示エリア */}
        <div className="lg:col-span-8 space-y-6">
          {/* カテゴリー別内訳 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>
                  {selectedMonth ? `${selectedMonth} カテゴリー別内訳` : 'カテゴリー別内訳'}
                </span>
                {monthTxs.length > 0 && (
                  <Badge variant={kind === 'expense' ? 'destructive' : 'default'}>
                    {kind === 'expense' ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    )}
                    {monthTxs.length}件
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PieByCategory
                transactions={monthTxs}
                period="all"
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
                chartHeight={isMobile ? 300 : 250}
                radius={isMobile ? '65%' : '80%'}
              />
            </CardContent>
          </Card>

          {/* カテゴリ比較 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                カテゴリ比較
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarByCategory
                transactions={filteredTransactions}
                period={comparePeriod}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
              />
            </CardContent>
          </Card>

          {/* 月次サマリー */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <JapaneseYen className="w-4 h-4" />
                月次サマリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">合計金額</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(monthTotal, yenUnit)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">取引件数</p>
                  <p className="text-2xl font-bold">
                    {monthTxs.length} 件
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">平均金額</p>
                  <p className="text-2xl font-bold">
                    {monthTxs.length > 0 
                      ? formatAmount(Math.round(monthTotal / monthTxs.length), yenUnit)
                      : '¥0'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日別推移グラフ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                日別推移
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData} key={selectedCategory || 'all'}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}日`}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => yenUnit === 'man' ? `${(value/10000).toFixed(1)}万` : value.toLocaleString()}
                  />
                  <Tooltip 
                    formatter={(value) => formatAmount(value, yenUnit)}
                    labelFormatter={(label) => `${selectedMonth}-${String(label).padStart(2, '0')}`}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill={kind === 'expense' ? '#ef4444' : '#10b981'}
                    onClick={(data) => {
                      setSelectedDay(data.day);
                      setShowDetails(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* カテゴリ別詳細 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                カテゴリ別詳細
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    データがありません
                  </p>
                ) : (
                  categoryDetails.slice(0, 10).map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{cat.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat.count} 件
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatAmount(cat.amount, yenUnit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((cat.amount / monthTotal) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 取引リスト */}
          {showDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {selectedDay ? `${selectedMonth}-${String(selectedDay).padStart(2, '0')}の取引` : '全取引'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDay(null);
                      setShowDetails(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">日付</th>
                        <th className="text-left p-2 text-sm font-medium">カテゴリ</th>
                        <th className="text-left p-2 text-sm font-medium">内容</th>
                        <th className="text-right p-2 text-sm font-medium">金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDay 
                        ? dailyData.find(d => d.day === selectedDay)?.transactions || []
                        : monthTxs
                      ).slice(0, 20).map((tx, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 text-sm">{tx.date}</td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {tx.category || 'その他'}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {tx.description || tx.detail || '-'}
                          </td>
                          <td className="p-2 text-sm text-right font-medium">
                            {formatAmount(Math.abs(tx.amount), yenUnit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {monthTxs.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      他 {monthTxs.length - 20} 件の取引があります
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
