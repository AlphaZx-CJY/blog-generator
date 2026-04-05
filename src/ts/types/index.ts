/**
 * 博客类型定义
 */

/** 文章元数据 */
export interface PostMeta {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  category: string;
  published: boolean;
  origin: 'original' | 'repost';
  source?: string;
}

/** 文章 */
export interface Post {
  id: string;
  meta: PostMeta;
  excerpt?: string;
  html?: string;
}

/** 归档 */
export interface Archive {
  key: string;
  label: string;
  count: number;
}

/** 筛选类型 */
export type FilterType = 'tag' | 'category' | 'archive' | null;

/** 筛选状态 */
export interface FilterState {
  type: FilterType;
  value: string;
}

/** 日期格式 */
export interface FormattedDate {
  full: string;
  short: string;
  iso: string;
  year: number;
  month: number;
}

/** 搜索选项 */
export interface SearchOptions {
  query: string;
  limit?: number;
}

/** 分页配置 */
export interface PaginationConfig {
  page: number;
  perPage: number;
}
