/**
 * 主题切换组件
 */

export class ThemeToggle {
  private button: HTMLElement | null;

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
