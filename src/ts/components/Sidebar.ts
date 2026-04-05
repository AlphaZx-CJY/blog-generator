/**
 * 侧边栏组件 - 支持多重筛选和展开/收起
 */

import { fetchArchives, fetchTags, fetchCategories } from '../api/posts';
import { escapeHtml } from '../utils/html';
import type { Archive, FilterType } from '../types';

export interface SidebarCallbacks {
  onToggleFilter: (type: FilterType, value: string, isActive: boolean, label: string) => void;
  onClearAllFilters: () => void;
}

interface ExpandState {
  archive: boolean;
  tag: boolean;
  category: boolean;
}

const DEFAULT_LIMITS = {
  archive: 10,
  tag: 15,
  category: 8
};

export class Sidebar {
  private container: HTMLElement;
  private callbacks: SidebarCallbacks;
  private activeFilters: Map<FilterType, string> = new Map();
  private expandState: ExpandState = {
    archive: false,
    tag: false,
    category: false
  };
  
  // 存储原始数据
  private archivesData: Archive[] = [];
  private tagsData: [string, number][] = [];
  private categoriesData: [string, number][] = [];

  constructor(container: HTMLElement, callbacks: SidebarCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * 渲染侧边栏
   */
  async render(): Promise<void> {
    this.container.innerHTML = '<div class="sidebar-loading">加载中...</div>';
    
    try {
      const [archives, tags, categories] = await Promise.all([
        fetchArchives(),
        fetchTags(),
        fetchCategories()
      ]);

      // 保存原始数据
      this.archivesData = archives;
      this.tagsData = tags;
      this.categoriesData = categories;

      this.renderContent();
    } catch (error) {
      console.error('Sidebar render error:', error);
      this.container.innerHTML = '<div class="sidebar-loading">加载失败</div>';
    }
  }

  /**
   * 渲染内容（支持重新渲染）
   */
  private renderContent(): void {
    this.container.innerHTML = `
      ${this.renderArchives()}
      ${this.renderTags()}
      ${this.renderCategories()}
    `;

    this.attachEventListeners();
  }

  /**
   * 渲染归档
   */
  private renderArchives(): string {
    if (this.archivesData.length === 0) return '';
    
    const isExpanded = this.expandState.archive;
    const limit = isExpanded ? this.archivesData.length : DEFAULT_LIMITS.archive;
    const displayArchives = this.archivesData.slice(0, limit);
    const hasMore = this.archivesData.length > DEFAULT_LIMITS.archive;
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">归档</h3>
        <ul class="sidebar-list" data-type="archive">
          ${displayArchives.map(archive => `
            <li data-value="${archive.key}" data-label="${escapeHtml(archive.label)}">
              <span>${escapeHtml(archive.label)}</span>
              <span class="sidebar-count">${archive.count}</span>
            </li>
          `).join('')}
        </ul>
        ${hasMore ? `
          <button class="show-more-btn" data-type="archive" data-expanded="${isExpanded}">
            ${isExpanded ? '收起' : `查看更多 (${this.archivesData.length - DEFAULT_LIMITS.archive})`}
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染标签
   */
  private renderTags(): string {
    if (this.tagsData.length === 0) return '';
    
    const isExpanded = this.expandState.tag;
    const limit = isExpanded ? this.tagsData.length : DEFAULT_LIMITS.tag;
    const displayTags = this.tagsData.slice(0, limit);
    const hasMore = this.tagsData.length > DEFAULT_LIMITS.tag;
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">标签</h3>
        <div class="tag-cloud" data-type="tag">
          ${displayTags.map(([tag, count]) => `
            <span class="tag-item" data-value="${escapeHtml(tag)}">
              ${escapeHtml(tag)}<span class="tag-count">${count}</span>
            </span>
          `).join('')}
        </div>
        ${hasMore ? `
          <button class="show-more-btn" data-type="tag" data-expanded="${isExpanded}">
            ${isExpanded ? '收起' : `查看更多 (${this.tagsData.length - DEFAULT_LIMITS.tag})`}
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染分类
   */
  private renderCategories(): string {
    if (this.categoriesData.length === 0) return '';
    
    const isExpanded = this.expandState.category;
    const limit = isExpanded ? this.categoriesData.length : DEFAULT_LIMITS.category;
    const displayCategories = this.categoriesData.slice(0, limit);
    const hasMore = this.categoriesData.length > DEFAULT_LIMITS.category;
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">分类</h3>
        <ul class="sidebar-list" data-type="category">
          ${displayCategories.map(([category, count]) => `
            <li data-value="${escapeHtml(category)}" data-label="${escapeHtml(category)}">
              <span>${escapeHtml(category)}</span>
              <span class="sidebar-count">${count}</span>
            </li>
          `).join('')}
        </ul>
        ${hasMore ? `
          <button class="show-more-btn" data-type="category" data-expanded="${isExpanded}">
            ${isExpanded ? '收起' : `查看更多 (${this.categoriesData.length - DEFAULT_LIMITS.category})`}
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 附加事件监听
   */
  private attachEventListeners(): void {
    // 归档和分类点击
    this.container.querySelectorAll('.sidebar-list li').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const listEl = item.closest('.sidebar-list');
        const type = listEl?.getAttribute('data-type') as FilterType;
        const value = item.getAttribute('data-value') || '';
        const label = item.getAttribute('data-label') || value;
        
        if (!type || !value) return;

        const isCurrentlyActive = item.classList.contains('active');
        
        // Toggle 选中状态
        if (isCurrentlyActive) {
          item.classList.remove('active');
          this.activeFilters.delete(type);
        } else {
          // 同类型只能选一个，先清除同类型的其他选中
          listEl.querySelectorAll('li.active').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          this.activeFilters.set(type, value);
        }
        
        this.callbacks.onToggleFilter(type, value, !isCurrentlyActive, label);
      });
    });

    // 标签点击
    this.container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const value = (e.currentTarget as HTMLElement).getAttribute('data-value') || '';
        if (!value) return;

        const el = e.currentTarget as HTMLElement;
        const isCurrentlyActive = el.classList.contains('active');
        
        // Toggle 选中状态
        if (isCurrentlyActive) {
          el.classList.remove('active');
          this.activeFilters.delete('tag');
        } else {
          // 标签可以多选，不需要清除其他
          el.classList.add('active');
          this.activeFilters.set('tag', value);
        }
        
        this.callbacks.onToggleFilter('tag', value, !isCurrentlyActive, value);
      });
    });

    // 查看更多/收起按钮
    this.container.querySelectorAll('.show-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = (e.currentTarget as HTMLElement).getAttribute('data-type') as keyof ExpandState;
        if (type) {
          this.expandState[type] = !this.expandState[type];
          this.renderContent();
        }
      });
    });
  }

  /**
   * 设置筛选激活状态（外部调用）
   */
  setFilterActive(type: FilterType, value: string, isActive: boolean): void {
    if (isActive) {
      this.activeFilters.set(type, value);
    } else {
      this.activeFilters.delete(type);
    }

    // 更新 UI
    if (type === 'tag') {
      this.container.querySelectorAll('.tag-item').forEach(el => {
        if (el.getAttribute('data-value') === value) {
          el.classList.toggle('active', isActive);
        }
      });
    } else {
      this.container.querySelectorAll(`.sidebar-list[data-type="${type}"] li`).forEach(el => {
        if (el.getAttribute('data-value') === value) {
          el.classList.toggle('active', isActive);
        }
      });
    }
  }

  /**
   * 清除所有筛选
   */
  clearAllFilters(): void {
    this.activeFilters.clear();
    this.container.querySelectorAll('.sidebar-list li, .tag-item').forEach(el => {
      el.classList.remove('active');
    });
  }
}
