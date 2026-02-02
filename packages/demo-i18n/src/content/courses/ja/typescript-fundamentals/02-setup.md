---
title: "Setting Up Your Environment"
description: "TypeScript のインストールと開発環境の構成方法を学びます。"
---

TypeScript 開発のための環境を整えましょう。

## 前提条件

開始前に以下を準備してください：
- **Node.js**（バージョン 16 以上）- [こちらからダウンロード](https://nodejs.org/)
- コードエディタ（**VS Code** 推奨）

## TypeScript のインストール

TypeScript はグローバルにも、プロジェクト依存としてもインストールできます。

### グローバルインストール

```bash
npm install -g typescript
```

インストール確認：

```bash
tsc --version
```

### プロジェクト内インストール（推奨）

```bash
mkdir my-ts-project
cd my-ts-project
npm init -y
npm install typescript --save-dev
```

## 最初の TypeScript ファイルを作成

`hello.ts` を作成します：

```typescript
function sayHello(name: string): void {
  console.log(`Hello, ${name}!`);
}

sayHello("TypeScript");
```

コンパイル：

```bash
npx tsc hello.ts
```

`hello.js` が生成されます：

```javascript
function sayHello(name) {
  console.log("Hello, ".concat(name, "!"));
}
sayHello("TypeScript");
```

実行：

```bash
node hello.js
```

## TypeScript の設定

実際のプロジェクトでは `tsconfig.json` が必要です：

```bash
npx tsc --init
```

多くのオプションを含む設定ファイルが生成されます。最小構成は次のとおりです：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 主なオプション

| オプション | 説明 |
|--------|-------------|
| `target` | コンパイル先の JavaScript バージョン |
| `module` | モジュールシステム（commonjs、ES modules など） |
| `strict` | すべての厳格型チェックを有効化 |
| `outDir` | 生成された JS の出力先 |
| `rootDir` | TS ソースの配置先 |

## VS Code の設定

VS Code は TypeScript を標準で強力にサポートしています。おすすめ設定：

1. **ESLint** 拡張をインストール
2. **Prettier** 拡張をインストール
3. 設定で "Format on Save" を有効化

## プロジェクト構成

典型的な TypeScript プロジェクト構成：

```
my-project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── dist/           # コンパイル済み JS（生成）
├── node_modules/
├── package.json
└── tsconfig.json
```

これで TypeScript を書く準備ができました！次章では型システムを掘り下げます。
