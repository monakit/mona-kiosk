---
title: "Basic Types"
description: "TypeScript の基本型（プリミティブ、配列、タプルなど）を学びます。"
---

TypeScript は型システムの基礎となる基本型を用意しています。

## プリミティブ型

### String、Number、Boolean

```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;

// 型推論 - TypeScript が型を推測
let city = "New York"; // string として推論
```

### Null と Undefined

```typescript
let nothing: null = null;
let notDefined: undefined = undefined;

// strictNullChecks では null を明示的に扱う必要がある
let maybeString: string | null = null;
```

## 配列

配列の定義方法は 2 つあります：

```typescript
// 角括弧を使う
let numbers: number[] = [1, 2, 3];
let names: string[] = ["Alice", "Bob"];

// ジェネリック構文を使う
let scores: Array<number> = [95, 87, 92];
```

## タプル

固定長の配列で、各位置に特定の型を持ちます：

```typescript
let person: [string, number] = ["Alice", 30];
let coordinate: [number, number, number] = [10, 20, 30];

// インデックスでアクセス
console.log(person[0]); // "Alice"
console.log(person[1]); // 30
```

## 列挙型（Enum）

名前付きの定数：

```typescript
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

let move: Direction = Direction.Up;

// 文字列 enum
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}
```

## Any と Unknown

### Any - 逃げ道

```typescript
let anything: any = 4;
anything = "string"; // OK
anything = false; // OK

// 危険：型チェックが無い
anything.foo.bar; // エラーにならないが実行時に落ちる可能性
```

### Unknown - より安全な代替

```typescript
let uncertain: unknown = 4;
uncertain = "string"; // OK

// 使用前に型を絞り込む必要がある
if (typeof uncertain === "string") {
  console.log(uncertain.toUpperCase()); // OK
}
```

## Void と Never

### Void - 戻り値なし

```typescript
function logMessage(message: string): void {
  console.log(message);
  // return なし
}
```

### Never - 絶対に戻らない

```typescript
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

## 型アサーション

TypeScript に「こちらが正しい型だ」と伝えます：

```typescript
let someValue: unknown = "hello";

// 2 つの書き方
let strLength1: number = (someValue as string).length;
let strLength2: number = (<string>someValue).length;
```

## オブジェクト型

インラインのオブジェクト型：

```typescript
let user: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// オプションプロパティ
let config: { debug?: boolean; timeout: number } = {
  timeout: 3000,
};
```

## ユニオン型

値が複数の型のいずれかになり得る場合：

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

## リテラル型

特定の値そのものを型として扱います：

```typescript
let direction: "north" | "south" | "east" | "west";
direction = "north"; // OK
direction = "up"; // Error

let httpStatus: 200 | 404 | 500;
```

## まとめ

| 型 | 例 | 用途 |
|------|---------|----------|
| `string` | `"hello"` | 文字列データ |
| `number` | `42`, `3.14` | 数値データ |
| `boolean` | `true`, `false` | フラグ |
| `array` | `number[]` | リスト |
| `tuple` | `[string, number]` | 固定構造 |
| `enum` | `Direction.Up` | 名前付き定数 |
| `any` | 何でも | 逃げ道（避ける） |
| `unknown` | 何でも | 安全な未知値 |
| `void` | 値なし | 戻り値なし |
| `never` | 決して起こらない | エラー、無限ループ |

次の章ではインターフェースと型エイリアスを使って複雑な型を定義します。
