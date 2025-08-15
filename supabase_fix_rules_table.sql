-- rulesテーブルの制約を修正するスクリプト

-- 1. 現在の制約を確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rules'::regclass;

-- 2. 既存のチェック制約を削除（存在する場合）
ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_target_check;

ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_mode_check;

ALTER TABLE rules 
DROP CONSTRAINT IF EXISTS rules_kind_check;

-- 3. rulesテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rules'
ORDER BY ordinal_position;

-- 4. 必要に応じてカラムを更新（制約なしで）
-- targetカラムは任意のテキスト値を許可
-- modeカラムは任意のテキスト値を許可
-- kindカラムはincome/expenseのみ許可
ALTER TABLE rules 
ADD CONSTRAINT rules_kind_check 
CHECK (kind IN ('income', 'expense') OR kind IS NULL);

-- 5. テスト用のデータを挿入して確認
-- このSQLは手動で実行する前にユーザーIDを確認してください
/*
INSERT INTO rules (
    user_id,
    pattern,
    category,
    target,
    mode,
    kind
) VALUES (
    auth.uid(), -- 現在のユーザーID
    'テストパターン',
    'テストカテゴリ',
    'description',
    'contains',
    'expense'
);
*/

-- 6. 挿入したテストデータを確認
SELECT * FROM rules 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC 
LIMIT 5;