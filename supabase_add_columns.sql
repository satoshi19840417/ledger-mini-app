-- Supabase トランザクションテーブルの不足カラム追加スクリプト
-- このスクリプトは不足しているカラムのみを追加します（安全）

-- 1. occurred_on カラムの追加（存在しない場合のみ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'transactions' 
      AND column_name = 'occurred_on'
  ) THEN
    ALTER TABLE transactions ADD COLUMN occurred_on DATE;
    RAISE NOTICE 'カラム occurred_on を追加しました';
  ELSE
    RAISE NOTICE 'カラム occurred_on は既に存在します';
  END IF;
END $$;

-- 2. exclude_from_totals カラムの追加（存在しない場合のみ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'transactions' 
      AND column_name = 'exclude_from_totals'
  ) THEN
    ALTER TABLE transactions ADD COLUMN exclude_from_totals BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'カラム exclude_from_totals を追加しました';
  ELSE
    RAISE NOTICE 'カラム exclude_from_totals は既に存在します';
  END IF;
END $$;

-- 3. hash カラムの追加（存在しない場合のみ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'transactions' 
      AND column_name = 'hash'
  ) THEN
    ALTER TABLE transactions ADD COLUMN hash TEXT;
    RAISE NOTICE 'カラム hash を追加しました';
  ELSE
    RAISE NOTICE 'カラム hash は既に存在します';
  END IF;
END $$;

-- 4. 追加後の確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND column_name IN ('occurred_on', 'exclude_from_totals', 'hash')
ORDER BY column_name;