// YouTube字幕调试脚本 - 在YouTube页面控制台运行
(function() {
    console.log('=== YouTube字幕调试开始 ===');
    
    // 1. 检查视频播放器结构
    const player = document.querySelector('#movie_player');
    const videoContainer = document.querySelector('.html5-video-container');
    const video = document.querySelector('video');
    
    console.log('播放器元素:', player);
    console.log('视频容器:', videoContainer);
    console.log('视频元素:', video);
    
    // 2. 查看现有字幕元素
    const existingSubtitles = document.querySelectorAll('[class*="caption"], [class*="subtitle"]');
    console.log('现有字幕相关元素:', existingSubtitles);
    
    // 3. 检查我们的字幕容器
    const ourSubtitle = document.getElementById('youtube-local-subtitle-overlay');
    console.log('我们的字幕容器:', ourSubtitle);
    
    if (ourSubtitle) {
        const styles = window.getComputedStyle(ourSubtitle);
        console.log('字幕容器样式:');
        console.log('- position:', styles.position);
        console.log('- zIndex:', styles.zIndex);
        console.log('- display:', styles.display);
        console.log('- visibility:', styles.visibility);
        console.log('- bottom:', styles.bottom);
        console.log('- left:', styles.left);
        console.log('- transform:', styles.transform);
        
        // 检查容器是否在视窗内
        const rect = ourSubtitle.getBoundingClientRect();
        console.log('字幕容器位置:', rect);
        console.log('视窗大小:', {width: window.innerWidth, height: window.innerHeight});
    }
    
    // 4. 创建测试字幕
    function createTestSubtitle() {
        const testSubtitle = document.createElement('div');
        testSubtitle.id = 'test-subtitle-debug';
        testSubtitle.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999999 !important;
            background: red !important;
            color: white !important;
            padding: 20px !important;
            font-size: 24px !important;
            font-weight: bold !important;
            border: 3px solid yellow !important;
            pointer-events: none !important;
        `;
        testSubtitle.textContent = '测试字幕 - 如果看到说明CSS工作正常';
        document.body.appendChild(testSubtitle);
        
        console.log('测试字幕已创建，5秒后移除');
        setTimeout(() => {
            testSubtitle.remove();
        }, 5000);
    }
    
    // 5. 分析可能的遮挡元素
    function findBlockingElements() {
        const elements = document.elementsFromPoint(window.innerWidth/2, window.innerHeight - 120);
        console.log('底部中央位置的元素层级:', elements);
    }
    
    createTestSubtitle();
    findBlockingElements();
    
    console.log('=== YouTube字幕调试结束 ===');
})();