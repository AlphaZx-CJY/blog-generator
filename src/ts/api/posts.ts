/**
 * 文章数据 API
 */

import type { Post, Archive } from '../types';
import { getArchiveKey, getArchiveLabel } from '../utils/date';

let postsCache: Post[] | null = null;

/**
 * 获取所有文章
 */
export async function fetchPosts(): Promise<Post[]> {
  if (postsCache) return postsCache;
  
  try {
    const response = await fetch('./posts.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    postsCache = await response.json();
    return postsCache || [];
  } catch (error) {
    console.error('加载文章数据失败:', error);
    return [];
  }
}

/**
 * 获取单篇文章
 */
export async function fetchPostById(id: string): Promise<Post | null> {
  const posts = await fetchPosts();
  return posts.find(p => p.id === id) || null;
}

/**
 * 获取归档统计
 */
export async function fetchArchives(): Promise<Archive[]> {
  const posts = await fetchPosts();
  const archives = new Map<string, Archive>();
  
  posts.forEach(post => {
    const key = getArchiveKey(post.meta.date);
    const label = getArchiveLabel(post.meta.date);
    
    if (!archives.has(key)) {
      archives.set(key, { key, label, count: 0 });
    }
    archives.get(key)!.count++;
  });

  return Array.from(archives.values()).sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * 获取标签统计
 */
export async function fetchTags(): Promise<[string, number][]> {
  const posts = await fetchPosts();
  const tags = new Map<string, number>();
  
  posts.forEach(post => {
    (post.meta.tags || []).forEach(tag => {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    });
  });

  return Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * 获取分类统计
 */
export async function fetchCategories(): Promise<[string, number][]> {
  const posts = await fetchPosts();
  const categories = new Map<string, number>();
  
  posts.forEach(post => {
    const category = post.meta.category || '未分类';
    categories.set(category, (categories.get(category) || 0) + 1);
  });

  return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * 搜索文章
 */
export async function searchPosts(query: string, limit: number = 5): Promise<Post[]> {
  const posts = await fetchPosts();
  const lowerQuery = query.toLowerCase();
  
  return posts.filter(post => {
    const titleMatch = post.meta.title.toLowerCase().includes(lowerQuery);
    const summaryMatch = (post.meta.summary || '').toLowerCase().includes(lowerQuery);
    const tagMatch = (post.meta.tags || []).some(tag => 
      tag.toLowerCase().includes(lowerQuery)
    );
    return titleMatch || summaryMatch || tagMatch;
  }).slice(0, limit);
}

/**
 * 按标签筛选
 */
export async function filterByTag(tag: string): Promise<Post[]> {
  const posts = await fetchPosts();
  return posts.filter(post => (post.meta.tags || []).includes(tag));
}

/**
 * 按分类筛选
 */
export async function filterByCategory(category: string): Promise<Post[]> {
  const posts = await fetchPosts();
  return posts.filter(post => (post.meta.category || '未分类') === category);
}

/**
 * 按归档筛选
 */
export async function filterByArchive(year: number, month: number): Promise<Post[]> {
  const posts = await fetchPosts();
  return posts.filter(post => {
    const date = new Date(post.meta.date);
    return date.getFullYear() === year && (date.getMonth() + 1) === month;
  });
}
