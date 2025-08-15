-- rulesテーブルの全制約を削除するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. 現在の制約を確認（実行前の状態を記録）
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rules'::regclass
  AND contype = 'c';

-- 2. 全てのCHECK制約を削除
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'rules'::regclass
          AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE rules DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- 3. 制約が削除されたことを確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rules'::regclass
  AND contype = 'c';

-- 4. テストデータを挿入（制約なしで成功するはず）
-- 注意: 実際のuser_idに置き換えてください
INSERT INTO rules (
    user_id,
    pattern,
    category,
    target,
    mode,
    kind
) VALUES (
    auth.uid(), -- 現在のユーザーID
    'テストパターン（制約削除後）',
    'テストカテゴリ',
    'description',
    'contains',
    'expense'
) RETURNING *;

-- 5. 挿入したテストデータを削除
DELETE FROM rules 
WHERE pattern = 'テストパターン（制約削除後）'
  AND user_id = auth.uid();

-- 6. 結果メッセージ
SELECT 'CHECK制約を全て削除しました。ルールの挿入が可能になりました。' AS result;