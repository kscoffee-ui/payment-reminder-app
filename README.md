# Payment Reminder App

未払い回収に特化した、ログイン不要の割り勘管理アプリです。

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を作成

```bash
cp .env.example .env
```

`.env` に Firebase 設定値を入力してください。

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

3. Firestore ルール（MVP）

- URLを知っているユーザーのみアクセスする前提で、`bills` の読み書きを許可してください。
- 認証は使わない構成です。

## 実行方法

```bash
npm run dev
```

- `/` : 割り勘作成
- `/bill/:id` : 割り勘詳細

## ビルド

```bash
npm run build
```

## 実装ファイル

- `src/App.jsx` 画面切り替えと状態管理
- `src/firebase.js` Firebase 設定読み込み
- `src/lib/firestore.js` Firestore REST API 通信
- `src/lib/calc.js` 金額計算とメンバー生成
- `src/lib/reminder.js` 催促文生成
- `src/lib/storage.js` 自分識別の localStorage 管理
- `src/components/*` UI コンポーネント群
