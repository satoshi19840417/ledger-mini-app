-- Supabaseテーブル作成スクリプト
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 1. 既存のテーブルを削除（必要に応じてコメントアウト）
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS rules CASCADE;
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- 2. プロファイルテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. トランザクションテーブル（完全なスキーマ）
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  occurred_on DATE,
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT,
  description TEXT,
  detail TEXT,
  memo TEXT,
  kind TEXT CHECK (kind IN ('income', 'expense')),
  hash TEXT,
  exclude_from_totals BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 既存のテーブルに不足しているカラムを追加
DO $$ 
BEGIN
  -- occurred_on カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'occurred_on'
  ) THEN
    ALTER TABLE transactions ADD COLUMN occurred_on DATE;
    RAISE NOTICE 'Added column: occurred_on';
  END IF;
  
  -- exclude_from_totals カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'exclude_from_totals'
  ) THEN
    ALTER TABLE transactions ADD COLUMN exclude_from_totals BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: exclude_from_totals';
  END IF;
  
  -- hash カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'hash'
  ) THEN
    ALTER TABLE transactions ADD COLUMN hash TEXT;
    RAISE NOTICE 'Added column: hash';
  END IF;

  -- detail カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'detail'
  ) THEN
    ALTER TABLE transactions ADD COLUMN detail TEXT;
    RAISE NOTICE 'Added column: detail';
  END IF;

  -- memo カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'memo'
  ) THEN
    ALTER TABLE transactions ADD COLUMN memo TEXT;
    RAISE NOTICE 'Added column: memo';
  END IF;

  -- kind カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'kind'
  ) THEN
    ALTER TABLE transactions ADD COLUMN kind TEXT CHECK (kind IN ('income', 'expense'));
    RAISE NOTICE 'Added column: kind';
  END IF;
END $$;

-- 5. ルールテーブル
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT,
  regex TEXT,
  keyword TEXT,
  category TEXT NOT NULL,
  target TEXT,
  mode TEXT,
  kind TEXT,
  flags TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);

-- 8. Row Level Security (RLS) の有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 9. RLSポリシーの作成（既存の場合は削除してから作成）
-- profiles テーブル
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- transactions テーブル
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" 
  ON transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
  ON transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
  ON transactions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" 
  ON transactions FOR DELETE 
  USING (auth.uid() = user_id);

-- rules テーブル
DROP POLICY IF EXISTS "Users can view own rules" ON rules;
DROP POLICY IF EXISTS "Users can insert own rules" ON rules;
DROP POLICY IF EXISTS "Users can update own rules" ON rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON rules;

CREATE POLICY "Users can view own rules" 
  ON rules FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules" 
  ON rules FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules" 
  ON rules FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules" 
  ON rules FOR DELETE 
  USING (auth.uid() = user_id);

-- user_preferences テーブル
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

-- 10. テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 11. RLSポリシーの確認
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'transactions'
ORDER BY policyname;