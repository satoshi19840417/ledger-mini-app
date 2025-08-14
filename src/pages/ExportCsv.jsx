import { useState } from 'react';
import { useStore } from '../state/StoreContextWithDB';
import { 
  transactionsToCSV, 
  rulesToCSV, 
  downloadCSV, 
  filterTransactionsByPeriod,
  getCurrentDateString 
} from '../utils/export';

export default function ExportCsv() {
  const { state } = useStore();
  const [exportType, setExportType] = useState('all'); // all, period, month, year
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [includeRules, setIncludeRules] = useState(false);

  // 月の選択肢を生成
  const generateMonthOptions = () => {
    const months = [];
    const transactions = state.transactions || [];
    
    if (transactions.length > 0) {
      const dates = transactions.map(tx => tx.date || tx.occurred_on).filter(Boolean);
      const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
      const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);
      
      const start = new Date(minDate);
      const end = new Date(maxDate);
      
      for (let d = new Date(end); d >= start; d.setMonth(d.getMonth() - 1)) {
        const yearMonth = d.toISOString().slice(0, 7);
        months.push(yearMonth);
      }
    }
    
    return months;
  };

  // 年の選択肢を生成
  const generateYearOptions = () => {
    const years = new Set();
    const transactions = state.transactions || [];
    
    transactions.forEach(tx => {
      const date = tx.date || tx.occurred_on;
      if (date) {
        years.add(date.slice(0, 4));
      }
    });
    
    return Array.from(years).sort().reverse();
  };

  // エクスポート実行
  const handleExport = () => {
    let transactionsToExport = state.transactions || [];
    let filename = `家計簿_${getCurrentDateString()}`;

    // 期間でフィルタリング
    switch (exportType) {
      case 'period':
        if (startDate || endDate) {
          transactionsToExport = filterTransactionsByPeriod(
            transactionsToExport,
            startDate,
            endDate
          );
          filename = `家計簿_${startDate || '開始'}_${endDate || '終了'}`;
        }
        break;
      
      case 'month':
        transactionsToExport = transactionsToExport.filter(tx => {
          const date = tx.date || tx.occurred_on;
          return date && date.startsWith(selectedMonth);
        });
        filename = `家計簿_${selectedMonth.replace('-', '年')}月`;
        break;
      
      case 'year':
        transactionsToExport = transactionsToExport.filter(tx => {
          const date = tx.date || tx.occurred_on;
          return date && date.startsWith(selectedYear);
        });
        filename = `家計簿_${selectedYear}年`;
        break;
    }

    // CSVを生成してダウンロード
    const csvContent = transactionsToCSV(transactionsToExport);
    if (csvContent) {
      downloadCSV(csvContent, `${filename}.csv`);
    }

    // ルールもエクスポート
    if (includeRules && state.rules && state.rules.length > 0) {
      const rulesCsv = rulesToCSV(state.rules);
      if (rulesCsv) {
        downloadCSV(rulesCsv, `ルール_${getCurrentDateString()}.csv`);
      }
    }
  };

  const transactionCount = state.transactions?.length || 0;
  const ruleCount = state.rules?.length || 0;

  return (
    <section>
      <div className="card">
        <h2 className="text-xl font-bold mb-4">データエクスポート</h2>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            現在のデータ: {transactionCount}件の取引, {ruleCount}件のルール
          </p>
        </div>

        {/* エクスポート範囲の選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">エクスポート範囲</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={exportType === 'all'}
                onChange={(e) => setExportType(e.target.value)}
                className="mr-2"
              />
              <span>すべての取引</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="period"
                checked={exportType === 'period'}
                onChange={(e) => setExportType(e.target.value)}
                className="mr-2"
              />
              <span>期間を指定</span>
            </label>
            
            {exportType === 'period' && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="text-sm">開始日:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="ml-2 px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm">終了日:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ml-2 px-2 py-1 border rounded"
                  />
                </div>
              </div>
            )}
            
            <label className="flex items-center">
              <input
                type="radio"
                value="month"
                checked={exportType === 'month'}
                onChange={(e) => setExportType(e.target.value)}
                className="mr-2"
              />
              <span>月を指定</span>
            </label>
            
            {exportType === 'month' && (
              <div className="ml-6">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 border rounded"
                >
                  {generateMonthOptions().map(month => (
                    <option key={month} value={month}>
                      {month.replace('-', '年')}月
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <label className="flex items-center">
              <input
                type="radio"
                value="year"
                checked={exportType === 'year'}
                onChange={(e) => setExportType(e.target.value)}
                className="mr-2"
              />
              <span>年を指定</span>
            </label>
            
            {exportType === 'year' && (
              <div className="ml-6">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2 py-1 border rounded"
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ルールのエクスポート */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeRules}
              onChange={(e) => setIncludeRules(e.target.checked)}
              className="mr-2"
            />
            <span>ルールも一緒にエクスポート</span>
          </label>
        </div>

        {/* エクスポートボタン */}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={transactionCount === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            CSVダウンロード
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">エクスポートについて</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• UTF-8（BOM付き）でエンコードされるため、Excelで直接開けます</li>
            <li>• 日付、金額、カテゴリ、説明などすべての情報が含まれます</li>
            <li>• ルールをエクスポートすると、別ファイルとして保存されます</li>
            <li>• エクスポートしたファイルは「CSV取込」から再インポート可能です</li>
          </ul>
        </div>
      </div>
    </section>
  );
}