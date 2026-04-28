# Payment Reminder App

未払い回収に特化した、ログイン不要のイベント精算管理アプリです。

## セットアップ

```bash
npm install
cp .env.example .env
```

`.env` には最低限以下を設定してください。

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

## 画面

- `/` : 幹事イベント作成画面
- `/created/:eventId?adminToken=...&participantToken=...` : 作成完了画面
- `/admin/:eventId?token=:adminToken` : 幹事管理画面
- `/join/:eventId?token=:participantToken` : 参加者画面

## 実行

```bash
npm run dev
```

## ビルド

```bash
npm run build
```
