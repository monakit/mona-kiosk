---
title: "Setting Up Your Environment"
description: "Learn how to install TypeScript and configure your development environment."
---

Let's get your development environment ready for TypeScript development.

## Prerequisites

Before we start, make sure you have:
- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- A code editor (we recommend **VS Code**)

## Installing TypeScript

You can install TypeScript globally or as a project dependency.

### Global Installation

```bash
npm install -g typescript
```

Verify the installation:

```bash
tsc --version
```

### Project-Local Installation (Recommended)

```bash
mkdir my-ts-project
cd my-ts-project
npm init -y
npm install typescript --save-dev
```

## Creating Your First TypeScript File

Create a file called `hello.ts`:

```typescript
function sayHello(name: string): void {
  console.log(`Hello, ${name}!`);
}

sayHello("TypeScript");
```

Compile it:

```bash
npx tsc hello.ts
```

This creates `hello.js`:

```javascript
function sayHello(name) {
  console.log("Hello, ".concat(name, "!"));
}
sayHello("TypeScript");
```

Run it:

```bash
node hello.js
```

## TypeScript Configuration

For real projects, you'll want a `tsconfig.json` file:

```bash
npx tsc --init
```

This creates a configuration file with many options. Here's a minimal setup:

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

### Key Options Explained

| Option | Description |
|--------|-------------|
| `target` | JavaScript version to compile to |
| `module` | Module system (commonjs, ES modules, etc.) |
| `strict` | Enable all strict type checking |
| `outDir` | Where compiled JS files go |
| `rootDir` | Where your TS source files are |

## VS Code Setup

VS Code has excellent TypeScript support built-in. For the best experience:

1. Install the **ESLint** extension
2. Install the **Prettier** extension
3. Enable "Format on Save" in settings

## Project Structure

A typical TypeScript project structure:

```
my-project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── dist/           # Compiled JS (generated)
├── node_modules/
├── package.json
└── tsconfig.json
```

You're now ready to write TypeScript! In the next chapter, we'll explore TypeScript's type system.
