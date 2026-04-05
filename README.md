# Blog Generator

基于 Node.js 的静态博客生成器，将 Markdown 文件转换为预渲染的 HTML 静态站点。

## 功能特性

- ✅ **SSG 静态站点生成** - 构建时生成纯 HTML 文件
- ✅ **Markdown + YAML** - 支持 Front Matter 元数据
- ✅ **代码高亮** - 使用 highlight.js
- ✅ **归档/标签/分类** - 多维度内容组织
- ✅ **文章搜索** - 客户端搜索支持
- ✅ **深色/浅色主题** - 自动切换和记忆
- ✅ **响应式设计** - 移动端友好
- ✅ **现代 SaaS 风格** - 极简、干净、圆角设计

## 技术栈

- **构建**: Node.js + 原生 ESM
- **Markdown 解析**: marked + gray-matter
- **代码高亮**: highlight.js
- **样式**: 原生 CSS (CSS Variables)
- **图标**: Font Awesome

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
│   └── js/
│       └── main.js       # 客户端交互
├── content/
│   └── posts/            # Markdown 文章
├── dist/                 # 构建输出（自动生成）
└── node_modules/
```

## 工作原理

1. **构建时**: `scripts/build.js` 扫描 `content/posts/` 目录
2. **解析**: 使用 `gray-matter` 解析 YAML Front Matter
3. **渲染**: 使用 `marked` 将 Markdown 转为 HTML
4. **生成**: 为每篇文章生成独立的 HTML 文件
5. **输出**: 静态资源复制到 `dist/` 目录

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

## 自定义配置

### 修改品牌色

编辑 `src/css/blog.css`：

```css
:root {
  --brand: #0FA847;        /* 品牌主色 */
  --brand-light: #dcfce7;
  --brand-dark: #0d8f3d;
}
```

### 修改网站信息

编辑 `scripts/build.js` 中的模板部分：

```javascript
const siteConfig = {
  title: 'My Blog',
  description: '个人博客',
  author: 'Your Name'
};
```

## 评论系统

当前为占位符，可接入：

- **Giscus** (推荐): https://giscus.app/ - 基于 GitHub Discussions
- **Utterances**: https://utteranc.es/ - 基于 GitHub Issues
- **Disqus**: https://disqus.com/

将评论代码片段添加到 `scripts/build.js` 中的评论区域模板。

## License

MIT
