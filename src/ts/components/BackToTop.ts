/**
 * 回到顶部组件
 */

export class BackToTop {
  private button: HTMLElement | null;

  constructor() {
    this.button = document.getElementById('backToTop');
    this.init();
  }

  /**
   * 初始化
   */
  private init(): void {
    if (!this.button) return;

    // 滚动监听
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        this.button?.classList.add('visible');
      } else {
        this.button?.classList.remove('visible');
      }
    });

    // 点击回到顶部
    this.button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
