/**
 * 阅读进度组件 - 顶部进度条
 */

export class ReadingProgress {
  private progressBar: HTMLElement | null;

  constructor() {
    this.progressBar = document.getElementById('readingProgress');
    this.init();
  }

  /**
   * 初始化
   */
  private init(): void {
    if (!this.progressBar) return;

    // 使用 requestAnimationFrame 优化滚动性能
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // 初始更新
    this.updateProgress();
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (!this.progressBar) return;

    const article = document.querySelector('article');
    if (!article) return;

    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = rect.height;
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;

    // 计算阅读进度
    // 从文章顶部开始进入视口开始计算，到文章底部离开视口结束
    const startOffset = articleTop;
    const endOffset = articleTop + articleHeight - windowHeight;
    const scrollableDistance = endOffset - startOffset;

    let progress = 0;
    if (scrollableDistance > 0) {
      const currentScroll = scrollTop - startOffset;
      progress = Math.max(0, Math.min(100, (currentScroll / scrollableDistance) * 100));
    } else if (scrollTop >= endOffset) {
      progress = 100;
    }

    this.progressBar.style.width = `${progress}%`;
  }
}
