---
title: "Basic Types"
description: "学习 TypeScript 的基础类型：原始类型、数组、元组等。"
---

TypeScript 提供了一组基础类型，是其类型系统的基础。

## 原始类型

### String、Number、Boolean

```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;

// 类型推断 - TypeScript 可以推断类型
let city = "New York"; // 推断为 string
```

### Null 与 Undefined

```typescript
let nothing: null = null;
let notDefined: undefined = undefined;

// strictNullChecks 开启时必须显式处理 null
let maybeString: string | null = null;
```

## 数组

定义数组有两种方式：

```typescript
// 使用方括号
let numbers: number[] = [1, 2, 3];
let names: string[] = ["Alice", "Bob"];

// 使用泛型语法
let scores: Array<number> = [95, 87, 92];
```

## 元组

固定长度数组，每个位置有特定类型：

```typescript
let person: [string, number] = ["Alice", 30];
let coordinate: [number, number, number] = [10, 20, 30];

// 按索引访问
console.log(person[0]); // "Alice"
console.log(person[1]); // 30
```

## 枚举

命名常量：

```typescript
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

let move: Direction = Direction.Up;

// 字符串枚举
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}
```

## Any 与 Unknown

### Any - 逃生舱

```typescript
let anything: any = 4;
anything = "string"; // OK
anything = false; // OK

// 危险：没有类型检查
anything.foo.bar; // 不报错，但运行时可能崩溃
```

### Unknown - 更安全的选择

```typescript
let uncertain: unknown = 4;
uncertain = "string"; // OK

// 使用前必须缩小类型
if (typeof uncertain === "string") {
  console.log(uncertain.toUpperCase()); // OK
}
```

## Void 与 Never

### Void - 无返回值

```typescript
function logMessage(message: string): void {
  console.log(message);
  // 没有 return
}
```

### Never - 永不返回

```typescript
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

## 类型断言

告诉 TypeScript 你更清楚类型：

```typescript
let someValue: unknown = "hello";

// 两种语法
let strLength1: number = (someValue as string).length;
let strLength2: number = (<string>someValue).length;
```

## 对象类型

内联对象类型：

```typescript
let user: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// 可选属性
let config: { debug?: boolean; timeout: number } = {
  timeout: 3000,
};
```

## 联合类型

一个值可以是多种类型之一：

```typescript
let id: string | number;
id = "abc123"; // OK
id = 42; // OK

function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());
  } else {
    console.log(id.toFixed(2));
  }
}
```

## 字面量类型

使用具体值作为类型：

```typescript
let direction: "north" | "south" | "east" | "west";
direction = "north"; // OK
direction = "up"; // Error

let httpStatus: 200 | 404 | 500;
```

## 总结

| 类型 | 示例 | 用途 |
|------|---------|----------|
| `string` | `"hello"` | 文本数据 |
| `number` | `42`, `3.14` | 数值数据 |
| `boolean` | `true`, `false` | 标志位 |
| `array` | `number[]` | 列表 |
| `tuple` | `[string, number]` | 固定结构 |
| `enum` | `Direction.Up` | 命名常量 |
| `any` | 任意值 | 逃生舱（避免使用） |
| `unknown` | 任意值 | 安全的未知值 |
| `void` | 无值 | 无返回值 |
| `never` | 永不发生 | 错误、无限循环 |

下一章我们将学习接口与类型别名，以定义复杂类型。
