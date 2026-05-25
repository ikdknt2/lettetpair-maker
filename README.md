# lettetpair-maker

MBLD（目隠し複数）のレターペア辞書を、ローカルのみで管理するためのSPAです。

## ファイル構成

- `index.html`: 4タブ（メイン / 一覧 / 統計 / JSON）を持つ1ページUI
- `style.css`: 黒背景 + 青アクセントのスマホ優先スタイル
- `db.js`: IndexedDB操作（`pairEntries`）の薄いデータアクセス層
- `app.js`: ペア生成・出題・登録・一覧編集・統計・JSON入出力

## ざっくり仕組み（アルゴリズム概要）

1. **文字集合から全ペア生成**
   - 文字配列を二重ループし、同一文字連続（例: `ああ`）を除外。
   - `N * (N - 1)` で総ペア数を算出（現在 20文字なら 380）。

2. **未登録ランダム出題**
   - `ALL_PAIRS` から `IndexedDB` に存在しない `pair` を未登録として抽出。
   - 未登録配列から乱数インデックスで1件選択し、現在ペアとして表示。

3. **登録フロー**
   - 入力単語を `pairEntries` に `pair` を主キーとして `put` 保存。
   - 保存後に入力欄クリアし、再度未登録からランダム出題。

4. **一覧編集・削除**
   - 登録済み全件を読み出して表示。
   - `pair/word` で前方一致ではなく部分一致検索。
   - 単語編集時は該当 `pair` を `put` で上書き、削除は `delete`。

5. **統計**
   - `登録数 = DB件数`
   - `未登録数 = 総数 - 登録数`
   - `達成率 = 登録数 / 総数 * 100` を進捗バーへ反映。

6. **JSON入出力**
   - エクスポート: 現在の登録配列を `letterpairs.json` で保存。
   - インポート: JSON配列を読み込み、`pair` 主キーでマージ（同じ `pair` は上書き）。

## 実行

静的ファイルのみなので、GitHub Pagesへそのまま配置して動作します。


## Next.js + Vercel への移行

アカウント保存対応（クラウド同期）をしたい場合は、`NEXTJS_VERCEL_PLAN.md` の手順に沿って進めてください。

- 推奨: Next.js + Vercel + Auth.js + Postgres + Prisma
- 既存の `letterpairs.json` を使って段階移行可能

## Google / X ログイン + クラウド同期（Supabase）

この版では、任意で Supabase を使ったログイン＆同期を追加済みです。

### 手順
1. Supabase プロジェクト作成

3. テーブル `pair_entries` を作成（`user_id`, `pair` の複合ユニーク）
4. `supabase-sync.js` の `SUPABASE_CONFIG` に `url` と `anonKey` を設定
5. アプリを開いてログイン後「クラウドへ同期」を実行

### 補足
- 未設定でもローカル版としてそのまま動作します。
- 同期は「クラウド取得→ローカル反映→ローカル全件をクラウドupsert」の双方向マージです。

## Vercel デプロイ直前チェックリスト

1. `supabase-schema.sql` を Supabase SQL Editor で実行（テーブル / RLS / policy 作成）
2. `supabase-config.example.js` をコピーして `supabase-config.js` を作成
3. `supabase-config.js` に本番の `url` と `anonKey` を設定
4. Supabase Authentication の URL 設定に本番URLを追加
   - Site URL: `https://<your-project>.vercel.app`
   - Redirect URLs: `https://<your-project>.vercel.app`

6. `supabase-config.js` が公開されるため、**anon keyのみ**を入れる（service role禁止）
7. ローカルで最終確認
   - ログイン
   - 登録/編集/削除
   - 同期ボタン
   - JSON import/export

### Vercel へのデプロイ方法（静的）

- GitHub連携でこのリポジトリを Import
- Framework Preset は `Other`（静的）でOK
- Build Command 不要 / Output Directory ルート
- デプロイ後、上記 Authentication URL を再確認

