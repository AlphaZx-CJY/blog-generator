/**
 * Blog Index Page Script
 * 博客首页脚本
 */

(function() {
    'use strict';

    // 博客首页特定的初始化
    document.addEventListener('DOMContentLoaded', function() {
        // 页面加载动画
        const postCards = document.querySelectorAll('.post-card');
        postCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    });
})();
