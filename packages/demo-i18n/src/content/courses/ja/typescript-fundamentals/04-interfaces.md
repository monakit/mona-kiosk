---
title: "Interfaces and Type Aliases"
description: "インターフェースと型エイリアスでカスタム型を定義し、コードを整理します。"
---

インターフェースと型エイリアスは、オブジェクトの形やその他のデータ構造を表すカスタム型を定義するために使います。

## インターフェース

インターフェースはオブジェクト構造を定義します：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
};
```

### オプションプロパティ

```typescript
interface Config {
  apiUrl: string;
  timeout?: number; // optional
  debug?: boolean; // optional
}

const config: Config = {
  apiUrl: "https://api.example.com",
  // timeout and debug are optional
};
```

### 読み取り専用プロパティ

```typescript
interface Point {
  readonly x: number;
  readonly y: number;
}

const origin: Point = { x: 0, y: 0 };
// origin.x = 5; // Error: Cannot assign to 'x' because it is a read-only property
```

### インターフェースの拡張

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
  bark(): void;
}

const dog: Dog = {
  name: "Max",
  breed: "Labrador",
  bark() {
    console.log("Woof!");
  },
};
```

### 多重継承

```typescript
interface Printable {
  print(): void;
}

interface Loggable {
  log(): void;
}

interface Document extends Printable, Loggable {
  title: string;
}
```

## 型エイリアス

型エイリアスは任意の型に別名を付けます：

```typescript
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: string) => void;

let userId: ID = "abc123";
let position: Point = { x: 10, y: 20 };
```

### ユニオン型とインターセクション型

```typescript
// Union: one of several types
type Status = "pending" | "approved" | "rejected";

// Intersection: combine types
type Employee = {
  id: number;
  name: string;
};

type Manager = Employee & {
  department: string;
  reports: Employee[];
};
```

## インターフェースと型エイリアス

どちらもオブジェクトの形を定義できますが、違いがあります：

### 宣言のマージ（インターフェースのみ）

```typescript
interface Window {
  title: string;
}

interface Window {
  size: number;
}

// Window now has both title and size
const win: Window = { title: "Main", size: 100 };
```

### 計算プロパティ（型エイリアスのみ）

```typescript
type Keys = "firstname" | "lastname";
type Person = {
  [key in Keys]: string;
};
// { firstname: string; lastname: string; }
```

### 使い分け

| インターフェースを使う | 型エイリアスを使う |
|---------------|----------------|
| オブジェクトの形 | ユニオン・インターセクション |
| クラスの契約 | プリミティブの別名 |
| 宣言マージが必要 | 計算プロパティ |
| 公開 API の定義 | 複雑な型の合成 |

## 関数型

どちらも関数シグネチャを定義できます：

```typescript
// Interface
interface GreetFunction {
  (name: string): string;
}

// Type alias
type GreetFn = (name: string) => string;

const greet: GreetFn = (name) => `Hello, ${name}!`;
```

## インデックスシグネチャ

動的なキーを持つオブジェクトに使用します：

```typescript
interface StringMap {
  [key: string]: string;
}

const colors: StringMap = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
};

// Type alias version
type NumberMap = {
  [key: string]: number;
};
```

## ユーティリティ型

TypeScript には組み込みのユーティリティ型があります：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties required
type RequiredUser = Required<User>;

// Pick specific properties
type UserPreview = Pick<User, "id" | "name">;

// Omit specific properties
type PublicUser = Omit<User, "password">;

// Make all properties readonly
type FrozenUser = Readonly<User>;
```

## 実務的な例

```typescript
// API response types
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

// Usage
type UserResponse = ApiResponse<User>;
type PostListResponse = ApiResponse<Post[]>;

async function fetchUser(id: number): Promise<UserResponse> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

## まとめ

- **インターフェース** はオブジェクト形状やクラス契約の定義に最適
- **型エイリアス** はより柔軟で、あらゆる型を表現可能
- 第三者型を拡張する場合は **宣言マージ** を使用
- **ユーティリティ型** で既存型を変換
- 公開 API ではインターフェース推奨（エラーメッセージがわかりやすい）

おめでとうございます！TypeScript Fundamentals コースを修了しました。型安全な JavaScript を書くための確かな基礎が身につきました。
