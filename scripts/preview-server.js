#!/usr/bin/env node
/**
 * Blog Generator - Preview Server
 * 预览构建结果的静态服务器
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = process.env.PORT || 4173;

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * 获取文件的 MIME 类型
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 创建预览服务器
 */
async function createPreviewServer() {
  // 检查 dist 目录是否存在
  try {
    await fs.access(DIST_DIR);
  } catch {
    console.error('❌ 未找到 dist 目录，请先运行 npm run build');
    process.exit(1);
  }
  
  // 创建 HTTP 服务器
  const server = createServer(async (req, res) => {
    // 处理 URL
    let url = decodeURIComponent(req.url);
    
    // 默认首页
    if (url === '/' || url === '') {
      url = '/index.html';
    }
    
    // 构建文件路径
    const filePath = path.join(DIST_DIR, url);
    
    // 安全检查
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    
    // 尝试读取文件
    try {
      const content = await fs.readFile(filePath);
      const mimeType = getMimeType(filePath);
      
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
    } catch (error) {
      // 404 处理
      try {
        // 尝试返回 index.html（支持前端路由）
        const indexPath = path.join(DIST_DIR, 'index.html');
        const indexContent = await fs.readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    }
  });
  
  // 启动服务器
  server.listen(PORT, () => {
    console.log(`\n👀 预览服务器启动成功！`);
    console.log(`   本地访问: http://localhost:${PORT}`);
    console.log(`   按 Ctrl+C 停止服务器\n`);
  });
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n\n👋 正在关闭服务器...');
    server.close(() => {
      process.exit(0);
    });
  });
}

// 启动服务器
createPreviewServer().catch(error => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});
