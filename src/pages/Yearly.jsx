import { useMemo, useState } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import BarByMonth from '../BarByMonth.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Calendar, PieChart, BarChart3, Filter } from 'lucide-react';

export default function Yearly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [excludeRent, setExcludeRent] = useState(false);

  // カード支払いと家賃を除外するかどうかでフィルタリング
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
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent]);

  // 年別の集計
  const yearlyStats = useMemo(() => {
    const stats = {};
    filteredTransactions.forEach(tx => {
      const year = tx.date.slice(0, 4);
      if (!stats[year]) {
        stats[year] = { income: 0, expense: 0, count: 0 };
      }
      if (tx.kind === 'income') {
        stats[year].income += tx.amount;
      } else {
        stats[year].expense += Math.abs(tx.amount);
      }
      stats[year].count++;
    });
    return Object.entries(stats)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, data]) => ({
        year,
        ...data,
        balance: data.income - data.expense
      }));
  }, [filteredTransactions]);

  const currentYear = new Date().getFullYear().toString();
  const currentYearData = yearlyStats.find(s => s.year === currentYear);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* フィルター設定 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              フィルター設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-card-yearly"
                checked={excludeCardPayments}
                onCheckedChange={setExcludeCardPayments}
              />
              <Label
                htmlFor="exclude-card-yearly"
                className="text-sm font-normal cursor-pointer"
              >
                カード支払いを除外
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-rent-yearly"
                checked={excludeRent}
                onCheckedChange={setExcludeRent}
              />
              <Label
                htmlFor="exclude-rent-yearly"
                className="text-sm font-normal cursor-pointer"
              >
                家賃を除外
              </Label>
            </div>
            {(excludeCardPayments || excludeRent) && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  フィルター適用中: {filteredTransactions.length}件
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* メインコンテンツ */}
        <div className="lg:col-span-9 space-y-6">
          {/* 今年のサマリー */}
          {currentYearData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{currentYear}年のサマリー</span>
                  <Badge variant={currentYearData.balance >= 0 ? 'default' : 'destructive'}>
                    {currentYearData.balance >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    収支: ¥{currentYearData.balance.toLocaleString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">収入</p>
                    <p className="text-2xl font-bold text-green-600">
                      ¥{currentYearData.income.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">支出</p>
                    <p className="text-2xl font-bold text-red-600">
                      ¥{currentYearData.expense.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">取引数</p>
                    <p className="text-2xl font-bold">
                      {currentYearData.count.toLocaleString()}件
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* タブ形式のグラフ表示 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">年間分析</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="category" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="category" className="flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    カテゴリ別
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    月次推移
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="category" className="mt-4">
                  <PieByCategory
                    transactions={filteredTransactions}
                    period={period}
                    yenUnit={yenUnit}
                    lockColors={lockColors}
                    hideOthers={hideOthers}
                    kind={kind}
                  />
                </TabsContent>
                <TabsContent value="monthly" className="mt-4">
                  <BarByMonth
                    transactions={filteredTransactions}
                    period={period}
                    yenUnit={yenUnit}
                    lockColors={lockColors}
                    hideOthers={hideOthers}
                    kind={kind}
                    height={350}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 年別比較 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">年別比較</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {yearlyStats.map(({ year, income, expense, balance, count }) => (
                  <div key={year} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{year}年</span>
                      <Badge variant={balance >= 0 ? 'default' : 'destructive'}>
                        収支: ¥{balance.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">収入: </span>
                        <span className="font-medium text-green-600">
                          ¥{income.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">支出: </span>
                        <span className="font-medium text-red-600">
                          ¥{expense.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">取引: </span>
                        <span className="font-medium">{count}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}