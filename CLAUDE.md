回答は日本語で
# Ledger Mini App (家計簿ミニアプリ)

## プロジェクト概要
家計簿管理のためのReact + Viteベースのウェブアプリケーション。Supabase認証とデータベース、RechartsでのデータVisualization、CSV/Excel入出力機能を備えています。

## 技術スタック
- **フレームワーク**: React 18 + Vite
- **スタイリング**: Tailwind CSS
- **データベース/認証**: Supabase
- **データ可視化**: Recharts
- **CSVパース**: PapaParser
- **Excel処理**: xlsx
- **E2Eテスト**: Cypress
- **パッケージマネージャー**: pnpm

## 重要なコマンド
```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# プレビュー
pnpm preview

# Lintチェック
pnpm lint

# アイコン生成
pnpm icons
```

## プロジェクト構造
```
src/
├── components/     # 共通コンポーネント
│   └── Auth.jsx   # 認証コンポーネント
├── pages/         # ページコンポーネント
│   ├── Transactions.jsx  # 取引一覧
│   ├── Monthly.jsx       # 月次分析
│   ├── Yearly.jsx        # 年次分析
│   └── ImportCsv.jsx     # CSV取り込み
├── services/      # サービス層
│   └── database.js       # データベース操作
├── state/         # 状態管理
│   └── StoreContextWithDB.jsx
├── lib/           # ライブラリ設定
│   └── supabaseClient.js
└── utils/         # ユーティリティ
    ├── csv.js     # CSV処理
    └── currency.js # 通貨フォーマット
```

## 主要機能
1. **CSV/Excel取り込み**: 複数ファイルのドラッグ&ドロップ対応、SJIS/UTF-8自動判定
2. **ルール管理**: 取引の自動分類ルール（localStorage保存）
3. **データ可視化**: 月次・年次の収支グラフ、カテゴリ別円グラフ
4. **認証**: Google OAuth経由のSupabase認証
5. **PWA対応**: Service Workerによるオフライン対応

## 開発時の注意点
- パッケージマネージャーは**pnpm**を使用
- 環境変数は`.env`に設定（Supabase URL/Key必須）
- コミット前は必ず`pnpm lint`を実行
- Tailwind CSSのクラスを優先使用

## テスト
E2Eテスト（Cypress）:
- `cypress/e2e/callback.cy.js` - パスワードリセットコールバック
- `cypress/e2e/forgot.cy.js` - パスワード忘れフロー

## 環境変数
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```