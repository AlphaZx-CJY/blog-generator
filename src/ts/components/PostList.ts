/**
 * 文章列表组件 - 简洁列表风格
 */

import type { Post } from '../types';
import { formatDate } from '../utils/date';
import { escapeHtml, generateExcerpt } from '../utils/html';

export interface PostListCallbacks {
  onLoadMore: () => void;
}

export class PostList {
  private container: HTMLElement;
  private callbacks: PostListCallbacks;
  private posts: Post[] = [];

  constructor(container: HTMLElement, callbacks: PostListCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * 设置文章数据
   */
  setPosts(posts: Post[]): void {
    this.posts = posts;
    this.render();
  }

  /**
   * 渲染文章列表
   */
  render(): void {
    if (this.posts.length === 0) {
      this.renderEmpty();
      return;
    }

    this.container.innerHTML = this.posts.map(post => this.renderPostItem(post)).join('');
  }

  /**
   * 渲染单篇文章
   */
  private renderPostItem(post: Post): string {
    const date = formatDate(post.meta.date);
    const originText = post.meta.origin === 'original' ? '原创' : '转载';
    const summary = post.meta.summary || generateExcerpt(post.excerpt || '');
    const tags = post.meta.tags || [];

    return `
      <article class="post-item" data-post-id="${post.id}">
        <div class="post-meta">
          <span class="post-category">${escapeHtml(post.meta.category || '未分类')}</span>
          <span class="post-date">${date.full}</span>
          <span class="post-origin">${originText}</span>
        </div>
        <h2 class="post-title">
          <a href="./posts/${post.id}.html">${escapeHtml(post.meta.title)}</a>
        </h2>
        <p class="post-summary">${escapeHtml(summary)}</p>
        ${tags.length > 0 ? `
          <div class="post-tags">
            ${tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </article>
    `;
  }

  /**
   * 渲染空状态
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>暂无文章</h3>
        <p>该分类下暂时没有文章</p>
      </div>
    `;
  }

  /**
   * 渲染加载中
   */
  renderLoading(): void {
    this.container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>正在加载文章...</p>
      </div>
    `;
  }

  /**
   * 添加文章（用于加载更多）
   */
  appendPosts(posts: Post[]): void {
    const html = posts.map(post => this.renderPostItem(post)).join('');
    this.container.insertAdjacentHTML('beforeend', html);
    this.posts.push(...posts);
  }
}
