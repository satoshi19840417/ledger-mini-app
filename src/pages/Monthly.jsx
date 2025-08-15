import { useMemo, useState, useEffect } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import { DEFAULT_CATEGORIES as CATEGORIES } from '../defaultCategories.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Filter, X } from 'lucide-react';

export default function Monthly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [excludeRent, setExcludeRent] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  // カード支払い・家賃・カテゴリを除外するかどうかでフィルタリング
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (excludeCardPayments) {
      filtered = filtered.filter(
        tx => tx.category !== 'カード支払い' && tx.category !== 'カード払い'
      );
    }
    if (excludeRent) {
      filtered = filtered.filter(
        tx => tx.category !== '家賃'
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter(
        tx => tx.category === selectedCategory
      );
    }
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent, selectedCategory]);

  const months = useMemo(() => {
    void selectedCategory; // 依存配列に含めるため
    const set = new Set(
      filteredTransactions
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
  }, [months, selectedCategory]);

  const monthTxs = useMemo(
    () => {
      void selectedCategory; // 依存配列に含めるため
      return filteredTransactions.filter(
        (tx) =>
          tx.kind === kind && tx.date.slice(0, 7) === selectedMonth,
      );
    },
    [filteredTransactions, selectedMonth, kind, selectedCategory],
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">月次分析</h1>
        <Badge variant="outline" className="text-sm">
          <Calendar className="w-3 h-3 mr-1" />
          {selectedMonth || '月選択なし'}
        </Badge>
      </div>

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
              <Label htmlFor="category-select">カテゴリ</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="全カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全カテゴリー</SelectItem>
                  {CATEGORIES.map((c) => (
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
              <Label>除外設定</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-card"
                  checked={excludeCardPayments}
                  onCheckedChange={setExcludeCardPayments}
                />
                <Label
                  htmlFor="exclude-card"
                  className="text-sm font-normal cursor-pointer"
                >
                  カード支払いを除外
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-rent"
                  checked={excludeRent}
                  onCheckedChange={setExcludeRent}
                />
                <Label
                  htmlFor="exclude-rent"
                  className="text-sm font-normal cursor-pointer"
                >
                  家賃を除外
                </Label>
              </div>
            </div>

            {(excludeCardPayments || excludeRent || selectedCategory) && (
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
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
