---
title: "Interfaces and Type Aliases"
description: "Define custom types using interfaces and type aliases for better code organization."
---

Interfaces and type aliases let you define custom types that describe the shape of objects and other data structures.

## Interfaces

Interfaces define the structure of an object:

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

### Optional Properties

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

### Readonly Properties

```typescript
interface Point {
  readonly x: number;
  readonly y: number;
}

const origin: Point = { x: 0, y: 0 };
// origin.x = 5; // Error: Cannot assign to 'x' because it is a read-only property
```

### Extending Interfaces

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

### Multiple Inheritance

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

## Type Aliases

Type aliases create a new name for any type:

```typescript
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: string) => void;

let userId: ID = "abc123";
let position: Point = { x: 10, y: 20 };
```

### Union and Intersection Types

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

## Interface vs Type Alias

Both can define object shapes, but they have differences:

### Declaration Merging (Interface only)

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

### Computed Properties (Type only)

```typescript
type Keys = "firstname" | "lastname";
type Person = {
  [key in Keys]: string;
};
// { firstname: string; lastname: string; }
```

### When to Use Which

| Use Interface | Use Type Alias |
|---------------|----------------|
| Object shapes | Unions, intersections |
| Class contracts | Primitive aliases |
| Declaration merging needed | Computed properties |
| Public API definitions | Complex type compositions |

## Function Types

Both can define function signatures:

```typescript
// Interface
interface GreetFunction {
  (name: string): string;
}

// Type alias
type GreetFn = (name: string) => string;

const greet: GreetFn = (name) => `Hello, ${name}!`;
```

## Index Signatures

For objects with dynamic keys:

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

## Utility Types

TypeScript provides built-in utility types:

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

## Real-World Example

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

## Summary

- **Interfaces** are best for defining object shapes and class contracts
- **Type aliases** are more flexible and can represent any type
- Use **declaration merging** when you need to extend third-party types
- Use **utility types** to transform existing types
- Prefer interfaces for public APIs (better error messages)

Congratulations! You've completed the TypeScript Fundamentals course. You now have a solid foundation to write type-safe JavaScript code.
