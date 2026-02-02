---
title: "What is TypeScript?"
description: "An introduction to TypeScript and why it matters for modern JavaScript development."
---

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It was developed and is maintained by Microsoft.

## Why TypeScript?

JavaScript is a dynamically typed language, which means type checking happens at runtime. While this provides flexibility, it can lead to bugs that are only discovered when the code runs.

TypeScript adds **static type checking** to JavaScript, catching errors at compile time rather than runtime.

### Key Benefits

1. **Early Error Detection** - Catch bugs before your code runs
2. **Better IDE Support** - Enhanced autocomplete, refactoring, and navigation
3. **Self-Documenting Code** - Types serve as inline documentation
4. **Safer Refactoring** - The compiler catches breaking changes
5. **Gradual Adoption** - Use as much or as little as you need

## TypeScript vs JavaScript

Here's a simple comparison:

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

## How TypeScript Works

1. You write TypeScript code (`.ts` files)
2. The TypeScript compiler (`tsc`) checks for type errors
3. If no errors, it outputs JavaScript (`.js` files)
4. You run the JavaScript in any environment

The compiled JavaScript is clean and readable - TypeScript doesn't add any runtime overhead.

## When to Use TypeScript

TypeScript is particularly valuable for:
- Large codebases with multiple developers
- Long-term projects that need maintainability
- Applications where reliability is critical
- Teams coming from statically-typed languages

In the next chapter, we'll set up your development environment and create your first TypeScript project.
