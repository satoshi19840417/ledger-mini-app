import { useState, useEffect, useRef } from 'react';
import { useStore } from '../state/StoreContextWithDB';
import { parseCsvFiles, normalizeDate } from '../utils/csv.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export default function ImportCsv() {
  const { state, dispatch } = useStore();
  const [append, setAppend] = useState(true);
  const [preview, setPreview] = useState([]);
  const [headerMap, setHeaderMap] = useState({});
  const [errors, setErrors] = useState([]);
  const [importInfo, setImportInfo] = useState(null);
  const [autoDetectCardPayments, setAutoDetectCardPayments] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (state.lastImportInfo) {
      setImportInfo(state.lastImportInfo);
      const timer = setTimeout(() => setImportInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.lastImportInfo]);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    setUploadProgress(20);
    
    try {
      const {
        transactions,
        headerMap: map,
        errors: errs,
      } = await parseCsvFiles(files);
      
      setUploadProgress(60);
      
      // カード引き落としの自動判定
      const processedTransactions = autoDetectCardPayments
        ? detectCardPayments(transactions)
        : transactions;

      // 日付範囲でフィルタ
      const filteredTransactions = processedTransactions.filter((tx) => {
        const txDate = normalizeDate(tx.date);
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
        return true;
      });

      setUploadProgress(80);

      setPreview(filteredTransactions);
      setHeaderMap(map);
      setErrors(errs);

      if (filteredTransactions.length > 0) {
        dispatch({
          type: 'importTransactions',
          payload: filteredTransactions,
          append,
        });
        dispatch({ type: 'applyRules' });
      }
      
      setUploadProgress(100);
    } catch (error) {
      setErrors([`処理中にエラーが発生しました: ${error.message}`]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }

  async function handleChange(e) {
    const files = e.target.files;
    await handleFiles(files);
    e.target.value = '';
  }

  // ドラッグ&ドロップ処理
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragOver(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    await handleFiles(files);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  // カード引き落としパターンを検出してカテゴリを設定
  function detectCardPayments(transactions) {
    const cardPatterns = [
      /カード.*引.*落/i,
      /クレジット.*引.*落/i,
      /VISA.*引.*落/i,
      /JCB.*引.*落/i,
      /AMEX.*引.*落/i,
      /マスターカード/i,
      /楽天カード/i,
      /イオンカード/i,
      /セゾンカード/i,
      /三井住友カード/i,
      /UCカード/i,
      /DCカード/i,
      /ニコスカード/i,
      /オリコカード/i,
      /ジャックスカード/i,
      /エポスカード/i,
      /ビューカード/i,
      /ダイナースカード/i,
      /カード.*支払/i,
      /カード.*決済/i,
    ];
    
    return transactions.map(tx => {
      const searchText = [
        tx.description,
        tx.detail,
        tx.memo
      ].filter(Boolean).join(' ');
      
      const isCardPayment = cardPatterns.some(pattern => 
        pattern.test(searchText)
      );
      
      if (isCardPayment && tx.amount < 0) {
        return { ...tx, category: 'カード支払い' };
      }
      return tx;
    });
  }

  const KNOWN_FIELDS = [
    'date',
    'description',
    'detail',
    'memo',
    'amount',
    'category',
    'kind',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">CSV取込</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            ファイルアップロード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ドラッグ&ドロップエリア */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">ファイルをドラッグ&ドロップ</h3>
                <p className="text-sm text-muted-foreground">
                  CSV、Excel ファイルをここにドロップするか、ボタンでファイルを選択してください
                </p>
              </div>
              <Button onClick={handleUploadClick} className="gap-2">
                <FileText className="h-4 w-4" />
                ファイルを選択
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".csv,.xlsx,.xls"
            />
          </div>

          {/* アップロード進行状況 */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">処理中...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* 設定オプション */}
          <div className="space-y-4">
            <h3 className="font-semibold">インポート設定</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="append"
                  checked={append}
                  onCheckedChange={setAppend}
                />
                <Label htmlFor="append" className="text-sm">
                  既存の取引に追加する
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoDetect"
                  checked={autoDetectCardPayments}
                  onCheckedChange={setAutoDetectCardPayments}
                />
                <Label htmlFor="autoDetect" className="text-sm">
                  カード引き落としを自動判定して「カード支払い」カテゴリに分類
                </Label>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="startDate" className="text-sm">
                  開始日
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
                <Label htmlFor="endDate" className="text-sm">
                  終了日
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* プレビューとエラー表示 */}
      {(preview.length > 0 || errors.length > 0) && (
        <div className="space-y-4">
          {/* フィールドマッピング情報 */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  インポート成功
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f} ↔ {headerMap[f]}
                    </Badge>
                  ))}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse text-left">
                    <thead>
                      <tr className="border-b">
                        {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                          <th key={f} className="px-4 py-2 text-left font-medium">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((tx, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          {KNOWN_FIELDS.filter((f) => headerMap[f]).map((f) => (
                            <td key={f} className="px-4 py-2">
                              {tx[f] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {preview.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    最初の5件を表示中（全{preview.length}件）
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* エラー表示 */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">インポート中にエラーが発生しました:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* インポート結果通知 */}
          {importInfo && append && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">インポート完了</p>
                    <p className="text-sm">
                      {importInfo.totalCount}件中 {importInfo.importedCount}件を追加
                      {importInfo.duplicateCount > 0 && (
                        <span className="text-orange-600 ml-2">
                          ({importInfo.duplicateCount}件の重複をスキップ)
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Download className="h-3 w-3 mr-1" />
                    完了
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
