-- Supabase データベース構造確認スクリプト（読み取り専用）
-- このスクリプトは現在の状態を確認するだけで、変更は行いません

-- 1. テーブルの存在確認
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 存在'
    ELSE '❌ 存在しない'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'transactions', 'rules', 'user_preferences');

-- 2. transactionsテーブルの必須カラム確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'user_id', 'date', 'amount', 'kind') THEN '必須'
    WHEN column_name IN ('occurred_on', 'exclude_from_totals', 'hash') THEN '推奨'
    ELSE 'オプション'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
ORDER BY 
  CASE 
    WHEN column_name IN ('id', 'user_id', 'date', 'amount') THEN 1
    WHEN column_name IN ('occurred_on', 'exclude_from_totals', 'hash') THEN 2
    ELSE 3
  END,
  column_name;

-- 3. 不足しているカラムの確認
WITH required_columns AS (
  SELECT 'occurred_on' as column_name
  UNION ALL SELECT 'exclude_from_totals'
  UNION ALL SELECT 'hash'
)
SELECT 
  rc.column_name,
  CASE 
    WHEN c.column_name IS NULL THEN '❌ 不足 - 追加が必要'
    ELSE '✅ 存在'
  END as status
FROM required_columns rc
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name = 'transactions'
  AND c.column_name = rc.column_name;

-- 4. RLSの有効化状態確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ 有効'
    ELSE '❌ 無効'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'transactions', 'rules', 'user_preferences');

-- 5. RLSポリシーの確認
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ 設定済み'
    ELSE '❌ 未設定'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'transactions', 'rules', 'user_preferences')
ORDER BY tablename, cmd;

-- 6. 推奨される修正コマンド（実行はしません、表示のみ）
SELECT '-- 以下のコマンドを実行して不足しているカラムを追加してください：' as recommendation;

SELECT 
  '-- ALTER TABLE transactions ADD COLUMN ' || rc.column_name || 
  CASE rc.column_name
    WHEN 'occurred_on' THEN ' DATE;'
    WHEN 'exclude_from_totals' THEN ' BOOLEAN DEFAULT FALSE;'
    WHEN 'hash' THEN ' TEXT;'
  END as add_column_command
FROM (
  SELECT 'occurred_on' as column_name
  UNION ALL SELECT 'exclude_from_totals'
  UNION ALL SELECT 'hash'
) rc
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name = 'transactions'
  AND c.column_name = rc.column_name
WHERE c.column_name IS NULL;