---
title: 'Markdown Style Guide'
description: '这是一些基础 Markdown 语法示例，可用于在 Astro 中编写 Markdown 内容。'
pubDate: 'Jun 19 2024'
heroImage: '../../../assets/blog-placeholder-1.jpg'
price: 100
downloads:
  - title: "gunda-generated"
    file: "/Users/hujian/Downloads/gunda-generated.jpeg"
    description: "gunda 生成文件"
  - title: "first-post.md"
    file: "first-post.md"
    description: "first-post.md 文件"
  - title: "雍正御批"
    file: "/Users/hujian/Downloads/xxx.jpg"
    description: "雍正御批"
---

下面是一些基础 Markdown 语法示例，可用于在 Astro 中编写 Markdown 内容。

## 标题

以下 HTML `<h1>`—`<h6>` 元素代表六级标题。`<h1>` 是最高级标题，而 `<h6>` 是最低级。

# H1

## H2

### H3

#### H4

##### H5

###### H6

## 段落

这里是一段示例文本，用于展示段落在页面中的排版效果。你可以通过它观察行距、段落间距以及整体可读性。

## 图片

### 语法

```markdown
![Alt text](./full/or/relative/path/of/image)
```

### 输出

![blog placeholder](../../../assets/blog-placeholder-about.jpg)

## 引用

引用块元素表示来自其他来源的内容，可选地包含引用来源（必须放在 `footer` 或 `cite` 中），也可以包含内联修改或注释。

### 不含署名的引用

#### 语法

```markdown
> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.
```

#### 输出

> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.

### 含署名的引用

#### 语法

```markdown
> Don't communicate by sharing memory, share memory by communicating.<br>
> — <cite>Rob Pike[^1]</cite>
```

#### 输出

> Don't communicate by sharing memory, share memory by communicating.<br>
> — <cite>Rob Pike[^1]</cite>

[^1]: 上述引文摘自 Rob Pike 在 2015 年 11 月 18 日 Gopherfest 的演讲：[talk](https://www.youtube.com/watch?v=PAAkCSZUG1c)。

## 表格

### 语法

```markdown
| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |
```

### 输出

| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |

## 代码块

### 语法

我们可以在新行使用 3 个反引号 ``` 开始代码块，在另一行用 3 个反引号结束。若要高亮指定语言的语法，在首行的三个反引号后写语言名，例如 html、javascript、css、markdown、typescript、txt、bash。

````markdown
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example HTML5 Document</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```
````

### 输出

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example HTML5 Document</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```

## 列表类型

### 有序列表

#### 语法

```markdown
1. 第一项
2. 第二项
3. 第三项
```

#### 输出

1. 第一项
2. 第二项
3. 第三项

### 无序列表

#### 语法

```markdown
- 列表项
- 另一个项
- 再一个项
```

#### 输出

- 列表项
- 另一个项
- 再一个项

### 嵌套列表

#### 语法

```markdown
- 水果
  - 苹果
  - 橙子
  - 香蕉
- 乳制品
  - 牛奶
  - 奶酪
```

#### 输出

- 水果
  - 苹果
  - 橙子
  - 香蕉
- 乳制品
  - 牛奶
  - 奶酪

## 其他元素 — abbr、sub、sup、kbd、mark

### 语法

```markdown
<abbr title="Graphics Interchange Format">GIF</abbr> 是一种位图图像格式。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

按下 <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> 结束会话。

大多数 <mark>蝾螈</mark> 在夜间活动，并捕食昆虫、蠕虫以及其他小型生物。
```

### 输出

<abbr title="Graphics Interchange Format">GIF</abbr> 是一种位图图像格式。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

按下 <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> 结束会话。

大多数 <mark>蝾螈</mark> 在夜间活动，并捕食昆虫、蠕虫以及其他小型生物。
