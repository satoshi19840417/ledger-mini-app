import { useEffect, useState, useRef } from 'react';
import { useStore } from '../state/StoreContextWithDB';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Download, 
  Upload,
  Trash2,
  Filter,
  JapaneseYen,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';

export default function Prefs() {
  const init = {
    period: localStorage.getItem('period') || '3m',
    yenUnit: localStorage.getItem('yenUnit') || 'yen',
    kind: localStorage.getItem('kind') || 'expense',
    filterMode: (() => {
      const stored = JSON.parse(localStorage.getItem('filterMode') || '{}');
      return { others: stored.others || 'include' };
    })(),
  };

  const [period, setPeriod] = useState(init.period);
  const [yenUnit, setYenUnit] = useState(init.yenUnit);
  const [kind, setKind] = useState(init.kind);
  const [filterMode, setFilterMode] = useState(init.filterMode);

  const { state, dispatch } = useStore();
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const data = JSON.stringify(
      { transactions: state.transactions, rules: state.rules },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.transactions) {
        dispatch({
          type: 'importTransactions',
          payload: json.transactions,
          append: false,
        });
      }
      if (json.rules) {
        dispatch({ type: 'setRules', payload: json.rules });
      }
      alert('データをインポートしました');
    } catch (err) {
      console.error('Import failed', err);
      alert('インポートに失敗しました');
    }
    e.target.value = '';
  };

  const handleClear = () => {
    if (window.confirm('本当に全データを削除しますか？この操作は取り消せません。')) {
      dispatch({ type: 'clearAll' });
      alert('全データを削除しました');
    }
  };

  useEffect(() => {
    localStorage.setItem('period', period);
    localStorage.setItem('yenUnit', yenUnit);
    localStorage.setItem('kind', kind);
    localStorage.setItem('filterMode', JSON.stringify(filterMode));

    const params = new URLSearchParams();
    params.set('period', period);
    params.set('unit', yenUnit);
    params.set('kind', kind);
    window.location.hash = `prefs?${params.toString()}`;
  }, [period, yenUnit, kind, filterMode]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          設定
        </h1>
        <p className="text-muted-foreground mt-2">
          アプリケーション全体の表示設定とデータ管理
        </p>
      </div>

      <div className="space-y-6">
        {/* 表示設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">表示設定</CardTitle>
            <CardDescription>
              ダッシュボードや分析ページの表示をカスタマイズ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 表示期間 */}
            <div className="space-y-2">
              <Label htmlFor="period">表示期間</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">最近3ヶ月</SelectItem>
                  <SelectItem value="6m">半年</SelectItem>
                  <SelectItem value="1y">1年</SelectItem>
                  <SelectItem value="all">全期間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 金額単位 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">金額単位</Label>
              <div className="flex gap-2">
                <Button
                  variant={yenUnit === 'yen' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYenUnit('yen')}
                  className={`flex-1 ${yenUnit === 'yen' ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : ''}`}
                >
                  <JapaneseYen className="w-4 h-4 mr-2" />
                  円表示
                </Button>
                <Button
                  variant={yenUnit === 'man' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYenUnit('man')}
                  className={`flex-1 ${yenUnit === 'man' ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : ''}`}
                >
                  <JapaneseYen className="w-4 h-4 mr-2" />
                  万円表示
                </Button>
              </div>
            </div>

            {/* 表示モード（収入/支出） */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">デフォルト表示モード</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={kind === 'expense' ? 'default' : 'outline'}
                  onClick={() => setKind('expense')}
                  className={kind === 'expense' 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                    : 'border-gray-300 hover:bg-red-50 hover:border-red-300'}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  支出
                </Button>
                <Button
                  variant={kind === 'income' ? 'default' : 'outline'}
                  onClick={() => setKind('income')}
                  className={kind === 'income' 
                    ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                    : 'border-gray-300 hover:bg-green-50 hover:border-green-300'}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  収入
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フィルター設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              デフォルトフィルター設定
            </CardTitle>
            <CardDescription>
              データ表示時のデフォルトフィルター設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* その他フィルター */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">その他カテゴリ</Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  size="sm"
                  variant={filterMode.others === 'include' ? 'default' : 'outline'}
                  onClick={() => setFilterMode(prev => ({ ...prev, others: 'include' }))}
                  className={`text-xs ${
                    filterMode.others === 'include' 
                      ? kind === 'expense' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                      : ''
                  }`}
                >
                  含む
                </Button>
                <Button
                  size="sm"
                  variant={filterMode.others === 'exclude' ? 'default' : 'outline'}
                  onClick={() => setFilterMode(prev => ({ ...prev, others: 'exclude' }))}
                  className={`text-xs ${
                    filterMode.others === 'exclude' 
                      ? 'bg-gray-500 hover:bg-gray-600 text-white'
                      : ''
                  }`}
                >
                  除外
                </Button>
                <Button
                  size="sm"
                  variant={filterMode.others === 'only' ? 'default' : 'outline'}
                  onClick={() => setFilterMode(prev => ({ ...prev, others: 'only' }))}
                  className={`text-xs ${
                    filterMode.others === 'only' 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : ''
                  }`}
                >
                  のみ
                </Button>
              </div>
            </div>
            
            {/* 現在の設定サマリー */}
            <div className="pt-3 border-t">
              <div className="flex flex-wrap gap-2">
                {filterMode.others === 'exclude' && (
                  <Badge variant="destructive" className="text-xs bg-gray-500">
                    その他除外
                  </Badge>
                )}
                {filterMode.others === 'only' && (
                  <Badge className="text-xs bg-blue-500 text-white">
                    その他のみ
                  </Badge>
                )}
                {filterMode.others === 'include' && (
                  <span className="text-xs text-muted-foreground">デフォルト設定</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* データ管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">データ管理</CardTitle>
            <CardDescription>
              データのエクスポート・インポート・削除
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleExport}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              データをエクスポート（JSON形式）
            </Button>
            
            <Button 
              onClick={handleImportClick}
              variant="outline"
              className="w-full justify-start"
            >
              <Upload className="w-4 h-4 mr-2" />
              データをインポート（JSON形式）
            </Button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            
            <div className="pt-4 border-t">
              <Button 
                onClick={handleClear}
                variant="destructive"
                className="w-full justify-start"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                全データを削除
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                ※この操作は取り消せません。事前にエクスポートすることをお勧めします。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}