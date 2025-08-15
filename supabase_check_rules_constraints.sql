-- rulesテーブルの現在の制約を確認するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. rulesテーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rules'
) AS table_exists;

-- 2. 現在のCHECK制約を表示
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rules'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 3. rulesテーブルの全カラムを表示
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rules'
ORDER BY ordinal_position;

-- 4. 既存のデータのtargetカラムの値を確認
SELECT DISTINCT target, COUNT(*) as count
FROM rules
GROUP BY target
ORDER BY target;

-- 5. 既存のデータのmodeカラムの値を確認
SELECT DISTINCT mode, COUNT(*) as count
FROM rules
GROUP BY mode
ORDER BY mode;