"use strict";
(() => {
  // src/ts/utils/date.ts
  function formatDate(dateString) {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      short: date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric"
      }),
      iso: date.toISOString().split("T")[0],
      year: date.getFullYear(),
      month: date.getMonth() + 1
    };
  }
  function getArchiveKey(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  function getArchiveLabel(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708`;
  }

  // src/ts/api/posts.ts
  var postsCache = null;
  async function fetchPosts() {
    if (postsCache) return postsCache;
    try {
      const response = await fetch("/posts.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      postsCache = await response.json();
      return postsCache || [];
    } catch (error) {
      console.error("\u52A0\u8F7D\u6587\u7AE0\u6570\u636E\u5931\u8D25:", error);
      return [];
    }
  }
  async function fetchPostById(id) {
    const posts = await fetchPosts();
    return posts.find((p) => p.id === id) || null;
  }
  async function fetchArchives() {
    const posts = await fetchPosts();
    const archives = /* @__PURE__ */ new Map();
    posts.forEach((post) => {
      const key = getArchiveKey(post.meta.date);
      const label = getArchiveLabel(post.meta.date);
      if (!archives.has(key)) {
        archives.set(key, { key, label, count: 0 });
      }
      archives.get(key).count++;
    });
    return Array.from(archives.values()).sort((a, b) => b.key.localeCompare(a.key));
  }
  async function fetchTags() {
    const posts = await fetchPosts();
    const tags = /* @__PURE__ */ new Map();
    posts.forEach((post) => {
      (post.meta.tags || []).forEach((tag) => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });
    return Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);
  }
  async function fetchCategories() {
    const posts = await fetchPosts();
    const categories = /* @__PURE__ */ new Map();
    posts.forEach((post) => {
      const category = post.meta.category || "\u672A\u5206\u7C7B";
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
  }
  async function searchPosts(query, limit = 5) {
    const posts = await fetchPosts();
    const lowerQuery = query.toLowerCase();
    return posts.filter((post) => {
      const titleMatch = post.meta.title.toLowerCase().includes(lowerQuery);
      const summaryMatch = (post.meta.summary || "").toLowerCase().includes(lowerQuery);
      const tagMatch = (post.meta.tags || []).some(
        (tag) => tag.toLowerCase().includes(lowerQuery)
      );
      return titleMatch || summaryMatch || tagMatch;
    }).slice(0, limit);
  }

  // src/ts/utils/html.ts
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function generateExcerpt(text, maxLength = 150) {
    if (!text) return "";
    const plain = text.replace(/#+ /g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/`([^`]+)`/g, "$1").replace(/!\[([^\]]*)\]\([^\)]+\)/g, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/```[\s\S]*?```/g, "").replace(/\n+/g, " ").trim();
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + "...";
  }

  // src/ts/components/Sidebar.ts
  var DEFAULT_LIMITS = {
    archive: 10,
    tag: 15,
    category: 8
  };
  var Sidebar = class {
    constructor(container, callbacks) {
      this.activeFilters = /* @__PURE__ */ new Map();
      this.expandState = {
        archive: false,
        tag: false,
        category: false
      };
      // 存储原始数据
      this.archivesData = [];
      this.tagsData = [];
      this.categoriesData = [];
      this.container = container;
      this.callbacks = callbacks;
    }
    /**
     * 渲染侧边栏
     */
    async render() {
      this.container.innerHTML = '<div class="sidebar-loading">\u52A0\u8F7D\u4E2D...</div>';
      try {
        const [archives, tags, categories] = await Promise.all([
          fetchArchives(),
          fetchTags(),
          fetchCategories()
        ]);
        this.archivesData = archives;
        this.tagsData = tags;
        this.categoriesData = categories;
        this.renderContent();
      } catch (error) {
        console.error("Sidebar render error:", error);
        this.container.innerHTML = '<div class="sidebar-loading">\u52A0\u8F7D\u5931\u8D25</div>';
      }
    }
    /**
     * 渲染内容（支持重新渲染）
     */
    renderContent() {
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
    renderArchives() {
      if (this.archivesData.length === 0) return "";
      const isExpanded = this.expandState.archive;
      const limit = isExpanded ? this.archivesData.length : DEFAULT_LIMITS.archive;
      const displayArchives = this.archivesData.slice(0, limit);
      const hasMore = this.archivesData.length > DEFAULT_LIMITS.archive;
      return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">\u5F52\u6863</h3>
        <ul class="sidebar-list" data-type="archive">
          ${displayArchives.map((archive) => `
            <li data-value="${archive.key}" data-label="${escapeHtml(archive.label)}">
              <span>${escapeHtml(archive.label)}</span>
              <span class="sidebar-count">${archive.count}</span>
            </li>
          `).join("")}
        </ul>
        ${hasMore ? `
          <button class="show-more-btn" data-type="archive" data-expanded="${isExpanded}">
            ${isExpanded ? "\u6536\u8D77" : `\u67E5\u770B\u66F4\u591A (${this.archivesData.length - DEFAULT_LIMITS.archive})`}
          </button>
        ` : ""}
      </div>
    `;
    }
    /**
     * 渲染标签
     */
    renderTags() {
      if (this.tagsData.length === 0) return "";
      const isExpanded = this.expandState.tag;
      const limit = isExpanded ? this.tagsData.length : DEFAULT_LIMITS.tag;
      const displayTags = this.tagsData.slice(0, limit);
      const hasMore = this.tagsData.length > DEFAULT_LIMITS.tag;
      return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">\u6807\u7B7E</h3>
        <div class="tag-cloud" data-type="tag">
          ${displayTags.map(([tag, count]) => `
            <span class="tag-item" data-value="${escapeHtml(tag)}">
              ${escapeHtml(tag)}<span class="tag-count">${count}</span>
            </span>
          `).join("")}
        </div>
        ${hasMore ? `
          <button class="show-more-btn" data-type="tag" data-expanded="${isExpanded}">
            ${isExpanded ? "\u6536\u8D77" : `\u67E5\u770B\u66F4\u591A (${this.tagsData.length - DEFAULT_LIMITS.tag})`}
          </button>
        ` : ""}
      </div>
    `;
    }
    /**
     * 渲染分类
     */
    renderCategories() {
      if (this.categoriesData.length === 0) return "";
      const isExpanded = this.expandState.category;
      const limit = isExpanded ? this.categoriesData.length : DEFAULT_LIMITS.category;
      const displayCategories = this.categoriesData.slice(0, limit);
      const hasMore = this.categoriesData.length > DEFAULT_LIMITS.category;
      return `
      <div class="sidebar-block">
        <h3 class="sidebar-title">\u5206\u7C7B</h3>
        <ul class="sidebar-list" data-type="category">
          ${displayCategories.map(([category, count]) => `
            <li data-value="${escapeHtml(category)}" data-label="${escapeHtml(category)}">
              <span>${escapeHtml(category)}</span>
              <span class="sidebar-count">${count}</span>
            </li>
          `).join("")}
        </ul>
        ${hasMore ? `
          <button class="show-more-btn" data-type="category" data-expanded="${isExpanded}">
            ${isExpanded ? "\u6536\u8D77" : `\u67E5\u770B\u66F4\u591A (${this.categoriesData.length - DEFAULT_LIMITS.category})`}
          </button>
        ` : ""}
      </div>
    `;
    }
    /**
     * 附加事件监听
     */
    attachEventListeners() {
      this.container.querySelectorAll(".sidebar-list li").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const listEl = item.closest(".sidebar-list");
          const type = listEl?.getAttribute("data-type");
          const value = item.getAttribute("data-value") || "";
          const label = item.getAttribute("data-label") || value;
          if (!type || !value) return;
          const isCurrentlyActive = item.classList.contains("active");
          if (isCurrentlyActive) {
            item.classList.remove("active");
            this.activeFilters.delete(type);
          } else {
            listEl.querySelectorAll("li.active").forEach((el) => el.classList.remove("active"));
            item.classList.add("active");
            this.activeFilters.set(type, value);
          }
          this.callbacks.onToggleFilter(type, value, !isCurrentlyActive, label);
        });
      });
      this.container.querySelectorAll(".tag-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const value = e.currentTarget.getAttribute("data-value") || "";
          if (!value) return;
          const el = e.currentTarget;
          const isCurrentlyActive = el.classList.contains("active");
          if (isCurrentlyActive) {
            el.classList.remove("active");
            this.activeFilters.delete("tag");
          } else {
            el.classList.add("active");
            this.activeFilters.set("tag", value);
          }
          this.callbacks.onToggleFilter("tag", value, !isCurrentlyActive, value);
        });
      });
      this.container.querySelectorAll(".show-more-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const type = e.currentTarget.getAttribute("data-type");
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
    setFilterActive(type, value, isActive) {
      if (isActive) {
        this.activeFilters.set(type, value);
      } else {
        this.activeFilters.delete(type);
      }
      if (type === "tag") {
        this.container.querySelectorAll(".tag-item").forEach((el) => {
          if (el.getAttribute("data-value") === value) {
            el.classList.toggle("active", isActive);
          }
        });
      } else {
        this.container.querySelectorAll(`.sidebar-list[data-type="${type}"] li`).forEach((el) => {
          if (el.getAttribute("data-value") === value) {
            el.classList.toggle("active", isActive);
          }
        });
      }
    }
    /**
     * 清除所有筛选
     */
    clearAllFilters() {
      this.activeFilters.clear();
      this.container.querySelectorAll(".sidebar-list li, .tag-item").forEach((el) => {
        el.classList.remove("active");
      });
    }
  };

  // src/ts/components/PostList.ts
  var PostList = class {
    constructor(container, callbacks) {
      this.posts = [];
      this.container = container;
      this.callbacks = callbacks;
    }
    /**
     * 设置文章数据
     */
    setPosts(posts) {
      this.posts = posts;
      this.render();
    }
    /**
     * 渲染文章列表
     */
    render() {
      if (this.posts.length === 0) {
        this.renderEmpty();
        return;
      }
      this.container.innerHTML = this.posts.map((post) => this.renderPostItem(post)).join("");
    }
    /**
     * 渲染单篇文章
     */
    renderPostItem(post) {
      const date = formatDate(post.meta.date);
      const originText = post.meta.origin === "original" ? "\u539F\u521B" : "\u8F6C\u8F7D";
      const summary = post.meta.summary || generateExcerpt(post.excerpt || "");
      const tags = post.meta.tags || [];
      return `
      <article class="post-item" data-post-id="${post.id}">
        <div class="post-meta">
          <span class="post-category">${escapeHtml(post.meta.category || "\u672A\u5206\u7C7B")}</span>
          <span class="post-date">${date.full}</span>
          <span class="post-origin">${originText}</span>
        </div>
        <h2 class="post-title">
          <a href="/posts/${post.id}.html">${escapeHtml(post.meta.title)}</a>
        </h2>
        <p class="post-summary">${escapeHtml(summary)}</p>
        ${tags.length > 0 ? `
          <div class="post-tags">
            ${tags.map((tag) => `<span class="post-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
        ` : ""}
      </article>
    `;
    }
    /**
     * 渲染空状态
     */
    renderEmpty() {
      this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">\u{1F4C4}</div>
        <h3>\u6682\u65E0\u6587\u7AE0</h3>
        <p>\u8BE5\u5206\u7C7B\u4E0B\u6682\u65F6\u6CA1\u6709\u6587\u7AE0</p>
      </div>
    `;
    }
    /**
     * 渲染加载中
     */
    renderLoading() {
      this.container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>\u6B63\u5728\u52A0\u8F7D\u6587\u7AE0...</p>
      </div>
    `;
    }
    /**
     * 添加文章（用于加载更多）
     */
    appendPosts(posts) {
      const html = posts.map((post) => this.renderPostItem(post)).join("");
      this.container.insertAdjacentHTML("beforeend", html);
      this.posts.push(...posts);
    }
  };

  // src/ts/components/Search.ts
  var Search = class {
    constructor() {
      this.searchTimeout = null;
      this.toggleBtn = document.getElementById("searchToggle");
      this.panel = document.getElementById("searchPanel");
      this.input = document.getElementById("searchInput");
      this.results = document.getElementById("searchResults");
      this.attachEventListeners();
    }
    /**
     * 附加事件监听
     */
    attachEventListeners() {
      this.toggleBtn?.addEventListener("click", () => {
        this.toggle();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.close();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          this.open();
        }
      });
      this.input?.addEventListener("input", () => {
        this.handleInput();
      });
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (!target.closest(".search-panel") && !target.closest("#searchToggle")) {
          this.close();
        }
      });
    }
    /**
     * 切换搜索面板
     */
    toggle() {
      this.panel?.classList.toggle("active");
      if (this.isOpen()) {
        this.input?.focus();
      }
    }
    /**
     * 打开搜索面板
     */
    open() {
      this.panel?.classList.add("active");
      this.input?.focus();
    }
    /**
     * 关闭搜索面板
     */
    close() {
      this.panel?.classList.remove("active");
    }
    /**
     * 是否打开
     */
    isOpen() {
      return this.panel?.classList.contains("active") || false;
    }
    /**
     * 处理输入
     */
    handleInput() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      const query = this.input?.value.trim() || "";
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
    async performSearch(query) {
      try {
        const posts = await searchPosts(query, 5);
        this.renderResults(posts, query);
      } catch (error) {
        console.error("\u641C\u7D22\u5931\u8D25:", error);
      }
    }
    /**
     * 渲染搜索结果
     */
    renderResults(posts, query) {
      if (!this.results) return;
      if (posts.length === 0) {
        this.results.innerHTML = `
        <div class="search-no-results">
          \u672A\u627E\u5230\u4E0E "${escapeHtml(query)}" \u76F8\u5173\u7684\u6587\u7AE0
        </div>
      `;
      } else {
        this.results.innerHTML = posts.map((post) => `
        <a href="/posts/${post.id}.html" class="search-result-item">
          <div class="search-result-title">${escapeHtml(post.meta.title)}</div>
          <div class="search-result-excerpt">${escapeHtml(generateExcerpt(post.excerpt || post.meta.summary, 100))}</div>
        </a>
      `).join("");
      }
      this.results.style.display = "block";
    }
    /**
     * 隐藏搜索结果
     */
    hideResults() {
      if (this.results) {
        this.results.style.display = "none";
      }
    }
  };

  // src/ts/components/ThemeToggle.ts
  var ThemeToggle = class {
    constructor() {
      this.button = document.getElementById("themeToggle");
      this.init();
    }
    /**
     * 初始化
     */
    init() {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (savedTheme === "dark" || !savedTheme && prefersDark) {
        document.documentElement.classList.add("dark");
        this.updateCodeTheme(true);
      }
      this.button?.addEventListener("click", () => {
        this.toggle();
      });
    }
    /**
     * 切换主题
     */
    toggle() {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      this.updateCodeTheme(isDark);
    }
    /**
     * 更新代码高亮主题
     */
    updateCodeTheme(isDark) {
      const lightTheme = document.getElementById("hljs-light");
      const darkTheme = document.getElementById("hljs-dark");
      if (lightTheme && darkTheme) {
        lightTheme.disabled = isDark;
        darkTheme.disabled = !isDark;
      }
    }
    /**
     * 获取当前主题
     */
    isDark() {
      return document.documentElement.classList.contains("dark");
    }
  };

  // src/ts/components/BackToTop.ts
  var BackToTop = class {
    constructor() {
      this.button = document.getElementById("backToTop");
      this.init();
    }
    /**
     * 初始化
     */
    init() {
      if (!this.button) return;
      window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
          this.button?.classList.add("visible");
        } else {
          this.button?.classList.remove("visible");
        }
      });
      this.button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  };

  // src/ts/pages/BlogPage.ts
  var BlogPage = class {
    constructor() {
      this.posts = [];
      this.filteredPosts = [];
      this.currentPage = 1;
      this.postsPerPage = 10;
      this.activeFilters = /* @__PURE__ */ new Map();
      this.sidebar = null;
      this.postList = null;
      this.search = null;
      this.init();
    }
    /**
     * 初始化
     */
    async init() {
      this.search = new Search();
      new ThemeToggle();
      new BackToTop();
      const postsContainer = document.getElementById("postsContainer");
      if (postsContainer) {
        this.postList = new PostList(postsContainer, {
          onLoadMore: () => this.loadMore()
        });
        this.postList.renderLoading();
      }
      const sidebarAside = document.querySelector("aside.sidebar-section");
      if (sidebarAside) {
        this.sidebar = new Sidebar(sidebarAside, {
          onToggleFilter: (type, value, isActive, label) => this.toggleFilter(type, value, isActive, label),
          onClearAllFilters: () => this.clearAllFilters()
        });
        await this.sidebar.render();
      }
      await this.loadPosts();
      document.getElementById("clearFilter")?.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }
    /**
     * 加载文章
     */
    async loadPosts() {
      try {
        this.posts = await fetchPosts();
        this.applyFilters();
      } catch (error) {
        console.error("\u52A0\u8F7D\u6587\u7AE0\u5931\u8D25:", error);
      }
    }
    /**
     * 切换筛选条件
     */
    toggleFilter(type, value, isActive, label) {
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
    applyFilters() {
      let result = [...this.posts];
      for (const [, filter] of this.activeFilters) {
        result = result.filter((post) => this.matchesFilter(post, filter));
      }
      this.filteredPosts = result;
      this.renderPosts();
    }
    /**
     * 检查文章是否匹配筛选条件
     */
    matchesFilter(post, filter) {
      switch (filter.type) {
        case "tag":
          return (post.meta.tags || []).includes(filter.value);
        case "category":
          return (post.meta.category || "\u672A\u5206\u7C7B") === filter.value;
        case "archive": {
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
    renderPosts() {
      const postsToShow = this.filteredPosts.slice(0, this.currentPage * this.postsPerPage);
      if (this.postList) {
        this.postList.setPosts(postsToShow);
      }
      this.updateLoadMoreButton();
    }
    /**
     * 加载更多
     */
    loadMore() {
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
    updateLoadMoreButton() {
      const container = document.getElementById("loadMoreContainer");
      if (!container) return;
      const hasMore = this.currentPage * this.postsPerPage < this.filteredPosts.length;
      container.classList.toggle("hidden", !hasMore);
    }
    /**
     * 清除所有筛选
     */
    clearAllFilters() {
      this.activeFilters.clear();
      this.currentPage = 1;
      this.applyFilters();
      this.sidebar?.clearAllFilters();
      this.updateFilterStatus();
    }
    /**
     * 更新筛选状态显示
     */
    updateFilterStatus() {
      const status = document.getElementById("filterStatus");
      const labelEl = document.getElementById("filterLabel");
      if (!status || !labelEl) return;
      if (this.activeFilters.size === 0) {
        status.classList.add("hidden");
        return;
      }
      const tagsHtml = Array.from(this.activeFilters.values()).map((filter) => `
      <span class="filter-tag" data-type="${filter.type}">
        ${filter.label}
        <button class="filter-tag-remove" data-type="${filter.type}" aria-label="\u79FB\u9664">\xD7</button>
      </span>
    `).join("");
      labelEl.innerHTML = `\u7B5B\u9009: ${tagsHtml}`;
      status.classList.remove("hidden");
      labelEl.querySelectorAll(".filter-tag-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const type = e.currentTarget.getAttribute("data-type");
          const filter = this.activeFilters.get(type);
          if (filter) {
            this.toggleFilter(type, filter.value, false, filter.label);
            this.sidebar?.setFilterActive(type, filter.value, false);
          }
        });
      });
    }
  };

  // src/ts/components/TOC.ts
  var TOC = class {
    constructor() {
      this.observer = null;
      this.container = document.getElementById("tocContainer");
      this.nav = document.getElementById("tocNav");
    }
    /**
     * 从内容生成目录
     */
    generate(contentSelector) {
      const content = document.querySelector(contentSelector);
      if (!content || !this.nav || !this.container) return;
      const headings = content.querySelectorAll("h2, h3");
      if (headings.length === 0) {
        this.container.style.display = "none";
        return;
      }
      if (window.innerWidth < 1280) {
        this.container.style.display = "none";
        return;
      }
      this.container.style.display = "block";
      const items = [];
      headings.forEach((heading, index) => {
        const id = heading.id || `heading-${index}`;
        heading.id = id;
        items.push({
          id,
          text: heading.textContent || "",
          level: parseInt(heading.tagName[1])
        });
      });
      this.nav.innerHTML = items.map((item) => `
      <a href="#${item.id}" class="h${item.level}">${escapeHtml(item.text)}</a>
    `).join("");
      this.nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        });
      });
      this.setupScrollSpy(headings);
      window.addEventListener("resize", () => {
        if (window.innerWidth < 1280) {
          this.container.style.display = "none";
        } else {
          this.container.style.display = "block";
        }
      });
    }
    /**
     * 设置滚动监听
     */
    setupScrollSpy(headings) {
      if (!this.nav) return;
      const links = this.nav.querySelectorAll("a");
      const observerOptions = {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0
      };
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            links.forEach((link) => {
              link.classList.remove("active");
              if (link.getAttribute("href") === `#${id}`) {
                link.classList.add("active");
              }
            });
          }
        });
      }, observerOptions);
      headings.forEach((heading) => this.observer?.observe(heading));
    }
    /**
     * 销毁
     */
    destroy() {
      this.observer?.disconnect();
    }
  };

  // src/ts/pages/PostPage.ts
  var PostPage = class {
    constructor() {
      this.postId = null;
      this.post = null;
      this.toc = null;
      this.init();
    }
    /**
     * 初始化
     */
    async init() {
      const match = window.location.pathname.match(/\/posts\/(.*?)\.html$/);
      this.postId = match ? match[1] : null;
      if (!this.postId) {
        this.showError("\u6587\u7AE0\u4E0D\u5B58\u5728");
        return;
      }
      new Search();
      new ThemeToggle();
      new BackToTop();
      await this.loadPost();
    }
    /**
     * 加载文章
     */
    async loadPost() {
      try {
        this.post = await fetchPostById(this.postId);
        if (!this.post) {
          this.showError("\u6587\u7AE0\u4E0D\u5B58\u5728");
          return;
        }
        this.renderPost();
        this.renderNavigation();
        setTimeout(() => {
          this.setupTOC();
          this.highlightCode();
        }, 100);
      } catch (error) {
        console.error("\u52A0\u8F7D\u6587\u7AE0\u5931\u8D25:", error);
        this.showError("\u52A0\u8F7D\u6587\u7AE0\u5931\u8D25");
      }
    }
    /**
     * 渲染文章
     */
    renderPost() {
      if (!this.post) return;
      const header = document.getElementById("postHeader");
      const content = document.getElementById("postContent");
      const footer = document.getElementById("postFooter");
      const date = formatDate(this.post.meta.date);
      const originText = this.post.meta.origin === "original" ? "\u539F\u521B" : "\u8F6C\u8F7D";
      if (header) {
        header.innerHTML = `
        <div class="post-header-content">
          <div class="post-header-meta">
            <span class="post-category">${escapeHtml(this.post.meta.category || "\u672A\u5206\u7C7B")}</span>
            <span class="post-date">${date.full}</span>
            <span class="post-origin">${originText}</span>
          </div>
          <h1 class="post-header-title">${escapeHtml(this.post.meta.title)}</h1>
          ${this.post.meta.summary ? `<p class="post-header-summary">${escapeHtml(this.post.meta.summary)}</p>` : ""}
        </div>
      `;
      }
      if (content) {
        content.innerHTML = this.post.html || "";
      }
      if (footer && this.post.meta.tags?.length) {
        footer.innerHTML = `
        <div class="post-footer-tags">
          <span class="post-footer-label">\u6807\u7B7E:</span>
          ${this.post.meta.tags.map((tag) => `
            <a href="/index.html" class="post-footer-tag">${escapeHtml(tag)}</a>
          `).join("")}
        </div>
      `;
      }
    }
    /**
     * 渲染导航
     */
    async renderNavigation() {
      if (!this.post) return;
      const nav = document.getElementById("postNav");
      if (!nav) return;
      try {
        const posts = await fetchPosts();
        const currentIndex = posts.findIndex((p) => p.id === this.postId);
        const prev = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
        const next = currentIndex > 0 ? posts[currentIndex - 1] : null;
        nav.innerHTML = `
        ${prev ? `
          <a href="/posts/${prev.id}.html" class="post-nav-item">
            <div class="post-nav-label">\u2190 \u4E0A\u4E00\u7BC7</div>
            <div class="post-nav-title">${escapeHtml(prev.meta.title)}</div>
          </a>
        ` : "<div></div>"}
        ${next ? `
          <a href="/posts/${next.id}.html" class="post-nav-item next">
            <div class="post-nav-label">\u4E0B\u4E00\u7BC7 \u2192</div>
            <div class="post-nav-title">${escapeHtml(next.meta.title)}</div>
          </a>
        ` : "<div></div>"}
      `;
      } catch (error) {
        console.error("\u52A0\u8F7D\u5BFC\u822A\u5931\u8D25:", error);
      }
    }
    /**
     * 设置目录
     */
    setupTOC() {
      this.toc = new TOC();
      this.toc.generate("#postContent");
    }
    /**
     * 代码高亮
     */
    highlightCode() {
      if (typeof hljs !== "undefined") {
        document.querySelectorAll("pre code").forEach((block) => {
          hljs.highlightBlock(block);
        });
      }
    }
    /**
     * 显示错误
     */
    showError(message) {
      const header = document.getElementById("postHeader");
      const content = document.getElementById("postContent");
      if (header) {
        header.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">\u26A0\uFE0F</div>
          <h3>${message}</h3>
        </div>
      `;
      }
      if (content) content.innerHTML = "";
    }
  };

  // src/ts/index.ts
  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path === "/" || path === "/index.html") {
      new BlogPage();
    } else if (path.startsWith("/posts/")) {
      new PostPage();
    }
  });
})();
