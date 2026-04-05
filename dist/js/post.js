/**
 * Post Detail Page Script
 * 文章详情页脚本
 */

(function() {
    'use strict';

    const PostPage = {
        postId: null,
        post: null,

        /**
         * 初始化
         */
        async init() {
            // 从 URL 获取文章 ID
            const pathMatch = window.location.pathname.match(/\/posts\/(.*?)\.html$/);
            if (pathMatch) {
                this.postId = pathMatch[1];
            }

            if (!this.postId) {
                this.showError('文章不存在');
                return;
            }

            try {
                // 加载文章数据
                const response = await fetch('/posts.json');
                const posts = await response.json();
                this.post = posts.find(p => p.id === this.postId);

                if (!this.post) {
                    this.showError('文章不存在');
                    return;
                }

                this.renderPost();
                this.renderNavigation(posts);
                this.setupTOC();
                this.highlightCode();
            } catch (error) {
                console.error('加载文章失败:', error);
                this.showError('加载文章失败');
            }
        },

        /**
         * 渲染文章
         */
        renderPost() {
            const header = document.getElementById('postHeader');
            const content = document.getElementById('postContent');
            const footer = document.getElementById('postFooter');

            if (!header || !content) return;

            const date = this.formatDate(this.post.meta.date);
            const originIcon = this.post.meta.origin === 'original' ? 'fa-pen' : 'fa-share';
            const originText = this.post.meta.origin === 'original' ? '原创' : '转载';

            // 渲染头部
            header.innerHTML = `
                <div class="post-header-content">
                    <div class="post-header-meta">
                        <span class="post-category">${this.escapeHtml(this.post.meta.category || '未分类')}</span>
                        <span class="post-date">
                            <i class="far fa-calendar"></i>
                            ${date.full}
                        </span>
                        <span class="post-origin">
                            <i class="fas ${originIcon}"></i>
                            ${originText}
                        </span>
                    </div>
                    <h1 class="post-header-title">${this.escapeHtml(this.post.meta.title)}</h1>
                    ${this.post.meta.summary ? `<p class="post-header-summary">${this.escapeHtml(this.post.meta.summary)}</p>` : ''}
                </div>
            `;

            // 渲染内容（使用 marked 解析的 HTML）
            content.innerHTML = this.post.html;

            // 渲染页脚标签
            if (footer && this.post.meta.tags && this.post.meta.tags.length > 0) {
                footer.innerHTML = `
                    <div class="post-footer-tags">
                        <span class="post-footer-label">标签：</span>
                        ${this.post.meta.tags.map(tag => `
                            <a href="/index.html" class="post-footer-tag">${this.escapeHtml(tag)}</a>
                        `).join('')}
                    </div>
                `;
            }
        },

        /**
         * 渲染导航
         */
        renderNavigation(posts) {
            const nav = document.getElementById('postNav');
            if (!nav) return;

            const currentIndex = posts.findIndex(p => p.id === this.postId);
            const prev = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
            const next = currentIndex > 0 ? posts[currentIndex - 1] : null;

            nav.innerHTML = `
                ${prev ? `
                    <a href="/posts/${prev.id}.html" class="post-nav-item">
                        <div class="post-nav-label">
                            <i class="fas fa-arrow-left"></i>
                            上一篇
                        </div>
                        <div class="post-nav-title">${this.escapeHtml(prev.meta.title)}</div>
                    </a>
                ` : '<div></div>'}
                ${next ? `
                    <a href="/posts/${next.id}.html" class="post-nav-item next">
                        <div class="post-nav-label">
                            下一篇
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="post-nav-title">${this.escapeHtml(next.meta.title)}</div>
                    </a>
                ` : '<div></div>'}
            `;
        },

        /**
         * 设置目录
         */
        setupTOC() {
            const content = document.getElementById('postContent');
            const tocNav = document.getElementById('tocNav');
            const tocContainer = document.getElementById('tocContainer');

            if (!content || !tocNav) return;

            const headings = content.querySelectorAll('h2, h3');
            if (headings.length === 0) {
                if (tocContainer) tocContainer.style.display = 'none';
                return;
            }

            // 生成目录
            let tocHTML = '';
            headings.forEach((heading, index) => {
                const id = heading.id || `heading-${index}`;
                heading.id = id;
                
                const level = heading.tagName.toLowerCase();
                const text = heading.textContent;
                
                tocHTML += `<a href="#${id}" class="${level}">${this.escapeHtml(text)}</a>`;
            });

            tocNav.innerHTML = tocHTML;

            // 点击事件
            tocNav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // 滚动高亮
            this.setupTOCHighlight(headings, tocNav.querySelectorAll('a'));
        },

        /**
         * 目录滚动高亮
         */
        setupTOCHighlight(headings, links) {
            const observerOptions = {
                rootMargin: '-80px 0px -80% 0px',
                threshold: 0
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        links.forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === `#${id}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, observerOptions);

            headings.forEach(heading => observer.observe(heading));
        },

        /**
         * 高亮代码
         */
        highlightCode() {
            if (typeof hljs !== 'undefined') {
                document.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightBlock(block);
                });
            }
        },

        /**
         * 显示错误
         */
        showError(message) {
            const header = document.getElementById('postHeader');
            const content = document.getElementById('postContent');

            if (header) {
                header.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <h3>${message}</h3>
                    </div>
                `;
            }

            if (content) content.innerHTML = '';
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
                })
            };
        },

        /**
         * HTML 转义
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PostPage.init());
    } else {
        PostPage.init();
    }
})();
