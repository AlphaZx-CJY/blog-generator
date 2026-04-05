/**
 * 日期格式化工具
 */

import type { FormattedDate } from '../types';

/**
 * 格式化日期
 */
export function formatDate(dateString: string): FormattedDate {
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
    }),
    iso: date.toISOString().split('T')[0],
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

/**
 * 获取归档键
 */
export function getArchiveKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取归档标签
 */
export function getArchiveLabel(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
