#!/usr/bin/env node
/**
 * Blog Generator - Development Server
 * 开发服务器，监听文件变化自动重新构建
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

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
  '.ico': 'image/x-icon',
  '.md': 'text/markdown'
};

/**
 * 获取文件的 MIME 类型
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 读取文件内容
 */
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 创建开发服务器
 */
async function createDevServer() {
  // 首次构建
  console.log('🔨 执行首次构建...\n');
  try {
    execSync('node scripts/build.js', { 
      cwd: ROOT_DIR, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('⚠️ 构建失败，但服务器仍将启动');
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
    const filePath = path.join(ROOT_DIR, 'dist', url);
    
    // 安全检查
    if (!filePath.startsWith(path.join(ROOT_DIR, 'dist'))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    
    // 尝试读取文件
    const result = await readFile(filePath);
    
    if (result.success) {
      const mimeType = getMimeType(filePath);
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });
      res.end(result.content);
    } else {
      // 如果是 HTML 请求，返回 index.html（支持前端路由）
      if (path.extname(url) === '.html' || url.includes('/posts/')) {
        const indexPath = path.join(ROOT_DIR, 'dist', 'index.html');
        const indexResult = await readFile(indexPath);
        if (indexResult.success) {
          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
          });
          res.end(indexResult.content);
          return;
        }
      }
      
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  
  // 监听文件变化
  let buildTimeout = null;
  
  try {
    const { watch } = await import('chokidar');
    
    const watcher = watch([
      path.join(ROOT_DIR, 'content', 'posts', '*.md'),
      path.join(ROOT_DIR, 'src', '**', '*')
    ], {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', (filePath) => {
      console.log(`\n📝 文件变化: ${path.relative(ROOT_DIR, filePath)}`);
      
      // 防抖，避免频繁构建
      clearTimeout(buildTimeout);
      buildTimeout = setTimeout(() => {
        console.log('🔨 重新构建...\n');
        try {
          execSync('node scripts/build.js', { 
            cwd: ROOT_DIR, 
            stdio: 'inherit' 
          });
          console.log('\n✅ 重新构建完成');
        } catch (error) {
          console.error('\n❌ 构建失败');
        }
      }, 500);
    });
    
    console.log('\n👀 监听文件变化...');
  } catch {
    console.log('\n⚠️ 未安装 chokidar，文件变化不会自动触发构建');
    console.log('   运行: npm install chokidar --save-dev');
  }
  
  // 启动服务器
  server.listen(PORT, () => {
    console.log(`\n🚀 开发服务器启动成功！`);
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
createDevServer().catch(error => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});
