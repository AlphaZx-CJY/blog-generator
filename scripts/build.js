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
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const CONFIG_FILE = path.join(ROOT_DIR, 'content', 'blog.config.yml');

/**
 * 加载博客配置
 */
async function loadConfig() {
  const defaultConfig = {
    title: 'My Blog',
    about: null,
    friends: [],
    social: null,
    comments: null,
    rss: null
  };
  
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = yaml.load(content) || {};
    
    // 处理 RSS 配置
    const rssConfig = config.rss || null;
    let socialConfig = config.social || null;
    
    // 如果启用了自动生成 RSS，且 social 中没有配置 rss 链接，则自动添加
    if (rssConfig && rssConfig.enabled) {
      const rssFilename = rssConfig.filename || 'feed.xml';
      const rssUrl = `/${rssFilename}`;
      
      if (!socialConfig) {
        socialConfig = { rss: rssUrl };
      } else if (!socialConfig.rss) {
        socialConfig = { ...socialConfig, rss: rssUrl };
      }
    }
    
    return {
      title: config.title || defaultConfig.title,
      about: config.about || defaultConfig.about,
      friends: config.friends || defaultConfig.friends,
      social: socialConfig,
      comments: config.comments || defaultConfig.comments,
      rss: rssConfig
    };
  } catch {
    // 配置文件不存在或解析失败，使用默认配置
    return defaultConfig;
  }
}

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
function getBaseTemplate(blogTitle = 'My Blog', basePath = './') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - ${blogTitle}</title>
    <meta name="description" content="{{description}}">
    
    <!-- Code Highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" id="hljs-light">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" id="hljs-dark" disabled>
    
    <!-- Phosphor Icons -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    
    <!-- Styles -->
    <link rel="stylesheet" href="${basePath}css/blog.css">
</head>
<body>
    {{nav}}
    <main>
        {{content}}
    </main>
    {{footer}}
    <button id="backToTop" class="back-to-top" aria-label="回到顶部">↑</button>
    <script src="${basePath}js/app.js"></script>
</body>
</html>`;
}

/**
 * 导航组件 - Developer Editorial Style
 */
function getNav(currentPage = 'home', blogTitle = 'My Blog') {
  const navContainerStyle = currentPage === 'post' ? 'max-width: 720px;' : '';
  const readingProgress = currentPage === 'post' ? `
        <div class="reading-progress-container">
            <div class="reading-progress-bar" id="readingProgress"></div>
        </div>
  ` : '';
  
  return `
    <nav class="nav-bar">
        ${readingProgress}
        <div class="nav-container" style="${navContainerStyle}">
            <div class="flex items-center gap-8">
                ${currentPage === 'post' ? `
                <a href="../" class="nav-link" style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary);">
                    <span>←</span>
                    <span>返回</span>
                </a>
                ` : `
                <a href="./" class="nav-brand">
                    <span class="brand-icon">B</span>
                    <span>${blogTitle}</span>
                </a>
                `}
            </div>
            <div class="nav-actions">
                <button id="searchToggle" class="icon-btn" aria-label="搜索 (Cmd+K)">
                    <i class="ph ph-magnifying-glass" style="font-size: 18px;"></i>
                </button>
                <button id="themeToggle" class="icon-btn" aria-label="切换主题"><i class="ph ph-sun" style="font-size: 18px;"></i></button>
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
 * 生成社交链接 HTML
 */
function generateSocialHTML(social) {
  const iconMap = {
    github: 'ph-github-logo',
    email: 'ph-envelope',
    twitter: 'ph-twitter-logo',
    rss: 'ph-rss',
    linkedin: 'ph-linkedin-logo',
    weibo: 'ph-globe'
  };
  
  return Object.entries(social).map(([platform, url]) => {
    const icon = iconMap[platform] || 'ph-link';
    const fullUrl = platform === 'email' && !url.startsWith('mailto:') 
      ? `mailto:${url}` 
      : url;
    return `<a href="${fullUrl}" target="_blank" class="footer-link" aria-label="${platform}">
      <i class="ph ${icon}"></i>
    </a>`;
  }).join('');
}

/**
 * 生成评论组件 HTML
 */
function generateCommentsHTML(comments) {
  if (!comments || !comments.provider) {
    return ''; // 不配置则不显示评论
  }
  
  if (comments.provider === 'giscus') {
    return `
        <section class="comments-section">
            <h3 class="comments-title">评论</h3>
            <div class="giscus"></div>
            <script src="https://giscus.app/client.js"
              data-repo="${comments.repo || ''}"
              data-repo-id="${comments.repoId || ''}"
              data-category="${comments.category || 'General'}"
              data-category-id="${comments.categoryId || ''}"
              data-mapping="${comments.mapping || 'pathname'}"
              data-strict="${comments.strict ? '1' : '0'}"
              data-reactions-enabled="${comments.reactionsEnabled !== false ? '1' : '0'}"
              data-emit-metadata="0"
              data-input-position="bottom"
              data-theme="preferred_color_scheme"
              data-lang="zh-CN"
              crossorigin="anonymous"
              async>
            </script>
        </section>
    `;
  }
  
  return '';
}

