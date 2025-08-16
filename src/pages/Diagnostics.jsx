import { useState, useEffect } from 'react';
import { useSession } from '../useSession';
import { diagnosticsService } from '../services/diagnostics';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Wifi,
  Database,
  Settings,
  Clock,
  FileSearch,
  PlayCircle,
  GitCompare,
  AlertCircle,
  FileWarning,
  Zap
} from 'lucide-react';

function Diagnostics() {
  const { session } = useSession();
  const user = session?.user;
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [updateSimResult, setUpdateSimResult] = useState(null);
  const [isUpdateSimulating, setIsUpdateSimulating] = useState(false);
  const [errorLogs, setErrorLogs] = useState([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [singleUpdateResult, setSingleUpdateResult] = useState(null);
  const [isSingleUpdateTesting, setIsSingleUpdateTesting] = useState(false);

  useEffect(() => {
    if (user) {
      runDiagnostics();
    }
    // エラーログを取得
    loadErrorLogs();
  }, [user]);

  const loadErrorLogs = () => {
    try {
      const logs = diagnosticsService.collectErrorLogs();
      setErrorLogs(logs);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    }
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics(null);
    setSimulationResult(null);
    
    try {
      const results = await diagnosticsService.runFullDiagnostics(user?.id);
      setDiagnostics(results);
    } catch (error) {
      console.error('診断エラー:', error);
      setDiagnostics({
        summary: {
          hasErrors: true,
          message: '診断の実行中にエラーが発生しました'
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runSyncSimulation = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    try {
      const results = await diagnosticsService.simulateSync(user?.id);
      setSimulationResult(results);
    } catch (error) {
      console.error('シミュレーションエラー:', error);
      setSimulationResult({
        status: 'error',
        message: 'シミュレーションの実行中にエラーが発生しました',
        error: error.message
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const runSingleUpdateTest = async () => {
    setIsSingleUpdateTesting(true);
    setSingleUpdateResult(null);
    
    try {
      const results = await diagnosticsService.testSingleUpdate(user?.id);
      setSingleUpdateResult(results);
    } catch (error) {
      console.error('単一更新テストエラー:', error);
      setSingleUpdateResult({
        status: 'error',
        message: '単一更新テストの実行中にエラーが発生しました',
        error: error.message
      });
    } finally {
      setIsSingleUpdateTesting(false);
    }
  };

  const runUpdateSimulation = async () => {
    setIsUpdateSimulating(true);
    setUpdateSimResult(null);
    
    try {
      const results = await diagnosticsService.simulateDataUpdate(user?.id);
      setUpdateSimResult(results);
    } catch (error) {
      console.error('更新シミュレーションエラー:', error);
      setUpdateSimResult({
        status: 'error',
        message: '更新シミュレーションの実行中にエラーが発生しました',
        error: error.message
      });
    } finally {
      setIsUpdateSimulating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const getSectionIcon = (section) => {
    switch (section) {
      case 'environment':
        return <Settings className="h-6 w-6" />;
      case 'network':
        return <Wifi className="h-6 w-6" />;
      case 'database':
        return <Database className="h-6 w-6" />;
      case 'unsyncedData':
        return <FileSearch className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderDiagnosticItem = (key, item) => {
    if (!item || item.status === 'checking') return null;
    
    return (
      <div key={key} className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(item.status)}
            <span className="font-medium text-gray-700">{key}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">{item.message}</p>
        {item.details && (
          <p className="text-xs text-gray-500">
            {typeof item.details === 'object' ? JSON.stringify(item.details) : item.details}
          </p>
        )}
        {item.error && (
          <p className="text-xs text-red-600">エラー: {item.error}</p>
        )}
        {item.checks && item.checks.length > 0 && (
          <div className="mt-2 space-y-1">
            {item.checks.map((check, idx) => (
              <div key={idx} className="text-xs text-gray-600 flex items-start space-x-1">
                <span className={`
                  ${check.type === 'error' ? 'text-red-500' : 
                    check.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}
                `}>•</span>
                <span>{check.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title, sectionKey, data) => {
    if (!data) return null;
    
    const isExpanded = expandedSections[sectionKey] !== false;
    const hasErrors = Object.values(data).some(item => item?.status === 'error');
    const hasWarnings = Object.values(data).some(item => item?.status === 'warning');
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {getSectionIcon(sectionKey)}
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center space-x-2">
              {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
              {!hasErrors && hasWarnings && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {!hasErrors && !hasWarnings && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-4 space-y-3">
            {Object.entries(data).map(([key, item]) => renderDiagnosticItem(key, item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">システム診断</h1>
          <p className="text-gray-600">
            データ同期の前にシステムの状態を確認します
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>診断中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>診断を実行</span>
                </>
              )}
            </button>
            
            {user && (
              <button
                onClick={runSyncSimulation}
                disabled={isSimulating}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSimulating ? (
                  <>
                    <PlayCircle className="h-5 w-5 animate-spin" />
                    <span>シミュレーション中...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5" />
                    <span>同期テスト</span>
                  </>
                )}
              </button>
            )}
            
            {user && (
              <button
                onClick={runUpdateSimulation}
                disabled={isUpdateSimulating}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdateSimulating ? (
                  <>
                    <GitCompare className="h-5 w-5 animate-spin" />
                    <span>更新チェック中...</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="h-5 w-5" />
                    <span>更新チェック</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={runSingleUpdateTest}
              disabled={isSingleUpdateTesting}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSingleUpdateTesting ? (
                <>
                  <Zap className="h-5 w-5 animate-spin" />
                  <span>テスト中...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <span>単一更新テスト</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                loadErrorLogs();
                setShowErrorLogs(!showErrorLogs);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileWarning className="h-5 w-5" />
              <span>エラーログ</span>
              {errorLogs.length > 0 && (
                <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {errorLogs.length}
                </span>
              )}
            </button>
          </div>
          
          {diagnostics?.timestamp && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>最終診断: {new Date(diagnostics.timestamp).toLocaleString('ja-JP')}</span>
            </div>
          )}
        </div>

        {diagnostics?.summary && (
          <div className={`mb-6 p-4 rounded-lg ${
            diagnostics.summary.hasErrors ? 'bg-red-50 border border-red-200' :
            diagnostics.summary.hasWarnings ? 'bg-yellow-50 border border-yellow-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center space-x-2">
              {diagnostics.summary.hasErrors ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : diagnostics.summary.hasWarnings ? (
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              <p className={`font-medium ${
                diagnostics.summary.hasErrors ? 'text-red-700' :
                diagnostics.summary.hasWarnings ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {diagnostics.summary.message}
              </p>
            </div>
          </div>
        )}

        {diagnostics && (
          <div className="space-y-4">
            {renderSection('環境設定', 'environment', diagnostics.environment)}
            {renderSection('ネットワーク', 'network', diagnostics.network)}
            {user && renderSection('データベース', 'database', diagnostics.database)}
            {renderSection('未同期データ', 'unsyncedData', diagnostics.unsyncedData)}
            
            {diagnostics.database?.counts && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">データ統計</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {diagnostics.database.counts.transactions || 0}
                    </p>
                    <p className="text-sm text-gray-600">取引</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {diagnostics.database.counts.rules || 0}
                    </p>
                    <p className="text-sm text-gray-600">ルール</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {diagnostics.database.counts.user_preferences ? 1 : 0}
                    </p>
                    <p className="text-sm text-gray-600">設定</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {diagnostics.database.counts.profiles ? 1 : 0}
                    </p>
                    <p className="text-sm text-gray-600">プロファイル</p>
                  </div>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-700">
                    データベース診断を実行するにはログインが必要です
                  </p>
                </div>
              </div>
            )}

            {/* 同期シミュレーション結果 */}
            {simulationResult && (
              <div className={`bg-white rounded-lg shadow-md p-6 ${
                simulationResult.status === 'success' ? 'border-green-200' :
                simulationResult.status === 'error' ? 'border-red-200' : 'border-yellow-200'
              }`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  同期シミュレーション結果
                </h2>
                
                <div className={`mb-4 p-3 rounded ${
                  simulationResult.status === 'success' ? 'bg-green-50 text-green-700' :
                  simulationResult.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <p className="font-medium">{simulationResult.message}</p>
                  {simulationResult.error && (
                    <p className="text-sm mt-1">エラー: {simulationResult.error}</p>
                  )}
                </div>
                
                {simulationResult.steps && simulationResult.steps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">実行ステップ:</h3>
                    {simulationResult.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {step.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        {step.status === 'info' && <AlertTriangle className="h-4 w-4 text-blue-500" />}
                        <span className="font-medium">{step.step}:</span>
                        <span className="text-gray-600">{step.message}</span>
                        {step.error && <span className="text-red-600 text-xs">({step.error})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 単一更新テスト結果 */}
            {singleUpdateResult && (
              <div className={`bg-white rounded-lg shadow-md p-6 ${
                singleUpdateResult.status === 'success' ? 'border-green-200' :
                singleUpdateResult.status === 'error' ? 'border-red-200' : 'border-yellow-200'
              }`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  単一更新テスト結果
                </h2>
                
                <div className={`mb-4 p-3 rounded ${
                  singleUpdateResult.status === 'success' ? 'bg-green-50 text-green-700' :
                  singleUpdateResult.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <p className="font-medium">{singleUpdateResult.message}</p>
                  {singleUpdateResult.error && (
                    <p className="text-sm mt-1">エラー: {singleUpdateResult.error}</p>
                  )}
                </div>
                
                {singleUpdateResult.steps && singleUpdateResult.steps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">実行ステップ:</h3>
                    {singleUpdateResult.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {step.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        {step.status === 'info' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                        <span className="font-medium">{step.step}:</span>
                        <span className="text-gray-600">{step.message}</span>
                        {step.error && <span className="text-red-600 text-xs">({step.error})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 更新シミュレーション結果 */}
            {updateSimResult && (
              <div className={`bg-white rounded-lg shadow-md p-6 ${
                updateSimResult.status === 'success' ? 'border-green-200' :
                updateSimResult.status === 'warning' ? 'border-yellow-200' :
                updateSimResult.status === 'info' ? 'border-blue-200' : 'border-red-200'
              }`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  データ更新チェック結果
                </h2>
                
                <div className={`mb-4 p-3 rounded ${
                  updateSimResult.status === 'success' ? 'bg-green-50 text-green-700' :
                  updateSimResult.status === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                  updateSimResult.status === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                }`}>
                  <p className="font-medium">{updateSimResult.message}</p>
                  {updateSimResult.error && (
                    <p className="text-sm mt-1">エラー: {updateSimResult.error}</p>
                  )}
                </div>
                
                {/* 新規レコード */}
                {updateSimResult.newRecords && updateSimResult.newRecords.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">
                      新規追加予定 ({updateSimResult.newRecords.length}件)
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto bg-green-50 p-2 rounded">
                      {updateSimResult.newRecords.slice(0, 5).map((record, idx) => (
                        <div key={idx} className="text-xs text-green-700">
                          {record.date} - {record.description} (¥{record.amount})
                        </div>
                      ))}
                      {updateSimResult.newRecords.length > 5 && (
                        <div className="text-xs text-green-600">
                          他 {updateSimResult.newRecords.length - 5} 件
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 更新予定 */}
                {updateSimResult.updates && updateSimResult.updates.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">
                      更新予定 ({updateSimResult.updates.length}件)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {updateSimResult.updates.slice(0, 5).map((update, idx) => (
                        <div key={idx} className="bg-blue-50 p-2 rounded text-xs">
                          <div className="font-medium text-blue-700">
                            {update.date} - {update.description}
                          </div>
                          <div className="text-blue-600 mt-1">
                            {update.changes.map((change, i) => (
                              <span key={i} className="inline-block mr-2">• {change}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {updateSimResult.updates.length > 5 && (
                        <div className="text-xs text-blue-600 text-center">
                          他 {updateSimResult.updates.length - 5} 件の更新
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 競合 */}
                {updateSimResult.conflicts && updateSimResult.conflicts.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-red-600 mb-2">
                      ⚠️ 競合検出 ({updateSimResult.conflicts.length}件)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {updateSimResult.conflicts.map((conflict, idx) => (
                        <div key={idx} className="bg-red-50 p-2 rounded text-xs border-l-4 border-red-400">
                          <div className="font-medium text-red-700">
                            {conflict.date} - {conflict.description}
                          </div>
                          <div className="text-red-600 mt-1">
                            {conflict.message}
                          </div>
                          <div className="text-red-500 text-xs mt-1">
                            サーバー更新: {new Date(conflict.serverUpdatedAt).toLocaleString('ja-JP')}
                            <br />
                            ローカル更新: {new Date(conflict.localUpdatedAt).toLocaleString('ja-JP')}
                          </div>
                          <div className="text-red-600 mt-1">
                            変更内容:
                            {conflict.changes.map((change, i) => (
                              <span key={i} className="block ml-2">• {change}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* エラーログ表示 */}
            {showErrorLogs && (
              <div className="bg-white rounded-lg shadow-md p-6 border-red-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-red-500" />
                  エラーログ履歴
                  <button
                    onClick={() => {
                      localStorage.removeItem('errorLogs');
                      setErrorLogs([]);
                    }}
                    className="ml-auto text-sm text-red-600 hover:text-red-700"
                  >
                    クリア
                  </button>
                </h2>
                
                {errorLogs.length === 0 ? (
                  <p className="text-gray-500">エラーログはありません</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {errorLogs.slice(-10).reverse().map((log, idx) => (
                      <div key={idx} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('ja-JP')}
                            </div>
                            <div className="text-sm text-red-700 font-mono mt-1">
                              {log.message || log.error?.message}
                            </div>
                            {log.context && (
                              <div className="text-xs text-gray-600 mt-1">
                                Context: {JSON.stringify(log.context)}
                              </div>
                            )}
                            {log.url && (
                              <div className="text-xs text-gray-500 mt-1">
                                URL: {log.url}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* データ検証の詳細 */}
            {diagnostics?.unsyncedData?.dataValidation?.issues && 
             diagnostics.unsyncedData.dataValidation.issues.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-yellow-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  データ検証の問題 ({diagnostics.unsyncedData.dataValidation.issues.length}件)
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {diagnostics.unsyncedData.dataValidation.issues.slice(0, 10).map((issue, idx) => (
                    <div key={idx} className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50">
                      <div className="text-sm font-medium text-gray-700">
                        {issue.type === 'transaction' ? '取引' : 'ルール'} #{issue.index + 1}
                        {issue.date && ` (${issue.date})`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {issue.description || issue.pattern}
                      </div>
                      <div className="mt-1">
                        {issue.issues.map((msg, i) => (
                          <span key={i} className="inline-block text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded mr-1 mt-1">
                            {msg}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {diagnostics.unsyncedData.dataValidation.issues.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      他 {diagnostics.unsyncedData.dataValidation.issues.length - 10} 件の問題があります
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Diagnostics;