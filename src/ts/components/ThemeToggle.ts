/**
 * 主题切换组件
 */

export class ThemeToggle {
  private button: HTMLElement | null;
  private giscusSyncTimer: number | null = null;

  constructor() {
    this.button = document.getElementById('themeToggle');
    this.init();
  }

  /**
   * 初始化
   */
  private init(): void {
    // 加载保存的主题
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      this.updateCodeTheme(true);
    }

    // 绑定切换事件
    this.button?.addEventListener('click', () => {
      this.toggle();
    });

    // 同步 Giscus 主题（延迟执行，等待 Giscus 加载）
    this.syncGiscusOnLoad();
  }

  /**
   * 页面加载后同步 Giscus 主题
   * 解决从其他页面切换主题后进入文章页时 Giscus 主题不同步的问题
   */
  private syncGiscusOnLoad(): void {
    // 清除之前的定时器
    if (this.giscusSyncTimer) {
      clearTimeout(this.giscusSyncTimer);
    }

    let attempts = 0;
    const maxAttempts = 50; // 最多尝试 5 秒
    const isDark = this.isDark();

    const trySync = () => {
      attempts++;
      const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
      
      if (iframe && iframe.contentWindow) {
        // Giscus 已加载，同步主题
        this.updateGiscusTheme(isDark);
        return;
      }
      
      // 继续尝试
      if (attempts < maxAttempts) {
        this.giscusSyncTimer = window.setTimeout(trySync, 100);
      }
    };

    // 延迟开始，给 Giscus 脚本加载时间
    this.giscusSyncTimer = window.setTimeout(trySync, 500);
  }

  /**
   * 切换主题
   */
  toggle(): void {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this.updateCodeTheme(isDark);
    this.updateGiscusTheme(isDark);
  }

  /**
   * 更新代码高亮主题
   */
  private updateCodeTheme(isDark: boolean): void {
    const lightTheme = document.getElementById('hljs-light') as HTMLLinkElement;
    const darkTheme = document.getElementById('hljs-dark') as HTMLLinkElement;
    
    if (lightTheme && darkTheme) {
      lightTheme.disabled = isDark;
      darkTheme.disabled = !isDark;
    }
  }

  /**
   * 更新 Giscus 评论主题
   */
  private updateGiscusTheme(isDark: boolean): void {
    const theme = isDark ? 'dark' : 'light';
    
    // 发送消息给 Giscus iframe
    const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        'https://giscus.app'
      );
    }
  }

  /**
   * 获取当前主题
   */
  isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }
}
