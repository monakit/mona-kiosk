---
title: "Basic Types"
description: "Learn TypeScript's fundamental types: primitives, arrays, tuples, and more."
---

TypeScript provides several basic types that form the foundation of its type system.

## Primitive Types

### String, Number, Boolean

```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;

// Type inference - TypeScript can figure out the type
let city = "New York"; // inferred as string
```

### Null and Undefined

```typescript
let nothing: null = null;
let notDefined: undefined = undefined;

// With strictNullChecks, you must handle null explicitly
let maybeString: string | null = null;
```

## Arrays

Two ways to define arrays:

```typescript
// Using square brackets
let numbers: number[] = [1, 2, 3];
let names: string[] = ["Alice", "Bob"];

// Using generic syntax
let scores: Array<number> = [95, 87, 92];
```

## Tuples

Fixed-length arrays with specific types at each position:

```typescript
let person: [string, number] = ["Alice", 30];
let coordinate: [number, number, number] = [10, 20, 30];

// Access by index
console.log(person[0]); // "Alice"
console.log(person[1]); // 30
```

## Enums

Named constants:

```typescript
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

let move: Direction = Direction.Up;

// String enums
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}
```

## Any and Unknown

### Any - Escape Hatch

```typescript
let anything: any = 4;
anything = "string"; // OK
anything = false; // OK

// Dangerous: no type checking
anything.foo.bar; // No error, but may crash at runtime
```

### Unknown - Safer Alternative

```typescript
let uncertain: unknown = 4;
uncertain = "string"; // OK

// Must narrow the type before using
if (typeof uncertain === "string") {
  console.log(uncertain.toUpperCase()); // OK
}
```

## Void and Never

### Void - No Return Value

```typescript
function logMessage(message: string): void {
  console.log(message);
  // No return statement
}
```

### Never - Never Returns

```typescript
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

## Type Assertions

Tell TypeScript you know better:

```typescript
let someValue: unknown = "hello";

// Two syntaxes
let strLength1: number = (someValue as string).length;
let strLength2: number = (<string>someValue).length;
```

## Object Types

Inline object types:

```typescript
let user: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// Optional properties
let config: { debug?: boolean; timeout: number } = {
  timeout: 3000,
};
```

## Union Types

A value that can be one of several types:

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

## Literal Types

Exact values as types:

```typescript
let direction: "north" | "south" | "east" | "west";
direction = "north"; // OK
direction = "up"; // Error

let httpStatus: 200 | 404 | 500;
```

## Summary

| Type | Example | Use Case |
|------|---------|----------|
| `string` | `"hello"` | Text data |
| `number` | `42`, `3.14` | Numeric data |
| `boolean` | `true`, `false` | Flags |
| `array` | `number[]` | Lists |
| `tuple` | `[string, number]` | Fixed structures |
| `enum` | `Direction.Up` | Named constants |
| `any` | Anything | Escape hatch (avoid) |
| `unknown` | Anything | Safe unknown values |
| `void` | No value | No return |
| `never` | Never happens | Errors, infinite loops |

In the next chapter, we'll explore interfaces and type aliases for defining complex types.
