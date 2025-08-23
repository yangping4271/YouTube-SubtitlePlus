// 测试新的字幕层级方案
// 模仿YouTube原生字幕的DOM结构和定位方式

(function() {
  console.log('🎯 测试新的字幕层级方案：模仿YouTube原生字幕');
  
  const moviePlayer = document.querySelector('#movie_player');
  const chromeBottom = document.querySelector('.ytp-chrome-bottom');
  
  if (!moviePlayer) {
    console.log('❌ 未找到#movie_player容器');
    return;
  }
  
  if (!chromeBottom) {
    console.log('❌ 未找到.ytp-chrome-bottom控制栏');
    return;
  }
  
  console.log('✅ 找到必要的DOM元素');
  console.log('控制栏位置:', chromeBottom);
  
  // 清理之前的测试
  const oldTest = document.getElementById('test-dom-order');
  if (oldTest) oldTest.remove();
  
  // 创建测试字幕，模仿新的实现方式
  const testSubtitle = document.createElement('div');
  testSubtitle.id = 'test-dom-order';
  testSubtitle.style.cssText = `
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    /* 不设置z-index，依靠DOM顺序 */
    background: rgba(0, 255, 0, 0.9);
    color: black;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    border: 3px solid lime;
    pointer-events: none;
  `;
  
  testSubtitle.textContent = '✅ DOM顺序层级测试 - 应该在控制栏下方';
  
  // 关键：插入到控制栏之前，成为兄弟元素
  moviePlayer.insertBefore(testSubtitle, chromeBottom);
  
  console.log('✅ 已按新方案插入字幕：');
  console.log('  - 插入位置：控制栏之前');
  console.log('  - 定位方式：position: absolute');  
  console.log('  - 层级控制：DOM顺序（无z-index）');
  console.log('  - 预期效果：字幕显示在控制栏下方');
  
  // 检查DOM结构
  const siblings = Array.from(moviePlayer.children);
  const subtitleIndex = siblings.indexOf(testSubtitle);
  const controlsIndex = siblings.indexOf(chromeBottom);
  
  console.log('🔍 DOM结构验证：');
  console.log(`  字幕索引: ${subtitleIndex}`);
  console.log(`  控制栏索引: ${controlsIndex}`);
  console.log(`  结构正确: ${subtitleIndex < controlsIndex ? '✅ 字幕在控制栏前' : '❌ 顺序错误'}`);
  
  setTimeout(() => {
    testSubtitle.remove();
    console.log('🔄 测试完成，元素已移除');
  }, 10000);
  
  return {
    success: subtitleIndex < controlsIndex,
    subtitleIndex: subtitleIndex,
    controlsIndex: controlsIndex
  };
})();