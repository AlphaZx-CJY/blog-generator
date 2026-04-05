/**
 * 搜索组件
 */

import { searchPosts } from '../api/posts';
import { escapeHtml, generateExcerpt } from '../utils/html';
import type { Post } from '../types';

export class Search {
  private toggleBtn: HTMLElement | null;
  private panel: HTMLElement | null;
  private input: HTMLInputElement | null;
  private results: HTMLElement | null;
  private searchTimeout: number | null = null;

  constructor() {
    this.toggleBtn = document.getElementById('searchToggle');
    this.panel = document.getElementById('searchPanel');
    this.input = document.getElementById('searchInput') as HTMLInputElement;
    this.results = document.getElementById('searchResults');

    this.attachEventListeners();
  }

  /**
   * 附加事件监听
   */
  private attachEventListeners(): void {
    // 切换搜索面板
    this.toggleBtn?.addEventListener('click', () => {
      this.toggle();
    });

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
      // Cmd/Ctrl + K 打开
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
    });

    // 输入搜索
    this.input?.addEventListener('input', () => {
      this.handleInput();
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-panel') && !target.closest('#searchToggle')) {
        this.close();
      }
    });
  }

  /**
   * 切换搜索面板
   */
  toggle(): void {
    this.panel?.classList.toggle('active');
    if (this.isOpen()) {
      this.input?.focus();
    }
  }

  /**
   * 打开搜索面板
   */
  open(): void {
    this.panel?.classList.add('active');
    this.input?.focus();
  }

  /**
   * 关闭搜索面板
   */
  close(): void {
    this.panel?.classList.remove('active');
  }

  /**
   * 是否打开
   */
  isOpen(): boolean {
    return this.panel?.classList.contains('active') || false;
  }

  /**
   * 处理输入
   */
  private handleInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    const query = this.input?.value.trim() || '';
    
    if (query.length < 2) {
      this.hideResults();
      return;
    }

    this.searchTimeout = window.setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  /**
   * 执行搜索
   */
  private async performSearch(query: string): Promise<void> {
    try {
      const posts = await searchPosts(query, 5);
      this.renderResults(posts, query);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  }

  /**
   * 渲染搜索结果
   */
  private renderResults(posts: Post[], query: string): void {
    if (!this.results) return;

    if (posts.length === 0) {
      this.results.innerHTML = `
        <div class="search-no-results">
          未找到与 "${escapeHtml(query)}" 相关的文章
        </div>
      `;
    } else {
      this.results.innerHTML = posts.map(post => `
        <a href="/posts/${post.id}.html" class="search-result-item">
          <div class="search-result-title">${escapeHtml(post.meta.title)}</div>
          <div class="search-result-excerpt">${escapeHtml(generateExcerpt(post.excerpt || post.meta.summary, 100))}</div>
        </a>
      `).join('');
    }

    this.results.style.display = 'block';
  }

  /**
   * 隐藏搜索结果
   */
  private hideResults(): void {
    if (this.results) {
      this.results.style.display = 'none';
    }
  }
}
