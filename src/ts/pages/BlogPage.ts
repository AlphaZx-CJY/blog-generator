/**
 * 博客首页逻辑 - 支持多重筛选
 */

import { fetchPosts } from '../api/posts';
import { Sidebar } from '../components/Sidebar';
import { PostList } from '../components/PostList';
import { Search } from '../components/Search';
import { ThemeToggle } from '../components/ThemeToggle';
import { BackToTop } from '../components/BackToTop';
import { getArchiveKey } from '../utils/date';
import type { Post, FilterType } from '../types';

interface FilterItem {
  type: FilterType;
  value: string;
  label: string;
}

export class BlogPage {
  private posts: Post[] = [];
  private filteredPosts: Post[] = [];
  private currentPage = 1;
  private postsPerPage = 10;
  private activeFilters: Map<FilterType, FilterItem> = new Map();
  
  private sidebar: Sidebar | null = null;
  private postList: PostList | null = null;
  private search: Search | null = null;

  constructor() {
    this.init();
  }

  /**
   * 初始化
   */
  private async init(): Promise<void> {
    this.search = new Search();
    new ThemeToggle();
    new BackToTop();

    const postsContainer = document.getElementById('postsContainer');
    if (postsContainer) {
      this.postList = new PostList(postsContainer, {
        onLoadMore: () => this.loadMore()
      });
      this.postList.renderLoading();
    }

    const sidebarAside = document.querySelector('aside.sidebar-section');
    if (sidebarAside) {
      this.sidebar = new Sidebar(sidebarAside as HTMLElement, {
        onToggleFilter: (type, value, isActive, label) => this.toggleFilter(type, value, isActive, label),
        onClearAllFilters: () => this.clearAllFilters()
      });
      await this.sidebar.render();
    }

    await this.loadPosts();

    document.getElementById('clearFilter')?.addEventListener('click', () => {
      this.clearAllFilters();
    });
  }

  /**
   * 加载文章
   */
  private async loadPosts(): Promise<void> {
    try {
      this.posts = await fetchPosts();
      this.applyFilters();
    } catch (error) {
      console.error('加载文章失败:', error);
    }
  }

  /**
   * 切换筛选条件
   */
  private toggleFilter(type: FilterType, value: string, isActive: boolean, label: string): void {
    if (isActive) {
      this.activeFilters.set(type, { type, value, label });
    } else {
      this.activeFilters.delete(type);
    }
    
    this.currentPage = 1;
    this.applyFilters();
    this.updateFilterStatus();
  }

  /**
   * 应用所有筛选条件
   */
  private applyFilters(): void {
    let result = [...this.posts];

    // 应用每个激活的筛选条件
    for (const [, filter] of this.activeFilters) {
      result = result.filter(post => this.matchesFilter(post, filter));
    }

    this.filteredPosts = result;
    this.renderPosts();
  }

  /**
   * 检查文章是否匹配筛选条件
   */
  private matchesFilter(post: Post, filter: FilterItem): boolean {
    switch (filter.type) {
      case 'tag':
        return (post.meta.tags || []).includes(filter.value);
      case 'category':
        return (post.meta.category || '未分类') === filter.value;
      case 'archive': {
        const postArchive = getArchiveKey(post.meta.date);
        return postArchive === filter.value;
      }
      default:
        return true;
    }
  }

  /**
   * 渲染文章
   */
  private renderPosts(): void {
    const postsToShow = this.filteredPosts.slice(0, this.currentPage * this.postsPerPage);
    
    if (this.postList) {
      this.postList.setPosts(postsToShow);
    }

    this.updateLoadMoreButton();
  }

  /**
   * 加载更多
   */
  private loadMore(): void {
    this.currentPage++;
    const start = (this.currentPage - 1) * this.postsPerPage;
    const end = this.currentPage * this.postsPerPage;
    const newPosts = this.filteredPosts.slice(start, end);
    
    this.postList?.appendPosts(newPosts);
    this.updateLoadMoreButton();
  }

  /**
   * 更新加载更多按钮
   */
  private updateLoadMoreButton(): void {
    const container = document.getElementById('loadMoreContainer');
    if (!container) return;

    const hasMore = this.currentPage * this.postsPerPage < this.filteredPosts.length;
    container.classList.toggle('hidden', !hasMore);
  }

  /**
   * 清除所有筛选
   */
  private clearAllFilters(): void {
    this.activeFilters.clear();
    this.currentPage = 1;
    this.applyFilters();
    this.sidebar?.clearAllFilters();
    this.updateFilterStatus();
  }

  /**
   * 更新筛选状态显示
   */
  private updateFilterStatus(): void {
    const status = document.getElementById('filterStatus');
    const labelEl = document.getElementById('filterLabel');
    
    if (!status || !labelEl) return;

    if (this.activeFilters.size === 0) {
      status.classList.add('hidden');
      return;
    }

    // 生成筛选标签 HTML
    const tagsHtml = Array.from(this.activeFilters.values()).map(filter => `
      <span class="filter-tag" data-type="${filter.type}">
        ${filter.label}
        <button class="filter-tag-remove" data-type="${filter.type}" aria-label="移除">×</button>
      </span>
    `).join('');

    labelEl.innerHTML = `筛选: ${tagsHtml}`;
    status.classList.remove('hidden');

    // 绑定移除按钮事件
    labelEl.querySelectorAll('.filter-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = (e.currentTarget as HTMLElement).getAttribute('data-type') as FilterType;
        const filter = this.activeFilters.get(type);
        if (filter) {
          this.toggleFilter(type, filter.value, false, filter.label);
          this.sidebar?.setFilterActive(type, filter.value, false);
        }
      });
    });
  }
}
