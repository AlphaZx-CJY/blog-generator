/**
 * 博客入口文件
 */

import { BlogPage } from './pages/BlogPage';
import { PostPage } from './pages/PostPage';

// 根据页面类型初始化
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path === '/' || path === '/index.html') {
    new BlogPage();
  } else if (path.startsWith('/posts/')) {
    new PostPage();
  }
});