/**
 * 页脚组件 - Developer Editorial Style
 */
function getFooter(isPost = false, config = { title: 'My Blog', about: null, friends: [], social: null }) {
  const containerStyle = isPost ? 'max-width: 720px;' : '';
  
  // 判断是否显示关于区块
  const showAbout = config.about && (config.about.description || config.about.avatar);
  // 判断是否显示友链区块
  const showFriends = config.friends && config.friends.length > 0;
  // 判断是否显示联系方式区块
  const showSocial = config.social && Object.keys(config.social).length > 0;
  
  // 计算显示多少个区块
  const sectionCount = (showAbout ? 1 : 0) + (showFriends ? 1 : 0) + (showSocial ? 1 : 0);
  
  // 确定网格布局类
  let gridClass = 'footer-grid';
  if (sectionCount === 0) {
    gridClass = 'footer-grid footer-grid--empty';
  } else if (sectionCount === 1) {
    gridClass = 'footer-grid footer-grid--single';
  } else if (sectionCount === 2) {
    gridClass = 'footer-grid footer-grid--2col';
  }
  
  // 生成关于区块 HTML
  const aboutHTML = showAbout ? `
    <div class="footer-about">
      <h4 class="footer-title">关于</h4>
      ${config.about.avatar ? `<img src="${config.about.avatar}" alt="avatar" class="footer-avatar">` : ''}
      ${config.about.description ? `<p class="footer-desc">${config.about.description}</p>` : ''}
    </div>
  ` : '';
  
  // 生成友链区块 HTML
  const friendsHTML = showFriends ? `
    <div class="footer-links-group">
      <h4 class="footer-title">友情链接</h4>
      <ul class="footer-friends">
        ${config.friends.map(friend => `
          <li><a href="${friend.url}" target="_blank">${friend.name}</a></li>
        `).join('')}
      </ul>
    </div>
  ` : '';
  
  // 生成联系方式区块 HTML
  const socialHTML = showSocial ? `
    <div class="footer-contact">
      <h4 class="footer-title">联系方式</h4>
      <div class="footer-social">
        ${generateSocialHTML(config.social)}
      </div>
    </div>
  ` : '';
  
  // 如果所有区块都不显示，只保留版权
  if (sectionCount === 0) {
    return `
      <footer class="footer">
        <div class="footer-container" style="${containerStyle}">
          <div class="footer-bottom footer-bottom--only">
            <p class="footer-copyright">© ${new Date().getFullYear()} ${config.title}. All rights reserved.</p>
          </div>
        </div>
      </footer>`;
  }
  
  return `
    <footer class="footer">
        <div class="footer-container" style="${containerStyle}">
            <div class="${gridClass}">
                ${aboutHTML}
                ${friendsHTML}
                ${socialHTML}
            </div>
            <div class="footer-bottom">
                <p class="footer-copyright">© ${new Date().getFullYear()} ${config.title}. All rights reserved.</p>
            </div>
        </div>
    </footer>`;
}

/**
 * 生成文章列表页面
 */
async function generateIndexPage(posts, tags, categories, archives, config) {
  // Posts will be loaded dynamically by client-side JS for filtering to work
  const sidebarHTML = `
    <aside class="sidebar-section">
      <!-- Sidebar content will be rendered by client-side JS -->
    </aside>
  `;

  const content = `
    <div class="max-w-6xl mx-auto px-6" style="padding-top: var(--space-8);">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
            ${sidebarHTML}
            <div class="lg:col-span-9">
                <!-- Filter Status -->
                <div id="filterStatus" class="filter-status hidden">
                    <span id="filterLabel">筛选结果</span>
                    <button id="clearFilter" class="clear-filter-btn">清除</button>
                </div>
                
                <div id="postsContainer" class="posts-container">
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>正在加载文章...</p>
                    </div>
                </div>
                
                <!-- Load More -->
                <div id="loadMoreContainer" class="load-more-container hidden">
                    <button id="loadMoreBtn" class="load-more-btn">加载更多</button>
                </div>
                
                <!-- Empty State -->
                <div id="emptyState" class="empty-state hidden">
                    <div class="empty-icon">📄</div>
                    <h3>暂无文章</h3>
                    <p>该分类下暂时没有文章</p>
                </div>
            </div>
        </div>
    </div>
  `;

  let html = getBaseTemplate(config.title, './')
    .replace('{{title}}', '首页')
    .replace('{{description}}', '个人博客，分享技术思考与实践')
    .replace('{{nav}}', getNav('home', config.title))
    .replace('{{content}}', content)
    .replace('{{footer}}', getFooter(false, config));

  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
  console.log('✓ 生成 index.html');
}

