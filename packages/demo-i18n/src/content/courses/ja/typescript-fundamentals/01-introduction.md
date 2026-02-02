---
title: "What is TypeScript?"
description: "TypeScript の入門と、現代の JavaScript 開発で重要な理由。"
---

TypeScript は JavaScript の型付きスーパーセットで、最終的に通常の JavaScript にコンパイルされます。Microsoft によって開発・保守されています。

## なぜ TypeScript？

JavaScript は動的型付け言語のため、型チェックは実行時に行われます。柔軟性はありますが、実行するまで気づけないバグが発生しやすくなります。

TypeScript は **静的型チェック** を追加し、実行時ではなくコンパイル時にエラーを検出できます。

### 主なメリット

1. **早期のエラー検出** - 実行前にバグを発見
2. **より良い IDE サポート** - 補完、リファクタ、ナビゲーションが強化
3. **自己文書化コード** - 型がそのままドキュメントになる
4. **安全なリファクタリング** - 破壊的変更をコンパイラが検出
5. **段階的な導入** - 必要な範囲だけ使える

## TypeScript と JavaScript

簡単な比較：

```javascript
// JavaScript
function greet(name) {
  return "Hello, " + name;
}

greet(42); // No error, but probably not intended
```

```typescript
// TypeScript
function greet(name: string): string {
  return "Hello, " + name;
}

greet(42); // Error: Argument of type 'number' is not assignable to parameter of type 'string'
```

## TypeScript の仕組み

1. TypeScript コード（`.ts`）を書く
2. TypeScript コンパイラ（`tsc`）が型エラーを検出
3. エラーがなければ JavaScript（`.js`）を出力
4. 任意の環境で JavaScript を実行

コンパイル後の JavaScript は読みやすく、TypeScript は実行時のオーバーヘッドを追加しません。

## TypeScript を使うべき場面

TypeScript が特に有効なのは：
- 複数人で開発する大規模コードベース
- 長期運用を前提としたプロジェクト
- 信頼性が重要なアプリケーション
- 静的型付け言語の経験があるチーム

次の章では開発環境をセットアップし、最初の TypeScript プロジェクトを作成します。
