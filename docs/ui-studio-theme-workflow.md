# UI Studio テーマ反映ワークフロー

このメモは、`/dev/studio` で調整したテーマを、将来 `src/theme/defaultTheme.js` に正式反映するときの手順です。

UI Studio は開発用の調整画面です。ここで保存した内容はブラウザの `localStorage` に保存されるだけで、Git や本番コードには自動では反映されません。

## 1. UI Studio でテーマを調整する

1. 開発環境でアプリを起動します。
2. `/dev/studio` を開きます。
3. 左側の StudioPanel で、以下のテーマ値を調整します。
   - `color`
   - `radius`
   - `space`
   - `size`
   - `fontSize`
   - `shadow`
4. 右側のスマホプレビューで、ダッシュボード、参加者一覧、設定、確認待ち一覧、確認待ち詳細の見た目を確認します。

テーマ調整では、カイシュルの基本方針を優先します。

- 未払いは赤で最も目立たせる
- 確認待ちはオレンジで、確認済みと誤認されないようにする
- 確認済みは緑で完了状態として分かるようにする
- LINE 催促は幹事側だけに置き、LINE 緑を維持する
- スマホで押しやすく、読みやすい余白と文字サイズにする

## 2. 保存ボタンの意味

StudioPanel の「保存」ボタンは、現在のテーマをブラウザの `localStorage` に保存します。

保存後に `/dev/studio` をリロードしても、同じブラウザでは保存済みテーマが適用されます。

ただし、この保存は開発中の確認用です。保存ボタンを押しても、以下には反映されません。

- Git の差分
- `src/theme/defaultTheme.js`
- 本番ビルドの標準テーマ
- 他のブラウザや他の端末

## 3. Reset ボタンの意味

StudioPanel の「Reset」ボタンは、`localStorage` に保存された UI Studio 用テーマを削除し、`defaultTheme` の見た目に戻します。

Reset はブラウザ内の保存内容を消す操作です。`src/theme/defaultTheme.js` の内容は変更されません。

## 4. JSON コピーの意味

StudioPanel の「JSONコピー」ボタンは、現在 StudioPanel 上で保持しているテーマ全体を JSON としてクリップボードへコピーします。

コピーされる内容は、`defaultTheme` と保存済みテーマをマージした現在のテーマです。Reset 後に JSON コピーすると、基本的には `defaultTheme` の内容がコピーされます。

この JSON は、標準テーマへ反映するための材料です。JSON コピーだけでは Git や本番コードには保存されません。

## 5. 標準テーマにするには

UI Studio で調整したテーマをカイシュルの標準テーマにするには、JSON コピーした内容をもとに `src/theme/defaultTheme.js` を更新してコミットする必要があります。

反映時の基本方針:

1. UI Studio で見た目を調整します。
2. 「JSONコピー」で現在テーマをコピーします。
3. 反映前に `npm run build` を実行し、現在の作業状態でビルドが通ることを確認します。
4. `src/theme/defaultTheme.js` の該当値へ、コピーしたテーマ値を慎重に反映します。
5. 反映後にもう一度 `npm run build` を実行します。
6. `/dev/studio` で、保存済みテーマを Reset した状態でも新しい標準テーマが見えることを確認します。
7. `/admin/:eventId` の本体 UI でも見た目を確認します。
8. `docs/ui-reference/` の実機スマホスクリーンショットと見比べます。
9. `git diff` で、意図したテーマ差分だけになっているか確認します。

## 6. 見た目確認の観点

反映後は、少なくとも以下を確認します。

- ダッシュボードで未払い人数が最も目立つか
- 確認待ちがオレンジで、確認済みの緑と混ざって見えないか
- 参加者一覧の StatusBadge が読みやすいか
- 確認待ち一覧と確認待ち詳細で、確認作業が分かりやすいか
- LINE 催促ボタンが幹事側だけに表示され、LINE 緑として認識できるか
- カードの角丸、余白、影がスマホで重すぎないか
- ボタン高さと文字サイズが押しやすいか
- 390px 前後の Chrome 表示と実機スマホ表示で大きくズレていないか

## 7. 巻き込まないファイル

テーマ反映コミットでは、今回の目的と関係ない差分を混ぜないでください。

特に以下は巻き込まないようにします。

- `package.json`
- `package-lock.json`
- `.env` 系ファイル
- `.env.vercel.preview`
- `.wip-backup/`
- `scripts/seed-demo-event.js`
- Firestore / Firebase 設定ファイル

Firestore 処理、Firebase 設定、環境変数、URL トークン設計は、テーマ反映作業では触りません。

## 8. コミット前チェック

標準テーマへ反映したあと、コミット前に以下を確認します。

```bash
npm run build
git diff --check
git diff -- src/theme/defaultTheme.js
git diff -- src/firebase.js src/lib/firestore.js
git status --short
```

確認ポイント:

- `npm run build` が通る
- `git diff --check` で空白エラーがない
- `src/theme/defaultTheme.js` 以外の意図しないコード差分がない
- `src/firebase.js` と `src/lib/firestore.js` に差分がない
- 環境変数ファイルがコミット対象に入っていない
- `package.json` / `package-lock.json` の差分を混ぜていない

## 9. 推奨コミット単位

テーマを正式反映するコミットは、小さく分けます。

例:

```txt
Update default Kaishuru theme tokens
```

コミットに含める候補:

- `src/theme/defaultTheme.js`
- 必要があれば、テーマ反映手順を更新した `docs/ui-studio-theme-workflow.md`

コミットに含めない候補:

- package 関連差分
- 環境変数ファイル
- Firestore / Firebase 設定
- UI Studio の新機能追加
- 本体ロジック変更

UI Studio は調整のための道具で、正式な標準テーマは `src/theme/defaultTheme.js` に反映して初めてコードとして残ります。
