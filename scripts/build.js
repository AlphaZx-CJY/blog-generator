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
  
  // 复制 highlight.js CSS 主题文件
  const hljsStyles = [
    { src: 'github.min.css', dest: 'highlight-github.min.css' },
    { src: 'github-dark.min.css', dest: 'highlight-github-dark.min.css' }
  ];
  
  const hljsStylesDir = path.join(ROOT_DIR, 'node_modules', 'highlight.js', 'styles');
  for (const { src, dest } of hljsStyles) {
    try {
      const srcPath = path.join(hljsStylesDir, src);
      const destPath = path.join(DIST_DIR, 'css', dest);
      await fs.access(srcPath);
      await fs.copyFile(srcPath, destPath);
      console.log(`✓ 复制 css/${dest}`);
    } catch {
      console.warn(`⚠ 未找到 highlight.js 样式: ${src}`);
    }
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
    
    <!-- Code Highlighting (本地资源) -->
    <link rel="stylesheet" href="${basePath}css/highlight-github.min.css" id="hljs-light">
    <link rel="stylesheet" href="${basePath}css/highlight-github-dark.min.css" id="hljs-dark" disabled>
    
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
                    ${svgIcons.search}
                </button>
                <button id="themeToggle" class="icon-btn" aria-label="切换主题">${svgIcons.sun}</button>
            </div>
        </div>
        <!-- Search Panel -->
        <div id="searchPanel" class="search-panel">
            <div class="search-wrapper">
                <div class="search-input-wrapper">
                    <span class="search-icon" style="display:flex;align-items:center;">${svgIcons.search}</span>
                    <input type="text" id="searchInput" placeholder="搜索文章..." class="search-input">
                    <kbd class="search-shortcut">ESC</kbd>
                </div>
                <div id="searchResults" class="search-results"></div>
            </div>
        </div>
    </nav>`;
}

/**
 * SVG 图标定义
 */
const svgIcons = {
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM40,120H16a8,8,0,0,0,0,16H40a8,8,0,0,0,0-16Zm88,88a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H112A59.75,59.75,0,0,0,64,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.58,39.58,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V202.46a39.58,39.58,0,0,0-8.44-24.61A56.13,56.13,0,0,0,160,160h8a56.13,56.13,0,0,0,56.44-55.47V104A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H160a39.58,39.58,0,0,0-8.44-24.61A56.13,56.13,0,0,0,168,112h8A40,40,0,0,1,200,112Z"/></svg>`,
  email: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z"/></svg>`,
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M247.39,68.94A8,8,0,0,0,240,64H209.57A48.66,48.66,0,0,0,168.1,40a46.91,46.91,0,0,0-33.75,30.72,48,48,0,0,0-89.63,18.64A44.12,44.12,0,0,0,16,80v.41a8,8,0,0,0,4.76,7.29l.08,0A91.24,91.24,0,0,0,59,110.86l-14.36,5.1A8,8,0,0,0,40.5,127.32l12.18,34.55a8,8,0,0,0,11.21,4.53l13-5.61A100.64,100.64,0,0,0,128,168a100.34,100.34,0,0,0,51.11-14.32l13,5.61a8,8,0,0,0,11.21-4.53l12.18-34.55a8,8,0,0,0-4.15-10.15l-14.36-5.1a91.24,91.24,0,0,0,38.16-23.12l.08,0A8,8,0,0,0,247.39,68.94ZM64.1,115.31a75.25,75.25,0,0,1-23.25-6.56,76.26,76.26,0,0,1,18-18A76.14,76.14,0,0,1,64.1,115.31Zm61.81,34.15-17.8,7.67-9.08-25.77,17.8-7.67a60.21,60.21,0,0,1,9.08,25.77Zm34.22,7.67-17.8-7.67a60.21,60.21,0,0,1,9.08-25.77l17.8,7.67Zm-34.22-43.72a76.14,76.14,0,0,1-5.27-24.61,76.26,76.26,0,0,1,18-18,75.25,75.25,0,0,1-23.25,6.56A76.5,76.5,0,0,1,125.91,113.41Z"/></svg>`,
  rss: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M220.82,164.55a8,8,0,0,1-10.37,4.51A95.09,95.09,0,0,0,164.17,156a8,8,0,0,1,0-16,79.37,79.37,0,0,1,44.14,12.32A8,8,0,0,1,220.82,164.55Zm-24.31,28.3c-20.78,0-40.84-6.37-57.69-18.43a8,8,0,0,0-9.14,13.12c19.54,13.6,42.48,20.79,66.21,20.31a8,8,0,0,0,.31-16Zm-39.43-79.78a8,8,0,0,0,1.5-15.88A175.91,175.91,0,0,0,40,40a8,8,0,0,0,0,16,160,8,8,0,0,1,7.89,6.85,160,8,8,0,0,0,113.12,49.2A8,8,0,0,0,157.08,113.07ZM44,120a8,8,0,0,0,0,16,48.05,48.05,0,0,1,48,48,8,8,0,0,0,16,0A64.07,64.07,0,0,0,44,120Z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24Zm0,192H40V40H216V216ZM96,112v64a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm-8-28a12,12,0,1,1,12-12A12,12,0,0,1,88,84Zm100,28v64a8,8,0,0,1-16,0V140a24,24,0,0,0-48,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A40,40,0,0,1,188,112Z"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,16a87.62,87.62,0,0,1,48.31,14.6c-21.1,5.24-44.61,17.41-63.38,35.62A189.33,189.33,0,0,1,97.57,47.4,88.43,88.43,0,0,1,128,40Zm-39.82,12.32a173.49,173.49,0,0,0,15.36,24.08A178,178,0,0,1,56.46,79.54,88.09,88.09,0,0,1,88.18,52.32ZM40,128a87.56,87.56,0,0,1,9.64-39.89,163.65,163.65,0,0,0,36.07,9.59A165.64,165.64,0,0,0,81.29,128c0,21.07-4.42,40.18-11.56,55.34-21.82-4.5-40.61-17.09-53-34.82A87.55,87.55,0,0,1,40,128Zm8.35,63.38a148.29,148.29,0,0,1,44.47-9.61c2.33,11.89,6.06,23.17,10.71,33.25A107.63,107.63,0,0,1,86.44,186.8,88.24,88.24,0,0,1,48.35,191.38Zm76.39-5.13c-6.88-11.15-11.73-23.48-14.27-36.25h45.06c-2.54,12.77-7.39,25.1-14.27,36.25ZM112,128c0-11.87,1.36-23.42,3.88-34.29h25.76c2.52,10.87,3.88,22.42,3.88,34.29s-1.36,23.42-3.88,34.29H115.88C113.36,151.42,112,139.87,112,128Zm1.74-50.29c4.65-10.08,8.38-21.36,10.71-33.25a148.29,148.29,0,0,1,44.47,9.61,88.24,88.24,0,0,1-38.09,4.42C119.71,79.76,117.12,79.42,113.74,77.71Zm52.77-8.3c21.1,5.24,44.61,17.41,63.38,35.62a189.33,189.33,0,0,1-13.37,27.82A176.52,176.52,0,0,0,166.51,69.41ZM208,128a88.43,88.43,0,0,1-4.83,28.95,173.49,173.49,0,0,0-15.36-24.08A178,178,0,0,1,199.54,176.46,88.09,88.09,0,0,1,208,128Z"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M240,88.23a54.43,54.43,0,0,1-16,38.1L201.42,149A54.41,54.41,0,0,1,148.23,176l-.26,0a54.34,54.34,0,0,1-38.62-16l-4.66-4.66a8,8,0,0,1,11.32-11.32l4.66,4.66a38.43,38.43,0,0,0,54.28,0l22.59-22.58a38.43,38.43,0,0,0-54.28-54.28l-4.66,4.66a8,8,0,0,1-11.32-11.32l4.66-4.66A54.43,54.43,0,0,1,148,56.1a54.34,54.34,0,0,1,38.62,16L208,93.52A54.44,54.44,0,0,1,240,88.23Zm-122.83,49.24-4.66,4.66a38.43,38.43,0,0,1-54.28,0L35.64,119.55a38.43,38.43,0,0,1,54.28-54.28l4.66,4.66a8,8,0,0,0,11.32-11.32l-4.66-4.66A54.43,54.43,0,0,0,56.1,48,54.34,54.34,0,0,0,17.48,64L16,65.42A54.41,54.41,0,0,0,16,150.19l22.58,22.59a54.43,54.43,0,0,0,77.13,0l4.66-4.66a8,8,0,0,0-11.32-11.32Z"/></svg>`
};

