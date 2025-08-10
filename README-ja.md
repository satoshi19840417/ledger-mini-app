# 家計簿カテゴリ管理ミニアプリ（ローカル動作用テンプレ）

## セットアップ
```bash
npm install
npm run dev
```
- ブラウザで http://localhost:5173 を開きます。

## できること
- 複数CSVのドラッグ＆ドロップ取り込み（SJIS/UTF-8、自動ヘッダースキップ）
- ルール管理（保存は localStorage）
- 可視化（Recharts）
- Excel/CSV 出力（xlsx/papaparse）

## 依存
- React 18, Vite 5, Tailwind CSS 3, Recharts 2, PapaParse 5, xlsx 0.18
