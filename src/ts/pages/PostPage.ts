/**
 * 文章详情页逻辑
 */

import { fetchPostById, fetchPosts } from '../api/posts';
import { TOC } from '../components/TOC';
import { Search } from '../components/Search';
import { ThemeToggle } from '../components/ThemeToggle';
import { BackToTop } from '../components/BackToTop';
import { ReadingProgress } from '../components/ReadingProgress';
import { formatDate } from '../utils/date';
import { escapeHtml, generateExcerpt } from '../utils/html';
import type { Post } from '../types';

export class PostPage {
  private postId: string | null = null;
  private post: Post | null = null;
  private toc: TOC | null = null;

  constructor() {
    this.init();
  }

  /**
   * 初始化
   */
  private async init(): Promise<void> {
    // 获取文章 ID
    const match = window.location.pathname.match(/\/posts\/(.*?)\.html$/);
    this.postId = match ? match[1] : null;

    if (!this.postId) {
      this.showError('文章不存在');
      return;
    }

    // 初始化组件
    new Search();
    new ThemeToggle();
    new BackToTop();
    new ReadingProgress();

    // 加载文章
    await this.loadPost();
  }

  /**
   * 加载文章
   */
  private async loadPost(): Promise<void> {
    try {
      this.post = await fetchPostById(this.postId!);

      if (!this.post) {
        // 如果无法从 API 获取，但页面已有预渲染内容，则保留预渲染内容
        const content = document.getElementById('postContent');
        if (content && content.innerHTML.trim()) {
          console.log('使用预渲染内容');
          this.setupTOC();
          this.highlightCode();
          return;
        }
        this.showError('文章不存在');
        return;
      }

      this.renderPost();
      this.renderNavigation();
      
      // 延迟初始化 TOC，确保内容已渲染
      setTimeout(() => {
        this.setupTOC();
        this.highlightCode();
      }, 100);
    } catch (error) {
      console.error('加载文章失败:', error);
      // 如果 API 加载失败但页面已有预渲染内容，保留预渲染内容
      const content = document.getElementById('postContent');
      if (content && content.innerHTML.trim()) {
        console.log('API 加载失败，使用预渲染内容');
        this.setupTOC();
        this.highlightCode();
        return;
      }
      this.showError('加载文章失败');
    }
  }

  /**
   * 渲染文章
   */
  private renderPost(): void {
    if (!this.post) return;

    const header = document.getElementById('postHeader');
    const content = document.getElementById('postContent');
    const footer = document.getElementById('postFooter');

    const date = formatDate(this.post.meta.date);
    const originText = this.post.meta.origin === 'original' ? '原创' : '转载';

    // 渲染头部
    if (header) {
      header.innerHTML = `
        <div class="post-header-content">
          <div class="post-header-meta">
            <span class="post-category">${escapeHtml(this.post.meta.category || '未分类')}</span>
            <span class="post-date">${date.full}</span>
            <span class="post-origin">${originText}</span>
          </div>
          <h1 class="post-header-title">${escapeHtml(this.post.meta.title)}</h1>
          ${this.post.meta.summary ? `<p class="post-header-summary">${escapeHtml(this.post.meta.summary)}</p>` : ''}
        </div>
      `;
    }

    // 渲染内容（仅在内容为空或需要更新时渲染）
    if (content && this.post.html) {
      // 检查是否有预渲染内容，如果有且内容相似则保留
      const existingContent = content.innerHTML.trim();
      if (!existingContent) {
        content.innerHTML = this.post.html;
      }
    }

    // 渲染页脚标签
    if (footer && this.post.meta.tags?.length) {
      footer.innerHTML = `
        <div class="post-footer-tags">
          <span class="post-footer-label">标签:</span>
          ${this.post.meta.tags.map(tag => `
            <a href="./" class="post-footer-tag">${escapeHtml(tag)}</a>
          `).join('')}
        </div>
      `;
    }
  }

  /**
   * 渲染导航
   */
  private async renderNavigation(): Promise<void> {
    if (!this.post) return;

    const nav = document.getElementById('postNav');
    if (!nav) return;

    try {
      const posts = await fetchPosts();
      const currentIndex = posts.findIndex(p => p.id === this.postId);
      const prev = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
      const next = currentIndex > 0 ? posts[currentIndex - 1] : null;

      nav.innerHTML = `
        ${prev ? `
          <a href="./${prev.id}.html" class="post-nav-item">
            <div class="post-nav-label">← 上一篇</div>
            <div class="post-nav-title">${escapeHtml(prev.meta.title)}</div>
          </a>
        ` : '<div></div>'}
        ${next ? `
          <a href="./${next.id}.html" class="post-nav-item next">
            <div class="post-nav-label">下一篇 →</div>
            <div class="post-nav-title">${escapeHtml(next.meta.title)}</div>
          </a>
        ` : '<div></div>'}
      `;
    } catch (error) {
      console.error('加载导航失败:', error);
    }
  }

  /**
   * 设置目录
   */
  private setupTOC(): void {
    this.toc = new TOC();
    this.toc.generate('#postContent');
  }

  /**
   * 代码高亮
   */
  private highlightCode(): void {
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightBlock(block as HTMLElement);
      });
    }
  }

  /**
   * 显示错误
   */
  private showError(message: string): void {
    const header = document.getElementById('postHeader');
    const content = document.getElementById('postContent');

    if (header) {
      header.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>${message}</h3>
        </div>
      `;
    }

    if (content) content.innerHTML = '';
  }
}
