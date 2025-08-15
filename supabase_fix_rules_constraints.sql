-- rulesテーブルの制約を修正するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. 既存の制約を削除
ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_target_check;

ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_mode_check;

ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_kind_check;

-- 2. 新しい制約を追加（アプリケーションの要件に合わせて）

-- targetカラム: description, detail, memo のいずれか、またはNULL
ALTER TABLE rules 
ADD CONSTRAINT rules_target_check 
CHECK (target IN ('description', 'detail', 'memo') OR target IS NULL);

-- modeカラム: contains, equals, regex のいずれか、またはNULL
ALTER TABLE rules 
ADD CONSTRAINT rules_mode_check 
CHECK (mode IN ('contains', 'equals', 'regex', 'startsWith', 'endsWith') OR mode IS NULL);

-- kindカラム: income, expense のいずれか、またはNULL
ALTER TABLE rules 
ADD CONSTRAINT rules_kind_check 
CHECK (kind IN ('income', 'expense') OR kind IS NULL);

-- 3. 制約を確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rules'::regclass
  AND contype = 'c'; -- CHECK制約のみ

-- 4. テーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rules'
ORDER BY ordinal_position;