/**
 * 生成文章详情页面
 */
async function generatePostPage(post, prev, next, config) {
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
            <h4 class="toc-title">目录</h4>
            <nav id="tocNav" class="toc-nav"></nav>
        </div>

        <div class="post-content" id="postContent">
            ${post.html}
        </div>

        <footer class="post-footer">
            ${post.meta.tags.length ? `
                <div class="post-footer-tags">
                    <span class="post-footer-label">标签:</span>
                    ${post.meta.tags.map(tag => `<a href="../" class="post-footer-tag">${tag}</a>`).join('')}
                </div>
            ` : ''}
        </footer>

        ${(prev || next) ? `
        <nav class="post-nav">
            ${prev ? `
                <a href="./${prev.id}.html" class="post-nav-item">
                    <div class="post-nav-label">← 上一篇</div>
                    <div class="post-nav-title">${prev.meta.title}</div>
                </a>
            ` : ''}
            ${next ? `
                <a href="./${next.id}.html" class="post-nav-item next">
                    <div class="post-nav-label">下一篇 →</div>
                    <div class="post-nav-title">${next.meta.title}</div>
                </a>
            ` : ''}
        </nav>
        ` : ''}

        ${generateCommentsHTML(config.comments)}
    </article>
  `;

  let html = getBaseTemplate(config.title, '../')
    .replace('{{title}}', post.meta.title)
    .replace('{{description}}', post.meta.summary || generateExcerpt(post.body))
    .replace('{{nav}}', getNav('post', config.title))
    .replace('{{content}}', content)
    .replace('{{footer}}', getFooter(true, config));

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
 * 生成 RSS 文件
 */
async function generateRSS(posts, config) {
  const rssConfig = config.rss || {};
  const filename = rssConfig.filename || 'feed.xml';
  // 支持项目站点的 baseUrl 配置（如 /blog）
  const baseUrl = rssConfig.baseUrl || '';
  const rssUrl = `${baseUrl}/${filename}`;
  
  // 转义 XML 特殊字符
  const escapeXml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  // 生成 RSS 日期格式 (RFC 822)
  const formatRSSDate = (dateString) => {
    const date = new Date(dateString);
    return date.toUTCString();
  };
  
  // 生成文章条目
  const generateItems = () => {
    return posts.map(post => {
      const date = formatRSSDate(post.meta.date);
      const link = `${baseUrl}/posts/${post.id}.html`;
      const excerpt = generateExcerpt(post.body, 500);
      
      return `    <item>
      <title>${escapeXml(post.meta.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${date}</pubDate>
      <description>${escapeXml(excerpt)}</description>
      ${post.meta.category ? `<category>${escapeXml(post.meta.category)}</category>` : ''}
      ${post.meta.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>`;
    }).join('\n');
  };
  
  const now = new Date().toUTCString();
  const blogTitle = escapeXml(config.title);
  const blogDescription = escapeXml(config.about?.description || `${config.title} - 个人博客`);
  
  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${blogTitle}</title>
    <link>${baseUrl}/</link>
    <description>${blogDescription}</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml" />
${generateItems()}
  </channel>
</rss>`;
  
  await fs.writeFile(path.join(DIST_DIR, filename), rssContent, 'utf-8');
  console.log(`✓ 生成 ${filename}`);
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
  
  // 加载配置
  console.log('⚙️  加载配置...');
  const config = await loadConfig();
  console.log(`✓ 博客标题: ${config.title}\n`);
  
  // 生成页面
  console.log('📦 生成页面...');
  await generateIndexPage(
    posts,
    Array.from(tags.entries()).sort((a, b) => b[1] - a[1]),
    Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    Array.from(archives.values()).sort((a, b) => b.key.localeCompare(a.key)),
    config
  );
  
  // 生成每篇文章
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prev = i < posts.length - 1 ? posts[i + 1] : null;
    const next = i > 0 ? posts[i - 1] : null;
    await generatePostPage(post, prev, next, config);
  }
  
  // 生成数据文件
  await generateDataFile(posts);
  
  // 生成 RSS 文件（如果启用）
  if (config.rss && config.rss.enabled) {
    console.log('\n📡 生成 RSS...');
    await generateRSS(posts, config);
  }
  
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
