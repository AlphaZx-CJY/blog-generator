/**
 * Blog Generator - Client-side Data Fetcher
 * 客户端数据获取与渲染
 */

(function() {
    'use strict';

    const BlogGenerator = {
        posts: [],
        filteredPosts: [],
        currentPage: 1,
        postsPerPage: 10,
        currentFilter: null,

        /**
         * 初始化
         */
        async init() {
            try {
                const response = await fetch('posts.json');
                this.posts = await response.json();
                this.filteredPosts = [...this.posts];
                this.setupEventListeners();
                this.renderPosts();
                this.renderSidebar();
            } catch (error) {
                console.error('加载文章数据失败:', error);
                this.showError();
            }
        },

        /**
         * 设置事件监听
         */
        setupEventListeners() {
            // 加载更多
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    this.currentPage++;
                    this.renderPosts();
                });
            }

            // 清除筛选
            const clearFilterBtn = document.getElementById('clearFilter');
            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', () => {
                    this.clearFilter();
                });
            }

            // 搜索功能
            const searchToggle = document.getElementById('searchToggle');
            const searchPanel = document.getElementById('searchPanel');
            const searchInput = document.getElementById('searchInput');

            if (searchToggle && searchPanel) {
                searchToggle.addEventListener('click', () => {
                    searchPanel.classList.toggle('active');
                    if (searchPanel.classList.contains('active') && searchInput) {
                        searchInput.focus();
                    }
                });

                // ESC 关闭搜索
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && searchPanel.classList.contains('active')) {
                        searchPanel.classList.remove('active');
                    }
                });
            }

            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    const query = e.target.value.trim().toLowerCase();
                    
                    if (query.length < 2) {
                        this.hideSearchResults();
                        return;
                    }

                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                });
            }
        },

        /**
         * 渲染文章列表
         */
        renderPosts() {
            const container = document.getElementById('postsContainer');
            const loadMoreContainer = document.getElementById('loadMoreContainer');
            const emptyState = document.getElementById('emptyState');

            if (!container) return;

            const start = 0;
            const end = this.currentPage * this.postsPerPage;
            const postsToShow = this.filteredPosts.slice(start, end);

            if (this.filteredPosts.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
                return;
            }

            if (emptyState) emptyState.classList.add('hidden');

            const postsHTML = postsToShow.map(post => this.createPostCard(post)).join('');
            
            if (this.currentPage === 1) {
                container.innerHTML = postsHTML;
            } else {
                container.insertAdjacentHTML('beforeend', postsHTML);
            }

            // 显示/隐藏加载更多按钮
            if (loadMoreContainer) {
                if (end < this.filteredPosts.length) {
                    loadMoreContainer.classList.remove('hidden');
                } else {
                    loadMoreContainer.classList.add('hidden');
                }
            }
        },

        /**
         * 创建文章卡片 HTML
         */
        createPostCard(post) {
            const date = this.formatDate(post.meta.date);
            const originIcon = post.meta.origin === 'original' ? 'fa-pen' : 'fa-share';
            const originText = post.meta.origin === 'original' ? '原创' : '转载';
            const summary = post.meta.summary || this.generateExcerpt(post.excerpt || '');
            const tags = post.meta.tags || [];

            return `
                <article class="post-card" onclick="window.location.href='/posts/${post.id}.html'">
                    <div class="post-meta">
                        <span class="post-category">${post.meta.category}</span>
                        <span class="post-date">
                            <i class="far fa-calendar"></i>
                            ${date.full}
                        </span>
                        <span class="post-origin">
                            <i class="fas ${originIcon}"></i>
                            ${originText}
                        </span>
                    </div>
                    <h2 class="post-title">
                        <a href="/posts/${post.id}.html">${this.escapeHtml(post.meta.title)}</a>
                    </h2>
                    <p class="post-summary">${this.escapeHtml(summary)}</p>
                    <div class="post-tags">
                        ${tags.map(tag => `<span class="post-tag">${this.escapeHtml(tag)}</span>`).join('')}
                        <a href="/posts/${post.id}.html" class="post-read-more">
                            阅读全文 <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </article>
            `;
        },

        /**
         * 渲染侧边栏
         */
        renderSidebar() {
            this.renderArchives();
            this.renderTags();
            this.renderCategories();
        },

        /**
         * 渲染归档
         */
        renderArchives() {
            const archiveList = document.getElementById('archiveList');
            if (!archiveList) return;

            const archives = this.getArchives();
            archiveList.innerHTML = archives.map(archive => `
                <li data-archive="${archive.key}">
                    <span>${archive.label}</span>
                    <span class="sidebar-count">${archive.count}</span>
                </li>
            `).join('');

            // 添加点击事件
            archiveList.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => {
                    const key = item.dataset.archive;
                    this.filterByArchive(key, item.querySelector('span').textContent);
                });
            });
        },

        /**
         * 渲染标签云
         */
        renderTags() {
            const tagCloud = document.getElementById('tagCloud');
            if (!tagCloud) return;

            const tags = this.getTags();
            tagCloud.innerHTML = tags.map(([tag, count]) => `
                <span class="tag-item" data-tag="${this.escapeHtml(tag)}">
                    ${this.escapeHtml(tag)}<span class="tag-count">${count}</span>
                </span>
            `).join('');

            // 添加点击事件
            tagCloud.querySelectorAll('.tag-item').forEach(item => {
                item.addEventListener('click', () => {
                    const tag = item.dataset.tag;
                    this.filterByTag(tag);
                });
            });
        },

        /**
         * 渲染分类
         */
        renderCategories() {
            const categoryList = document.getElementById('categoryList');
            if (!categoryList) return;

            const categories = this.getCategories();
            categoryList.innerHTML = categories.map(([category, count]) => `
                <li data-category="${this.escapeHtml(category)}">
                    <span>${this.escapeHtml(category)}</span>
                    <span class="sidebar-count">${count}</span>
                </li>
            `).join('');

            // 添加点击事件
            categoryList.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => {
                    const category = item.dataset.category;
                    this.filterByCategory(category);
                });
            });
        },

        /**
         * 获取归档统计
         */
        getArchives() {
            const archives = new Map();
            
            this.posts.forEach(post => {
                const date = new Date(post.meta.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                
                if (!archives.has(key)) {
                    archives.set(key, { key, label, count: 0 });
                }
                archives.get(key).count++;
            });

            return Array.from(archives.values()).sort((a, b) => b.key.localeCompare(a.key));
        },

        /**
         * 获取标签统计
         */
        getTags() {
            const tags = new Map();
            
            this.posts.forEach(post => {
                (post.meta.tags || []).forEach(tag => {
                    tags.set(tag, (tags.get(tag) || 0) + 1);
                });
            });

            return Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);
        },

        /**
         * 获取分类统计
         */
        getCategories() {
            const categories = new Map();
            
            this.posts.forEach(post => {
                const category = post.meta.category || '未分类';
                categories.set(category, (categories.get(category) || 0) + 1);
            });

            return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
        },

        /**
         * 按标签筛选
         */
        filterByTag(tag) {
            this.currentFilter = { type: 'tag', value: tag };
            this.filteredPosts = this.posts.filter(post => 
                (post.meta.tags || []).includes(tag)
            );
            this.currentPage = 1;
            this.renderPosts();
            this.showFilterStatus(`标签: ${tag}`);
            this.updateActiveSidebarItems();
        },

        /**
         * 按分类筛选
         */
        filterByCategory(category) {
            this.currentFilter = { type: 'category', value: category };
            this.filteredPosts = this.posts.filter(post => 
                (post.meta.category || '未分类') === category
            );
            this.currentPage = 1;
            this.renderPosts();
            this.showFilterStatus(`分类: ${category}`);
            this.updateActiveSidebarItems();
        },

        /**
         * 按归档筛选
         */
        filterByArchive(key, label) {
            this.currentFilter = { type: 'archive', value: key };
            const [year, month] = key.split('-');
            
            this.filteredPosts = this.posts.filter(post => {
                const date = new Date(post.meta.date);
                return date.getFullYear() === parseInt(year) && 
                       (date.getMonth() + 1) === parseInt(month);
            });
            
            this.currentPage = 1;
            this.renderPosts();
            this.showFilterStatus(label);
            this.updateActiveSidebarItems();
        },

        /**
         * 清除筛选
         */
        clearFilter() {
            this.currentFilter = null;
            this.filteredPosts = [...this.posts];
            this.currentPage = 1;
            this.renderPosts();
            this.hideFilterStatus();
            this.updateActiveSidebarItems();
        },

        /**
         * 显示筛选状态
         */
        showFilterStatus(label) {
            const filterStatus = document.getElementById('filterStatus');
            const filterLabel = document.getElementById('filterLabel');
            
            if (filterStatus && filterLabel) {
                filterLabel.textContent = label;
                filterStatus.classList.remove('hidden');
            }
        },

        /**
         * 隐藏筛选状态
         */
        hideFilterStatus() {
            const filterStatus = document.getElementById('filterStatus');
            if (filterStatus) {
                filterStatus.classList.add('hidden');
            }
        },

        /**
         * 更新侧边栏激活状态
         */
        updateActiveSidebarItems() {
            // 清除所有激活状态
            document.querySelectorAll('.sidebar-list li, .tag-item').forEach(item => {
                item.classList.remove('active');
            });

            if (!this.currentFilter) return;

            const { type, value } = this.currentFilter;
            
            if (type === 'tag') {
                const tagItem = document.querySelector(`.tag-item[data-tag="${value}"]`);
                if (tagItem) tagItem.classList.add('active');
            } else if (type === 'category') {
                const catItem = document.querySelector(`#categoryList li[data-category="${value}"]`);
                if (catItem) catItem.classList.add('active');
            } else if (type === 'archive') {
                const archiveItem = document.querySelector(`#archiveList li[data-archive="${value}"]`);
                if (archiveItem) archiveItem.classList.add('active');
            }
        },

        /**
         * 执行搜索
         */
        performSearch(query) {
            const results = this.posts.filter(post => {
                const titleMatch = post.meta.title.toLowerCase().includes(query);
                const summaryMatch = (post.meta.summary || '').toLowerCase().includes(query);
                const tagMatch = (post.meta.tags || []).some(tag => 
                    tag.toLowerCase().includes(query)
                );
                return titleMatch || summaryMatch || tagMatch;
            }).slice(0, 5);

            this.showSearchResults(results);
        },

        /**
         * 显示搜索结果
         */
        showSearchResults(results) {
            const container = document.getElementById('searchResults');
            if (!container) return;

            if (results.length === 0) {
                container.innerHTML = '<div class="search-no-results">未找到相关文章</div>';
            } else {
                container.innerHTML = results.map(post => `
                    <a href="/posts/${post.id}.html" class="search-result-item">
                        <div class="search-result-title">${this.escapeHtml(post.meta.title)}</div>
                        <div class="search-result-excerpt">${this.escapeHtml(this.generateExcerpt(post.excerpt || post.meta.summary || ''))}</div>
                    </a>
                `).join('');
            }
            
            container.style.display = 'block';
        },

        /**
         * 隐藏搜索结果
         */
        hideSearchResults() {
            const container = document.getElementById('searchResults');
            if (container) {
                container.style.display = 'none';
            }
        },

        /**
         * 格式化日期
         */
        formatDate(dateString) {
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
                })
            };
        },

        /**
         * 生成摘要
         */
        generateExcerpt(text, maxLength = 150) {
            const plain = text
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
        },

        /**
         * HTML 转义
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * 显示错误
         */
        showError() {
            const container = document.getElementById('postsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <h3>加载失败</h3>
                        <p>无法加载文章数据，请稍后重试</p>
                    </div>
                `;
            }
        }
    };

    // 暴露到全局
    window.BlogGenerator = BlogGenerator;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BlogGenerator.init());
    } else {
        BlogGenerator.init();
    }
})();
