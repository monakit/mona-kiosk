---
title: "Setting Up Your Environment"
description: "学习如何安装 TypeScript 并配置开发环境。"
---

让我们为 TypeScript 开发准备好环境。

## 前置条件

开始之前，请确保你有：
- **Node.js**（版本 16 或更高）- [在此下载](https://nodejs.org/)
- 一个代码编辑器（推荐 **VS Code**）

## 安装 TypeScript

你可以全局安装，也可以作为项目依赖安装。

### 全局安装

```bash
npm install -g typescript
```

验证安装：

```bash
tsc --version
```

### 项目内安装（推荐）

```bash
mkdir my-ts-project
cd my-ts-project
npm init -y
npm install typescript --save-dev
```

## 创建第一个 TypeScript 文件

创建一个名为 `hello.ts` 的文件：

```typescript
function sayHello(name: string): void {
  console.log(`Hello, ${name}!`);
}

sayHello("TypeScript");
```

编译：

```bash
npx tsc hello.ts
```

会生成 `hello.js`：

```javascript
function sayHello(name) {
  console.log("Hello, ".concat(name, "!"));
}
sayHello("TypeScript");
```

运行：

```bash
node hello.js
```

## TypeScript 配置

真实项目中你会需要 `tsconfig.json` 文件：

```bash
npx tsc --init
```

这会生成包含多项设置的配置文件。下面是一个最小示例：

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

### 关键选项说明

| 选项 | 说明 |
|--------|-------------|
| `target` | 编译到的 JavaScript 版本 |
| `module` | 模块系统（commonjs、ES modules 等） |
| `strict` | 启用全部严格类型检查 |
| `outDir` | 编译后 JS 文件的输出目录 |
| `rootDir` | TS 源文件所在目录 |

## VS Code 设置

VS Code 内置了优秀的 TypeScript 支持。为了最佳体验：

1. 安装 **ESLint** 插件
2. 安装 **Prettier** 插件
3. 在设置中启用 “Format on Save”

## 项目结构

典型的 TypeScript 项目结构：

```
my-project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── dist/           # 编译后的 JS（生成）
├── node_modules/
├── package.json
└── tsconfig.json
```

你已经准备好编写 TypeScript 了！下一章我们将深入 TypeScript 的类型系统。
