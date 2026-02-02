---
title: 'Markdown Style Guide'
description: 'Astro で Markdown コンテンツを書く際に使える、基本的な Markdown 構文のサンプルです。'
pubDate: 'Jun 19 2024'
heroImage: '../../../assets/blog-placeholder-1.jpg'
price: 100
downloads:
  - title: "gunda-generated"
    file: "/Users/hujian/Downloads/gunda-generated.jpeg"
    description: "gunda 生成ファイル"
  - title: "first-post.md"
    file: "first-post.md"
    description: "first-post.md ファイル"
  - title: "雍正御批"
    file: "/Users/hujian/Downloads/xxx.jpg"
    description: "雍正帝の朱批"
---

以下は Astro で Markdown コンテンツを書く際に使える、基本的な Markdown 構文の例です。

## 見出し

次の HTML `<h1>`—`<h6>` 要素は 6 段階の見出しを表します。`<h1>` が最上位、`<h6>` が最下位です。

# H1

## H2

### H3

#### H4

##### H5

###### H6

## 段落

ここは段落の見え方を確認するためのサンプルテキストです。行間や段落間隔、可読性の確認に使えます。

## 画像

### 構文

```markdown
![Alt text](./full/or/relative/path/of/image)
```

### 出力

![blog placeholder](../../../assets/blog-placeholder-about.jpg)

## 引用

引用ブロックは他のソースから引用した内容を表します。必要に応じて引用元を含めることができ（`footer` または `cite` に配置）、注釈などのインライン変更も含められます。

### 署名なしの引用

#### 構文

```markdown
> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.
```

#### 出力

> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.

### 署名付きの引用

#### 構文

```markdown
> Don't communicate by sharing memory, share memory by communicating.<br>
> — <cite>Rob Pike[^1]</cite>
```

#### 出力

> Don't communicate by sharing memory, share memory by communicating.<br>
> — <cite>Rob Pike[^1]</cite>

[^1]: 上記の引用は 2015 年 11 月 18 日の Gopherfest における Rob Pike の[講演](https://www.youtube.com/watch?v=PAAkCSZUG1c)からの抜粋です。

## 表

### 構文

```markdown
| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |
```

### 出力

| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |

## コードブロック

### 構文

新しい行で 3 つのバッククォート ``` を使って開始し、別の行で 3 つのバッククォートで終了します。言語名（html、javascript、css、markdown、typescript、txt、bash など）を最初の 3 つのバッククォートの後に書くと、その言語の構文がハイライトされます。

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

### 出力

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

## リストの種類

### 番号付きリスト

#### 構文

```markdown
1. 最初の項目
2. 2 番目の項目
3. 3 番目の項目
```

#### 出力

1. 最初の項目
2. 2 番目の項目
3. 3 番目の項目

### 箇条書きリスト

#### 構文

```markdown
- リスト項目
- 別の項目
- さらに別の項目
```

#### 出力

- リスト項目
- 別の項目
- さらに別の項目

### ネストしたリスト

#### 構文

```markdown
- 果物
  - りんご
  - オレンジ
  - バナナ
- 乳製品
  - 牛乳
  - チーズ
```

#### 出力

- 果物
  - りんご
  - オレンジ
  - バナナ
- 乳製品
  - 牛乳
  - チーズ

## その他の要素 — abbr、sub、sup、kbd、mark

### 構文

```markdown
<abbr title="Graphics Interchange Format">GIF</abbr> はビットマップ画像形式です。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

<kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> を押してセッションを終了します。

多くの <mark>サンショウウオ</mark> は夜行性で、昆虫やミミズなどの小さな生き物を捕食します。
```

### 出力

<abbr title="Graphics Interchange Format">GIF</abbr> はビットマップ画像形式です。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

<kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> を押してセッションを終了します。

多くの <mark>サンショウウオ</mark> は夜行性で、昆虫やミミズなどの小さな生き物を捕食します。
