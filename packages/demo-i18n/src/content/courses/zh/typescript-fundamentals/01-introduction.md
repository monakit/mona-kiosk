---
title: "What is TypeScript?"
description: "TypeScript 入门，以及它在现代 JavaScript 开发中的意义。"
---

TypeScript 是 JavaScript 的带类型超集，可编译为纯 JavaScript，由微软开发并维护。

## 为什么选择 TypeScript？

JavaScript 是动态类型语言，这意味着类型检查发生在运行时。虽然这带来灵活性，但也可能导致错误只有在代码运行时才被发现。

TypeScript 为 JavaScript 增加了**静态类型检查**，在编译期而不是运行期捕获错误。

### 主要优势

1. **更早发现错误** - 在运行之前发现 bug
2. **更好的 IDE 支持** - 更强的自动补全、重构与导航
3. **自文档化代码** - 类型就是内联文档
4. **更安全的重构** - 编译器可捕获破坏性变更
5. **渐进式采用** - 可按需使用

## TypeScript 与 JavaScript

一个简单对比：

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

## TypeScript 如何工作

1. 你编写 TypeScript 代码（`.ts` 文件）
2. TypeScript 编译器（`tsc`）检查类型错误
3. 没有错误则输出 JavaScript（`.js` 文件）
4. 你在任意环境中运行 JavaScript

编译后的 JavaScript 干净可读，TypeScript 不会增加运行时开销。

## 何时使用 TypeScript

TypeScript 尤其适用于：
- 多人协作的大型代码库
- 需要长期维护的项目
- 对可靠性要求高的应用
- 来自强类型语言背景的团队

下一章我们将搭建开发环境并创建第一个 TypeScript 项目。
