---
title: "Interfaces and Type Aliases"
description: "使用接口与类型别名定义自定义类型，更好地组织代码。"
---

接口和类型别名可以定义自定义类型，用于描述对象形状与其他数据结构。

## 接口

接口用于定义对象结构：

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

### 可选属性

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

### 只读属性

```typescript
interface Point {
  readonly x: number;
  readonly y: number;
}

const origin: Point = { x: 0, y: 0 };
// origin.x = 5; // Error: Cannot assign to 'x' because it is a read-only property
```

### 接口继承

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

### 多重继承

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

## 类型别名

类型别名为任意类型创建别名：

```typescript
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: string) => void;

let userId: ID = "abc123";
let position: Point = { x: 10, y: 20 };
```

### 联合与交叉类型

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

## 接口与类型别名对比

二者都能定义对象结构，但也有差异：

### 声明合并（仅接口）

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

### 计算属性（仅类型别名）

```typescript
type Keys = "firstname" | "lastname";
type Person = {
  [key in Keys]: string;
};
// { firstname: string; lastname: string; }
```

### 何时使用

| 使用接口 | 使用类型别名 |
|---------------|----------------|
| 对象结构 | 联合、交叉类型 |
| 类的契约 | 原始类型别名 |
| 需要声明合并 | 计算属性 |
| 公共 API 定义 | 复杂类型组合 |

## 函数类型

二者都能定义函数签名：

```typescript
// Interface
interface GreetFunction {
  (name: string): string;
}

// Type alias
type GreetFn = (name: string) => string;

const greet: GreetFn = (name) => `Hello, ${name}!`;
```

## 索引签名

用于键动态的对象：

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

## 工具类型

TypeScript 提供内置工具类型：

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

## 真实示例

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

## 总结

- **接口** 适合定义对象结构与类的契约
- **类型别名** 更灵活，可表示任何类型
- 需要扩展第三方类型时使用 **声明合并**
- 使用 **工具类型** 变换已有类型
- 公共 API 更推荐接口（错误信息更友好）

恭喜！你已经完成 TypeScript Fundamentals 课程。现在你拥有编写类型安全 JavaScript 的坚实基础。
