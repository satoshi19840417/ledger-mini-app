import { useMemo } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import BarByMonth from '../BarByMonth.jsx';
import AmountVisual from '../components/ui/AmountVisual.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, PieChart, BarChart3 } from 'lucide-react';

export default function Yearly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
  filterMode,
}) {
  // 年別の集計
  const yearlyStats = useMemo(() => {
    const stats = {};
    transactions.forEach(tx => {
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
  }, [transactions, filterMode]);

  // 年別データの最大値を計算（棒グラフのスケールに使用）
  const maxAmount = useMemo(
    () =>
      yearlyStats.reduce(
        (max, { income, expense }) => Math.max(max, income, expense),
        0
      ),
    [yearlyStats]
  );

  const displayMax = yenUnit === 'man' ? maxAmount / 10000 : maxAmount;

  const currentYear = new Date().getFullYear().toString();
  const currentYearData = yearlyStats.find(s => s.year === currentYear);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* メインコンテンツ */}
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
                <TabsContent value="category" className="mt-4 min-h-[250px]">
                  <PieByCategory
                    transactions={transactions}
                    period={period}
                    yenUnit={yenUnit}
                    lockColors={lockColors}
                    hideOthers={hideOthers}
                    kind={kind}
                    chartHeight={isMobile ? 300 : 250}
                    radius={isMobile ? '65%' : '80%'}
                  />
                </TabsContent>
                <TabsContent value="monthly" className="mt-4">
                  <BarByMonth
                    transactions={transactions}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AmountVisual
                        amount={yenUnit === 'man' ? income / 10000 : income}
                        label={`収入${yenUnit === 'man' ? '(万円)' : ''}`}
                        isIncome={true}
                        maxAmount={displayMax}
                        showBar={true}
                      />
                      <AmountVisual
                        amount={yenUnit === 'man' ? -expense / 10000 : -expense}
                        label={`支出${yenUnit === 'man' ? '(万円)' : ''}`}
                        isIncome={false}
                        maxAmount={displayMax}
                        showBar={true}
                      />
                    </div>
                    <div className="text-sm mt-2">
                      <span className="text-muted-foreground">取引: </span>
                      <span className="font-medium">{count}件</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            </Card>
          </div>
        </div>
  );
}

