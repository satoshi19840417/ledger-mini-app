# 家計簿カテゴリ管理ミニアプリ（ローカル動作用テンプレ）

## セットアップ
```bash
npm install
cp .env.example .env
# .env を編集して Supabase の URL と anon key を設定
npm run dev
```
- ブラウザで http://localhost:5173 を開きます。

## できること
- 複数CSVのドラッグ＆ドロップ取り込み（SJIS/UTF-8、自動ヘッダースキップ）
- ルール管理（保存は localStorage）
- 可視化（Recharts）
- Excel/CSV 出力（xlsx/papaparse）

## CSVレイアウト
- `年月日` ヘッダーや `YYYY/M/D` 形式の日付に対応
- 金額列が無い場合は `お預入れ` / `お引出し` から金額を算出
- 以下のヘッダー別名を自動認識します: `お取り扱い内容`→説明, `メモ`→メモ, `ラベル`→カテゴリ
- 取り込みには `date` 列と `amount` または `お預入れ`/`お引出し` のいずれかが必要

## 依存
- React 18, Vite 5, Tailwind CSS 3, Recharts 2, PapaParse 5, xlsx 0.18
