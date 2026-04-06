/**
 * 博客入口文件
 */

import { BlogPage } from './pages/BlogPage';
import { PostPage } from './pages/PostPage';

// 根据页面类型初始化
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // 根据路径判断页面类型（支持子目录部署）
  if (path.endsWith('/') || path.endsWith('/index.html')) {
    new BlogPage();
  } else if (path.includes('/posts/')) {
    new PostPage();
  }
});
