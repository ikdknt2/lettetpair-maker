# Next.js + Vercel でアカウント保存対応する移行プラン

このリポジトリは現在、IndexedDB によるローカル保存専用です。  
ここでは **アカウントごとにクラウド保存** できる構成へ移行するための、実装順と設計をまとめます。

---

## 1. 推奨スタック

- **フロント/サーバ**: Next.js (App Router)
- **ホスティング**: Vercel
- **認証**: Auth.js (NextAuth)
- **DB**: Supabase Postgres または Neon Postgres
- **ORM**: Prisma

---

## 2. データモデル（最小）

`pair_entries` テーブル:

- `id` (uuid, PK)
- `user_id` (text, index)
- `pair` (text)
- `word` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `skip_count` (int, default 0)
- `favorite` (boolean, default false)
- `memo` (text, default "")

制約:

- `UNIQUE(user_id, pair)`

これで、現行 IndexedDB の `pair` 主キー設計をユーザー単位へ拡張できます。

---

## 3. API 設計（例）

- `GET /api/pairs`:
  - ログイン中ユーザーの登録済み一覧を返す
- `PUT /api/pairs/[pair]`:
  - 指定ペアを upsert
- `DELETE /api/pairs/[pair]`:
  - 指定ペアを削除
- `POST /api/pairs/import`:
  - JSON 配列を受け取り、ユーザー配下へマージ
- `GET /api/pairs/export`:
  - ユーザー配下のデータを `letterpairs.json` 形式で返す

---

## 4. フロント移行方針

現行 `app.js` の以下ロジックはそのまま再利用可能です。

- 20文字から同一連続除外で全ペア生成
- 未登録のみランダム出題
- 統計算出（登録数・未登録数・達成率）

変更点は「データ取得元」を IndexedDB から API へ切り替える点です。

---

## 5. 実装ステップ（順番）

1. `create-next-app` で新規プロジェクト作成
2. Auth.js を追加し、Google などでログイン可能化
3. Prisma + Postgres 接続
4. `pair_entries` スキーマ作成 + migrate
5. API Routes を実装（上記 5 本）
6. メイン/UIを React コンポーネントへ移植
7. JSON import/export を接続
8. Vercel へデプロイ
9. 本番環境変数を設定（AUTH_SECRET, DB_URL など）

---

## 6. 現行アプリからのデータ移行

- 現行版で `letterpairs.json` をエクスポート
- Next.js 版で import API を叩いてマージ
- `pair` が同じものは上書き運用

---

## 7. 将来拡張しやすくするコツ

- サーバ側で `skip_count` 更新APIを分離（分析しやすい）
- `favorite` / `memo` を早めにUIに露出
- ローカルキャッシュ（IndexedDB）を残してオフライン対応
- `rows progress` や `頻出優先` は SQL 集計で実現可能

---

## 8. まず最初の1週間プラン

- Day 1-2: Next.js + Auth + DB 接続
- Day 3: pair CRUD API
- Day 4: メイン画面移植
- Day 5: 一覧/統計/JSON移植
- Day 6: モバイルUI調整
- Day 7: Vercel本番公開

