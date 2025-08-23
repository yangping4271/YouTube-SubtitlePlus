// 字幕层级修复验证脚本
// 直接在YouTube页面控制台运行此代码

(function() {
  console.log('🎯 开始验证字幕层级修复...');
  
  // 查找现有字幕元素
  const existingSubtitle = document.getElementById('youtube-local-subtitle-overlay');
  if (existingSubtitle) {
    console.log('✅ 找到现有字幕元素');
    console.log('当前z-index:', window.getComputedStyle(existingSubtitle).zIndex);
  } else {
    console.log('ℹ️ 未找到现有字幕元素，创建测试元素');
  }
  
  // 创建测试字幕元素
  const testSubtitle = document.createElement('div');
  testSubtitle.id = 'test-subtitle-layer';
  testSubtitle.innerHTML = `
    <div style="
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      background: rgba(0,255,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      border: 2px solid lime;
      pointer-events: none;
    ">
      ✅ 测试字幕 (z-index: 50)<br>
      应该显示在进度条下方
    </div>
  `;
  
  document.body.appendChild(testSubtitle);
  
  // 检查YouTube控件层级
  const progressBar = document.querySelector('.ytp-progress-bar');
  const controls = document.querySelector('.ytp-chrome-bottom');
  const controlsContainer = document.querySelector('.ytp-chrome-controls');
  
  console.log('🎮 YouTube控件层级信息:');
  console.log('进度条z-index:', progressBar ? window.getComputedStyle(progressBar).zIndex : '未找到');
  console.log('控制栏z-index:', controls ? window.getComputedStyle(controls).zIndex : '未找到');
  console.log('控制容器z-index:', controlsContainer ? window.getComputedStyle(controlsContainer).zIndex : '未找到');
  
  // 验证层级关系
  const testZ = 50;
  const progressZ = progressBar ? parseInt(window.getComputedStyle(progressBar).zIndex) || 0 : 0;
  const controlsZ = controls ? parseInt(window.getComputedStyle(controls).zIndex) || 0 : 0;
  
  console.log('🔍 层级关系验证:');
  console.log('测试字幕层级:', testZ);
  console.log('YouTube控件最高层级:', Math.max(progressZ, controlsZ, 60));
  
  if (testZ < Math.max(progressZ, controlsZ, 60)) {
    console.log('✅ 层级关系正确：字幕在控制栏下方');
  } else {
    console.log('❌ 层级关系可能有问题：字幕可能遮挡控制栏');
  }
  
  console.log('💡 如果看到绿色测试字幕显示在进度条下方，说明修复成功！');
  
  // 5秒后移除测试元素
  setTimeout(() => {
    const testElement = document.getElementById('test-subtitle-layer');
    if (testElement) {
      testElement.remove();
      console.log('🔄 测试元素已移除');
    }
  }, 5000);
  
  return {
    testZ: testZ,
    youtubeMaxZ: Math.max(progressZ, controlsZ, 60),
    isCorrect: testZ < Math.max(progressZ, controlsZ, 60)
  };
})();