回答は日本語で

# 家計簿カテゴリ管理ミニアプリ（ローカル動作用テンプレ）

## セットアップ
```bash
npm install
cp .env.example .env
# .env を編集して Supabase の URL と anon key を設定
npm run dev
```
- ブラウザで http://localhost:5173 を開きます。

### Supabase の設定

- Supabase のダッシュボードで「Authentication」→「Providers」から **Google** を有効化し、Redirect URL に `http://localhost:5173` などアプリの URL を登録します。
- 「プロジェクト設定」→「API」から `URL` と `anon key` を取得し、`.env` に以下の環境変数として設定してください:
  - `VITE_SUPABASE_URL`: Supabase プロジェクトの URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase の anon key

## 開発用コマンド

| コマンド | 説明 |
|---|---|
| `pnpm lint` | ESLint を実行してコードをチェックします |

## できること
- 複数CSVのドラッグ＆ドロップ取り込み（SJIS/UTF-8、自動ヘッダースキップ）
- ルール管理（保存は localStorage）
  - ルールを追加・変更した後はルール画面の「データ反映」ボタンを押して取引データに反映させます
- 可視化（Recharts）
- Excel/CSV 出力（xlsx/papaparse）

### 再分類ルール例

```json
[
  { "pattern": "スタバ", "mode": "contains", "target": "detail", "kind": "expense", "category": "カフェ" },
  { "regex": "Salary\\s*Payment", "flags": "i", "mode": "regex", "target": "description", "kind": "income", "category": "給与" }
]
```

|キー|説明|
|----|----|
|pattern|説明などに含まれる文字列を部分一致で検索します|
|regex|正規表現パターン|
|flags|正規表現のフラグ (例: `i`)|
|keyword|pattern/regex が無い場合に用いるキーワード|
|mode|`contains` または `regex` のマッチ方法|
|target|評価対象フィールド (`description`/`detail`/`memo`)|
|kind|適用対象の取引種別 (`expense`/`income`/`both`)|
|category|条件に一致したときに設定するカテゴリ|

## CSVレイアウト
- `年月日` ヘッダーや `YYYY/M/D` 形式の日付に対応
- 金額列が無い場合は `お預入れ` / `お引出し` から金額を算出
- 以下のヘッダー別名を自動認識します: `お取り扱い内容`→説明, `メモ`→メモ, `ラベル`→カテゴリ
- 取り込みには `date` 列と `amount` または `お預入れ`/`お引出し` のいずれかが必要
- 未来の日付は取り込み時に当日の日付へ自動変換されます

## 依存
- React 18, Vite 5, Tailwind CSS 3, Recharts 2, PapaParse 5, xlsx 0.18
