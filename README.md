# Blog Generator

基于 Node.js + TypeScript 的静态博客生成器，将 Markdown 文件转换为预渲染的 HTML 静态站点。

## 功能特性

- ✅ **SSG 静态站点生成** - 构建时生成纯 HTML 文件
- ✅ **Markdown + YAML** - 支持 Front Matter 元数据
- ✅ **TypeScript** - 类型安全的客户端代码
- ✅ **代码高亮** - 使用 highlight.js
- ✅ **归档/标签/分类** - 多维度内容组织，支持多重筛选
- ✅ **文章搜索** - 客户端实时搜索
- ✅ **目录导航** - 自动滚动跟随阅读位置
- ✅ **阅读进度** - 顶部进度条显示
- ✅ **深色/浅色主题** - 自动切换和记忆
- ✅ **响应式设计** - 移动端友好
- ✅ **YAML 配置** - 博客信息、友链、社交、评论等可配置
- ✅ **Giscus 评论** - 基于 GitHub Discussions 的评论系统

## 技术栈

- **构建**: Node.js + TypeScript + esbuild
- **Markdown 解析**: marked + gray-matter
- **代码高亮**: highlight.js
- **样式**: 原生 CSS (CSS Variables)
- **图标**: Phosphor Icons
- **配置**: YAML

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

启动开发服务器，监听文件变化自动重新构建：

```bash
npm run dev
```

访问 http://localhost:3000

### 构建

生成静态站点到 `dist/` 目录：

```bash
npm run build
```

### 预览

本地预览构建结果：

```bash
npm run preview
```

访问 http://localhost:4173

## 配置文件

在 `content/blog.config.yml` 中配置博客信息：

```yaml
# 博客标题（可选，默认 "My Blog"）
title: "我的博客"

# 关于我（可选）
about:
  avatar: "/images/avatar.png"
  description: "热爱技术的开发者..."

# 友链（可选）
friends:
  - name: "GitHub"
    url: "https://github.com"

# 社交链接（可选）
social:
  github: "https://github.com/username"
  email: "email@example.com"
  twitter: "https://twitter.com/username"
  rss: "/feed.xml"

# 评论系统（可选，支持 Giscus）
comments:
  provider: "giscus"
  repo: "username/blog-comments"
  repoId: "R_kgDOxxxxxx"
  category: "Announcements"
  categoryId: "DIC_kwDOxxxxxx"
```

## 文章格式

在 `content/posts/` 目录创建 Markdown 文件，使用 YAML Front Matter：

```markdown
---
title: 文章标题
date: 2026-03-15
summary: 文章摘要，显示在列表页
tags: ["标签1", "标签2"]
category: 分类名称
published: true          # 是否发布
origin: original         # original 原创 | repost 转载
source: https://...      # 转载时填写原文链接
---

# 正文标题

正文内容支持 **Markdown** 语法。

```javascript
// 代码块也会被高亮
console.log('Hello World');
```


## 目录结构

```
blog-generator/
├── package.json
├── README.md
├── scripts/
│   ├── build.js          # 构建脚本
│   ├── dev-server.js     # 开发服务器
│   └── preview-server.js # 预览服务器
├── src/
│   ├── css/
│   │   └── blog.css      # 样式文件
│   └── ts/               # TypeScript 源码
│       ├── components/   # 组件
│       ├── pages/        # 页面逻辑
│       └── api/          # API 层
├── content/
│   ├── blog.config.yml   # 博客配置
│   └── posts/            # Markdown 文章
├── dist/                 # 构建输出（自动生成）
└── node_modules/
```

## 部署

### GitHub Pages

```bash
# 构建
npm run build

# 将 dist/ 目录内容推送到 gh-pages 分支
# 或使用 GitHub Actions 自动部署
```

### Vercel / Netlify

1. 导入 GitHub 仓库
2. 构建命令: `npm run build`
3. 输出目录: `dist`

### 手动部署

```bash
npm run build
# 将 dist/ 目录内容上传到任意静态托管服务
```

## 自定义主题

编辑 `src/css/blog.css` 中的 CSS 变量：

```css
:root {
  --bg-primary: #fafaf9;
  --bg-secondary: #f5f5f4;
  --text-primary: #1c1917;
  --text-secondary: #57534e;
  --border: #e7e5e4;
}

.dark {
  --bg-primary: #0c0a09;
  --bg-secondary: #1c1917;
  --text-primary: #fafaf9;
  --text-secondary: #a8a29e;
  --border: #292524;
}
```

## 致谢

本项目在开发过程中使用了 [Kimi](https://kimi.moonshot.cn/) (Moonshot AI) 的辅助。

代码生成、架构设计和问题排查等环节得到了 Kimi 的大力支持。

## License

MIT
