/**
 * 目录组件 - 右侧固定导航
 */

import { escapeHtml } from '../utils/html';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export class TOC {
  private container: HTMLElement | null;
  private nav: HTMLElement | null;
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.container = document.getElementById('tocContainer');
    this.nav = document.getElementById('tocNav');
  }

  /**
   * 从内容生成目录
   */
  generate(contentSelector: string): void {
    const content = document.querySelector(contentSelector);
    if (!content || !this.nav || !this.container) return;

    const headings = content.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
      this.container.style.display = 'none';
      return;
    }

    // 检查屏幕宽度，移动端不显示
    if (window.innerWidth < 1280) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';

    // 生成目录项
    const items: TOCItem[] = [];
    headings.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      heading.id = id;
      
      items.push({
        id,
        text: heading.textContent || '',
        level: parseInt(heading.tagName[1])
      });
    });

    // 渲染目录
    this.nav.innerHTML = items.map(item => `
      <a href="#${item.id}" class="h${item.level}">${escapeHtml(item.text)}</a>
    `).join('');

    // 添加点击事件
    this.nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // 设置滚动监听
    this.setupScrollSpy(headings);

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      if (window.innerWidth < 1280) {
        this.container!.style.display = 'none';
      } else {
        this.container!.style.display = 'block';
      }
    });
  }

  /**
   * 设置滚动监听
   */
  private setupScrollSpy(headings: NodeListOf<Element>): void {
    if (!this.nav) return;

    const links = this.nav.querySelectorAll('a');
    
    const observerOptions = {
      rootMargin: '-80px 0px -80% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              // 将激活项滚动到目录可视区域
              link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });
        }
      });
    }, observerOptions);

    headings.forEach(heading => this.observer?.observe(heading));
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.observer?.disconnect();
  }
}
