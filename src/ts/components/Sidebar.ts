/**
 * 侧边栏组件 - 支持多重筛选
 */

import { fetchArchives, fetchTags, fetchCategories } from '../api/posts';
import { escapeHtml } from '../utils/html';
import type { Archive, FilterType } from '../types';

export interface SidebarCallbacks {
  onToggleFilter: (type: FilterType, value: string, isActive: boolean, label: string) => void;
  onClearAllFilters: () => void;
}

export class Sidebar {
  private container: HTMLElement;
  private callbacks: SidebarCallbacks;
  private activeFilters: Map<FilterType, string> = new Map();

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

      this.container.innerHTML = `
        ${this.renderArchives(archives)}
        ${this.renderTags(tags)}
        ${this.renderCategories(categories)}
      `;

      this.attachEventListeners();
    } catch (error) {
      console.error('Sidebar render error:', error);
      this.container.innerHTML = '<div class="sidebar-loading">加载失败</div>';
    }
  }

  /**
   * 渲染归档
   */
  private renderArchives(archives: Archive[]): string {
    if (archives.length === 0) return '';
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">归档</h3>
        <ul class="sidebar-list" data-type="archive">
          ${archives.map(archive => `
            <li data-value="${archive.key}" data-label="${escapeHtml(archive.label)}">
              <span>${escapeHtml(archive.label)}</span>
              <span class="sidebar-count">${archive.count}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * 渲染标签
   */
  private renderTags(tags: [string, number][]): string {
    if (tags.length === 0) return '';
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">标签</h3>
        <div class="tag-cloud" data-type="tag">
          ${tags.map(([tag, count]) => `
            <span class="tag-item" data-value="${escapeHtml(tag)}">
              ${escapeHtml(tag)}<span class="tag-count">${count}</span>
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染分类
   */
  private renderCategories(categories: [string, number][]): string {
    if (categories.length === 0) return '';
    
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">分类</h3>
        <ul class="sidebar-list" data-type="category">
          ${categories.map(([category, count]) => `
            <li data-value="${escapeHtml(category)}" data-label="${escapeHtml(category)}">
              <span>${escapeHtml(category)}</span>
              <span class="sidebar-count">${count}</span>
            </li>
          `).join('')}
        </ul>
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
          // 注意：这里简化处理，实际应该支持多标签选择
          // 如果需要多标签选择，需要修改数据结构
          this.activeFilters.set('tag', value);
        }
        
        this.callbacks.onToggleFilter('tag', value, !isCurrentlyActive, value);
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
