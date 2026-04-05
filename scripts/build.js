#!/usr/bin/env node
/**
 * Blog Generator - Build Script
 * SSG 静态站点构建脚本 - Shadcn UI Style
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// 配置 marked
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true
});

/**
 * 确保目录存在
 */
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 复制静态资源
 */
async function copyStatic() {
  // 复制 CSS
  const cssSrc = path.join(SRC_DIR, 'css', 'blog.css');
  const cssDest = path.join(DIST_DIR, 'css', 'blog.css');
  
  try {
    await fs.access(cssSrc);
    await ensureDir(path.join(DIST_DIR, 'css'));
    await fs.copyFile(cssSrc, cssDest);
    console.log(`✓ 复制 css/blog.css`);
  } catch {
    // 文件不存在，跳过
  }
  
  // 确保 dist/js 目录存在（TypeScript 构建已生成 app.js）
  const jsDestDir = path.join(DIST_DIR, 'js');
  await ensureDir(jsDestDir);
  
  // 如果根目录有额外的 JS 文件，也复制过去
  const rootJsDir = path.join(ROOT_DIR, 'js');
  try {
    await fs.access(rootJsDir);
    const files = await fs.readdir(rootJsDir);
    for (const file of files) {
      const srcPath = path.join(rootJsDir, file);
      const destPath = path.join(jsDestDir, file);
      const stat = await fs.stat(srcPath);
      if (stat.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch {
    // 目录不存在，跳过
  }
}

/**
 * 递归复制目录
 */
async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * 扫描所有文章
 */
async function scanPosts() {
  const posts = [];
  
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(POSTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data, content: body } = matter(content);
      
      // 跳过未发布的文章
      if (data.published === false) continue;
      
      const id = file.replace('.md', '');
      
      posts.push({
        id,
        meta: {
          title: data.title || '无标题',
          date: data.date || new Date().toISOString(),
          summary: data.summary || '',
          tags: data.tags || [],
          category: data.category || '未分类',
          published: data.published !== false,
          origin: data.origin || 'original',
          source: data.source || null
        },
        body,
        html: marked(body)
      });
    }
  } catch (error) {
    console.error('扫描文章失败:', error);
  }
  
  // 按日期倒序排序
  return posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return {
    full: date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    short: date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric' 
    }),
    iso: date.toISOString().split('T')[0],
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

/**
 * 生成摘要
 */
function generateExcerpt(body, maxLength = 150) {
  const plain = body
    .replace(/#+ /g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength) + '...';
}

/**
 * HTML 模板 - Developer Editorial Style
 */
function getBaseTemplate() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - My Blog</title>
    <meta name="description" content="{{description}}">
    
    <!-- Code Highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" id="hljs-light">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" id="hljs-dark" disabled>
    
    <!-- Phosphor Icons -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    
    <!-- Styles -->
    <link rel="stylesheet" href="/css/blog.css">
</head>
<body>
    {{nav}}
    <main>
        {{content}}
    </main>
    {{footer}}
    <button id="backToTop" class="back-to-top" aria-label="回到顶部">↑</button>
    <script src="/js/app.js"></script>
</body>
</html>`;
}

/**
 * 导航组件 - Developer Editorial Style
 */
function getNav(currentPage = 'home') {
  const navContainerStyle = currentPage === 'post' ? 'max-width: 720px;' : '';
  
  return `
    <nav class="nav-bar">
        <div class="nav-container" style="${navContainerStyle}">
            <div class="flex items-center gap-8">
                ${currentPage === 'post' ? `
                <a href="/" class="nav-link" style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary);">
                    <span>←</span>
                    <span>返回</span>
                </a>
                ` : `
                <a href="/" class="nav-brand">
                    <span class="brand-icon">B</span>
                    <span>My Blog</span>
                </a>
                `}
            </div>
            <div class="nav-actions">
                <button id="searchToggle" class="icon-btn" aria-label="搜索 (Cmd+K)">
                    <i class="ph ph-magnifying-glass" style="font-size: 18px;"></i>
                </button>
                <button id="themeToggle" class="icon-btn" aria-label="切换主题">◐</button>
            </div>
        </div>
        <!-- Search Panel -->
        <div id="searchPanel" class="search-panel">
            <div class="search-wrapper">
                <div class="search-input-wrapper">
                    <span class="search-icon"><i class="ph ph-magnifying-glass" style="font-size: 16px;"></i></span>
                    <input type="text" id="searchInput" placeholder="搜索文章..." class="search-input">
                    <kbd class="search-shortcut">ESC</kbd>
                </div>
                <div id="searchResults" class="search-results"></div>
            </div>
        </div>
    </nav>`;
}

/**
 * 页脚组件 - Developer Editorial Style
 */
function getFooter(isPost = false) {
  const containerStyle = isPost ? 'max-width: 720px;' : '';
  
  return `
    <footer class="footer">
        <div class="footer-container" style="${containerStyle}">
            <div class="footer-grid">
                <div class="footer-about">
                    <h4 class="footer-title">关于</h4>
                    <p class="footer-desc">热爱技术的开发者，分享编程心得与技术思考。记录学习历程，探索代码之美。</p>
                </div>
                <div class="footer-links-group">
                    <h4 class="footer-title">友情链接</h4>
                    <ul class="footer-friends">
                        <li><a href="#" target="_blank">Example Blog</a></li>
                        <li><a href="#" target="_blank">Tech Daily</a></li>
                        <li><a href="#" target="_blank">Code Share</a></li>
                    </ul>
                </div>
                <div class="footer-contact">
                    <h4 class="footer-title">联系方式</h4>
                    <div class="footer-social">
                        <a href="#" target="_blank" class="footer-link" aria-label="GitHub">
                            <i class="ph ph-github-logo"></i>
                        </a>
                        <a href="mailto:example@email.com" class="footer-link" aria-label="Email">
                            <i class="ph ph-envelope"></i>
                        </a>
                        <a href="#" target="_blank" class="footer-link" aria-label="Twitter">
                            <i class="ph ph-twitter-logo"></i>
                        </a>
                        <a href="#" target="_blank" class="footer-link" aria-label="RSS">
                            <i class="ph ph-rss"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p class="footer-copyright">© ${new Date().getFullYear()} My Blog. All rights reserved.</p>
            </div>
        </div>
    </footer>`;
}

/**
 * 生成文章列表页面
 */
async function generateIndexPage(posts, tags, categories, archives) {
  const postsHTML = posts.map(post => {
    const date = formatDate(post.meta.date);
    const originText = post.meta.origin === 'original' ? '原创' : '转载';
    const summary = post.meta.summary || generateExcerpt(post.body);
    const tagsHTML = post.meta.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('');
    
    return `
      <article class="post-item">
          <div class="post-meta">
              <span class="post-category">${post.meta.category || '未分类'}</span>
              <span class="post-date">${date.full}</span>
              <span class="post-origin" data-origin="${post.meta.origin}">${originText}</span>
          </div>
          <h2 class="post-title">
              <a href="/posts/${post.id}.html">${post.meta.title}</a>
          </h2>
          <p class="post-summary">${summary}</p>
          ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
      </article>
    `;
  }).join('');

  const sidebarHTML = `
    <aside class="sidebar-section">
        <div class="sidebar-block">
            <h3 class="sidebar-title">归档</h3>
            <ul class="sidebar-list" data-type="archive">
                ${Array.from(archives.values()).map(a => `
                    <li data-value="${a.key}" data-label="${a.label}">
                        <span>${a.label}</span>
                        <span class="sidebar-count">${a.count}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="sidebar-block">
            <h3 class="sidebar-title">标签</h3>
            <div class="tag-cloud" data-type="tag">
                ${Array.from(tags).map(([tag, count]) => `
                    <span class="tag-item" data-value="${tag}">${tag}<span class="tag-count">${count}</span></span>
                `).join('')}
            </div>
        </div>
        <div class="sidebar-block">
            <h3 class="sidebar-title">分类</h3>
            <ul class="sidebar-list" data-type="category">
                ${Array.from(categories).map(([cat, count]) => `
                    <li data-value="${cat}" data-label="${cat}">
                        <span>${cat}</span>
                        <span class="sidebar-count">${count}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    </aside>
  `;

  const content = `
    <div class="max-w-6xl mx-auto px-6" style="padding-top: var(--space-8);">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
            ${sidebarHTML}
            <div class="lg:col-span-9">
                <div class="posts-container">
                    ${postsHTML}
                </div>
            </div>
        </div>
    </div>
  `;

  let html = getBaseTemplate()
    .replace('{{title}}', '首页')
    .replace('{{description}}', '个人博客，分享技术思考与实践')
    .replace('{{nav}}', getNav('home'))
    .replace('{{content}}', content)
    .replace('{{footer}}', getFooter());

  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
  console.log('✓ 生成 index.html');
}

/**
 * 生成文章详情页面
 */
async function generatePostPage(post, prev, next) {
  const date = formatDate(post.meta.date);
  const originText = post.meta.origin === 'original' ? '原创' : '转载';
  
  const content = `
    <article class="max-w-3xl mx-auto px-6 pb-20">
        <header class="post-header">
            <div class="post-header-content">
                <div class="post-header-meta">
                    <span class="post-category">${post.meta.category || '未分类'}</span>
                    <span class="post-date">${date.full}</span>
                    <span class="post-origin" data-origin="${post.meta.origin}">${originText}</span>
                </div>
                <h1 class="post-header-title">${post.meta.title}</h1>
                ${post.meta.summary ? `<p class="post-header-summary">${post.meta.summary}</p>` : ''}
            </div>
        </header>

        <!-- TOC Container - Desktop Only -->
        <div id="tocContainer" class="toc-container">
            <div class="toc-sticky">
                <h4 class="toc-title">目录</h4>
                <nav id="tocNav" class="toc-nav"></nav>
            </div>
        </div>

        <div class="post-content" id="postContent">
            ${post.html}
        </div>

        <footer class="post-footer">
            ${post.meta.tags.length ? `
                <div class="post-footer-tags">
                    <span class="post-footer-label">标签:</span>
                    ${post.meta.tags.map(tag => `<a href="/" class="post-footer-tag">${tag}</a>`).join('')}
                </div>
            ` : ''}
        </footer>

        <nav class="post-nav">
            ${prev ? `
                <a href="/posts/${prev.id}.html" class="post-nav-item">
                    <div class="post-nav-label">← 上一篇</div>
                    <div class="post-nav-title">${prev.meta.title}</div>
                </a>
            ` : '<div></div>'}
            ${next ? `
                <a href="/posts/${next.id}.html" class="post-nav-item next">
                    <div class="post-nav-label">下一篇 →</div>
                    <div class="post-nav-title">${next.meta.title}</div>
                </a>
            ` : '<div></div>'}
        </nav>

        <section class="comments-section">
            <h3 class="comments-title">评论</h3>
            <div class="comments-list">
                <div class="comments-empty">
                    <p>评论功能需要接入外部服务</p>
                </div>
            </div>
        </section>
    </article>
  `;

  let html = getBaseTemplate()
    .replace('{{title}}', post.meta.title)
    .replace('{{description}}', post.meta.summary || generateExcerpt(post.body))
    .replace('{{nav}}', getNav('post'))
    .replace('{{content}}', content)
    .replace('{{footer}}', getFooter(true));

  const postDir = path.join(DIST_DIR, 'posts');
  await ensureDir(postDir);
  await fs.writeFile(path.join(postDir, `${post.id}.html`), html);
  console.log(`✓ 生成 posts/${post.id}.html`);
}

/**
 * 生成数据文件（供搜索使用）
 */
async function generateDataFile(posts) {
  const data = posts.map(p => ({
    id: p.id,
    meta: p.meta,
    excerpt: generateExcerpt(p.body, 300),
    html: p.html
  }));
  
  await fs.writeFile(
    path.join(DIST_DIR, 'posts.json'),
    JSON.stringify(data, null, 2)
  );
  console.log('✓ 生成 posts.json');
}

/**
 * 主构建函数
 */
async function build() {
  console.log('🚀 开始构建...\n');
  
  // 清理 dist 目录（但保留 js/app.js，因为它由 TypeScript 构建生成）
  try {
    const files = await fs.readdir(DIST_DIR);
    for (const file of files) {
      if (file === 'js') continue; // 保留 js 目录（包含 TypeScript 构建的 app.js）
      const filePath = path.join(DIST_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    }
  } catch {
    // dist 目录不存在，创建它
    await ensureDir(DIST_DIR);
  }
  console.log('✓ 准备 dist 目录\n');
  
  // 扫描文章
  console.log('📄 扫描文章...');
  const posts = await scanPosts();
  console.log(`✓ 找到 ${posts.length} 篇文章\n`);
  
  // 统计标签、分类、归档
  const tags = new Map();
  const categories = new Map();
  const archives = new Map();
  
  posts.forEach(post => {
    // 标签
    post.meta.tags.forEach(tag => {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    });
    
    // 分类
    const cat = post.meta.category;
    categories.set(cat, (categories.get(cat) || 0) + 1);
    
    // 归档
    const date = new Date(post.meta.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (!archives.has(key)) {
      archives.set(key, { key, label, count: 0 });
    }
    archives.get(key).count++;
  });
  
  // 生成页面
  console.log('📦 生成页面...');
  await generateIndexPage(
    posts,
    Array.from(tags.entries()).sort((a, b) => b[1] - a[1]),
    Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    Array.from(archives.values()).sort((a, b) => b.key.localeCompare(a.key))
  );
  
  // 生成每篇文章
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prev = i < posts.length - 1 ? posts[i + 1] : null;
    const next = i > 0 ? posts[i - 1] : null;
    await generatePostPage(post, prev, next);
  }
  
  // 生成数据文件
  await generateDataFile(posts);
  
  // 复制静态资源
  console.log('\n📂 复制静态资源...');
  await copyStatic();
  
  console.log('\n✅ 构建完成！输出目录: dist/');
}

// 执行构建
build().catch(error => {
  console.error('❌ 构建失败:', error);
  process.exit(1);
});
