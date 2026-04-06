# Blog Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

一个轻量级的静态博客生成器，用 Markdown 写作，构建出干净、快速的 HTML 站点。

---

## 简介

平时写技术博客，想要一个简单干净的站点。不需要数据库，不需要复杂配置， Markdown 文件直接变成网页。

这个工具就是做这个事的。

## 能做什么

**写作体验**
- Markdown + YAML 前言，专注内容
- 代码高亮，支持多种语言
- 标签、分类、归档，多维度组织文章

**阅读体验**  
- 目录导航，随阅读位置自动高亮
- 顶部进度条，知道读到哪里了
- 深色/浅色主题，自动跟随系统
- 移动端适配，手机上看也舒服

**功能扩展**
- YAML 配置，博客信息、友链、社交链接都可配
- Giscus 评论，基于 GitHub Discussions
- 本地搜索，无需后端

## 技术栈

- **构建**: Node.js + TypeScript + esbuild
- **Markdown**: marked + gray-matter
- **样式**: 原生 CSS，变量控制主题
- **图标**: Phosphor Icons

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式，实时预览
npm run dev

# 构建站点
npm run build
```

开发服务器在 http://localhost:3000

## 写作

在 `content/posts/` 下放 Markdown 文件：

```markdown
---
title: 文章标题
date: 2026-03-15
tags: ["前端", "TypeScript"]
category: 技术
---

正文内容，支持 **Markdown** 语法。

```typescript
console.log('Hello World');
```
```

## 配置

`content/blog.config.yml`：

```yaml
title: "我的博客"

about:
  avatar: "/images/avatar.png"
  description: "热爱技术的开发者"

social:
  github: "https://github.com/username"
  email: "email@example.com"

comments:
  provider: "giscus"
  repo: "username/blog-comments"
  repoId: "R_kgDOxxxxxx"
```

配置都是可选的，不配就不显示对应模块。

## 项目结构

```
blog-generator/
├── content/
│   ├── blog.config.yml   # 博客配置
│   └── posts/            # Markdown 文章
├── src/
│   ├── css/              # 样式
│   └── ts/               # TypeScript 源码
├── scripts/              # 构建脚本
└── dist/                 # 构建输出
```

## 部署

**GitHub Pages**

```bash
npm run build
# 将 dist/ 推送到 gh-pages 分支
```

**Vercel / Netlify**

- 构建命令: `npm run build`
- 输出目录: `dist`

## 自定义主题

修改 `src/css/blog.css`：

```css
:root {
  --bg-primary: #fafaf9;
  --text-primary: #1c1917;
  --border: #e7e5e4;
}
```

## 致谢

开发过程中使用了 [Kimi](https://kimi.moonshot.cn/) 辅助代码生成和问题解决。

## License

MIT
