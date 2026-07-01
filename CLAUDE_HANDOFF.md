# Claude Handoff

## 最初に読むもの

このプロジェクトを触る前に、まず次の2ファイルを読んでください。

- `WORKLOG.md`: 人間向けの作業履歴と次にやること
- `CODEX_HANDOFF.md`: Codex 向けの技術的な引き継ぎ

このファイルは Claude 向けの共同開発ルールです。

## プロジェクト概要

Monster Hunter Rise: Sunbreak 向けの静的な装備・ダメージシミュレーターです。

主な画面:

- `index.html`: 本体シミュレーター
- `missing-data.html`: 未設定データ入力ツール

主なロジック:

- `app.js`: 本体シミュレーターの処理
- `missing-data.js`: 未設定データ入力ツールの処理
- `build_data.py`: 元データから `data.js` を生成するスクリプト
- `data.js`: 生成済みの大きなアプリ用データ

## 共同開発の基本ルール

- 作業前に必ず `git status` を確認してください。
- 既存の変更を勝手に戻さないでください。
- 目的に関係ないファイルは編集しないでください。
- 大きな整形、全体置換、無関係なリファクタは避けてください。
- 変更したら `WORKLOG.md` に短く追記してください。
- 変更後は可能な範囲で構文チェックをしてください。

## Git 運用

まだ Git 管理されていない場合は、人間に確認してから初期化してください。

推奨初期化:

```powershell
git init
git add .
git commit -m "Initial project state"
```

AIごとの作業ブランチ例:

```powershell
git switch -c claude/task-name
git switch -c codex/task-name
```

作業後:

```powershell
git status
git diff
git add <changed-files>
git commit -m "Short description"
```

## 触る時に注意するファイル

### `data.js`

巨大な生成済みデータです。原則として直接編集しないでください。

データ生成が必要な場合は `build_data.py` を確認し、必要なら人間に方針確認してください。

### `app.js`

本体シミュレーターの中心です。装備選択、スキル集計、ダメージ計算、プリセット、護石、未設定データ反映が入っています。

影響範囲が広いので、変更前に対象関数をよく読んでください。

### `missing-data.js`

未設定データ入力ツールの中心です。武器傀異錬成とボウガン弾設定の手動補完を扱います。

最近の変更で、武器傀異錬成の入力表は以下の方針になっています。

- 通常カテゴリ: `Lv` 表示 + `Cost` + `値`
- 傀異スロット拡張: `Lv` 表示 + `Cost` + `slotBonus.*`
- `slotBonus.*` は傀異スロット拡張でのみ表示
- `Lv` は基本固定扱いで、入力欄ではなく表示チップ

## 保存キー

localStorage を使っています。

- `mhsb_presets_v1`: 装備プリセット
- `mhsb_last_state_v1`: 本体画面の最後の状態
- `mhsb_charms_v1`: 保存した護石
- `mhsb_missing_data_draft_v1`: 未設定データ入力ツールの下書き
- `mhsb_missing_data_applied_v1`: 本体へ反映済みの未設定データ

保存形式を変える場合は、既存データとの互換性に注意してください。

## 確認コマンド

Node.js が PATH にない場合はフルパスで実行してください。

```powershell
& 'C:\Program Files\nodejs\node.exe' --check app.js
& 'C:\Program Files\nodejs\node.exe' --check missing-data.js
& 'C:\Program Files\nodejs\node.exe' --check data.js
python -m py_compile build_data.py
```

Codex 環境では `node` が PATH に反映されていないことがありましたが、上記フルパスでは動作確認済みです。

## Claude に期待する作業スタイル

- まず既存コードを読んでから変更してください。
- UI文言を変える場合は、日本語として自然で、使う人が迷わない説明にしてください。
- `missing-data` 系の変更では、「この入力が本体のどこに反映されるか」を明確にしてください。
- 変更後は、何を変えたか、どの確認をしたかを短く報告してください。

## 人間への確認が必要な場面

次の場合は、無理に進めず確認してください。

- `data.js` を直接編集する必要がありそうな場合
- 保存形式や localStorage キーを変える場合
- ダメージ計算式の仕様を変える場合
- 大量のファイルを整形・置換したくなった場合
- 既存変更と競合して、意図が判断できない場合