/**
 * 生成社交链接 HTML
 */
function generateSocialHTML(social) {
  const iconMap = {
    github: svgIcons.github,
    email: svgIcons.email,
    twitter: svgIcons.twitter,
    rss: svgIcons.rss,
    linkedin: svgIcons.linkedin,
    weibo: svgIcons.globe
  };
  
  return Object.entries(social).map(([platform, url]) => {
    const icon = iconMap[platform] || svgIcons.link;
    const fullUrl = platform === 'email' && !url.startsWith('mailto:') 
      ? `mailto:${url}` 
      : url;
    return `<a href="${fullUrl}" target="_blank" class="footer-link" aria-label="${platform}">
      ${icon}
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
            <script>
              // 动态加载 Giscus，确保主题设置正确
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
                
                const script = document.createElement('script');
                script.src = 'https://giscus.app/client.js';
                script.setAttribute('data-repo', '${comments.repo || ''}');
                script.setAttribute('data-repo-id', '${comments.repoId || ''}');
                script.setAttribute('data-category', '${comments.category || 'General'}');
                script.setAttribute('data-category-id', '${comments.categoryId || ''}');
                script.setAttribute('data-mapping', '${comments.mapping || 'pathname'}');
                script.setAttribute('data-strict', '${comments.strict ? '1' : '0'}');
                script.setAttribute('data-reactions-enabled', '${comments.reactionsEnabled !== false ? '1' : '0'}');
                script.setAttribute('data-emit-metadata', '0');
                script.setAttribute('data-input-position', 'bottom');
                script.setAttribute('data-theme', theme);
                script.setAttribute('data-lang', 'zh-CN');
                script.setAttribute('crossorigin', 'anonymous');
                script.async = true;
                
                document.currentScript.parentNode.insertBefore(script, document.currentScript);
              })();
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
