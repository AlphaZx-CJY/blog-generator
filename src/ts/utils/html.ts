/**
 * HTML 工具函数
 */

/**
 * HTML 转义
 */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 生成摘要
 */
export function generateExcerpt(text: string | undefined, maxLength: number = 150): string {
  if (!text) return '';
  
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
}

/**
 * 创建元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attributes?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
}
