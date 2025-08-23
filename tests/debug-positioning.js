// 测试字幕定位和显示的调试函数
function debugSubtitlePositioning() {
  console.log('=== 字幕定位调试信息 ===');
  
  // 检查视频元素
  const video = document.querySelector('video');
  const moviePlayer = document.querySelector('#movie_player');
  const subtitleOverlay = document.getElementById('youtube-local-subtitle-overlay');
  
  console.log('视频元素:', video ? '✅ 存在' : '❌ 不存在');
  console.log('播放器容器:', moviePlayer ? '✅ 存在' : '❌ 不存在');
  console.log('字幕容器:', subtitleOverlay ? '✅ 存在' : '❌ 不存在');
  
  if (video) {
    const videoRect = video.getBoundingClientRect();
    console.log('视频位置:', {
      left: videoRect.left,
      top: videoRect.top,
      width: videoRect.width,
      height: videoRect.height
    });
  }
  
  if (moviePlayer) {
    const playerRect = moviePlayer.getBoundingClientRect();
    console.log('播放器容器位置:', {
      left: playerRect.left,
      top: playerRect.top,
      width: playerRect.width,
      height: playerRect.height,
      position: window.getComputedStyle(moviePlayer).position
    });
  }
  
  if (subtitleOverlay) {
    const overlayRect = subtitleOverlay.getBoundingClientRect();
    console.log('字幕容器位置:', {
      left: overlayRect.left,
      top: overlayRect.top,
      width: overlayRect.width,
      height: overlayRect.height,
      position: window.getComputedStyle(subtitleOverlay).position,
      zIndex: window.getComputedStyle(subtitleOverlay).zIndex,
      display: window.getComputedStyle(subtitleOverlay).display,
      parent: subtitleOverlay.parentElement ? subtitleOverlay.parentElement.id : 'unknown'
    });
  }
  
  // 检查YouTube模式
  const isFullscreen = document.fullscreenElement !== null;
  const isTheaterMode = document.querySelector('.ytp-size-large') !== null;
  const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;
  
  console.log('YouTube模式:', {
    fullscreen: isFullscreen,
    theater: isTheaterMode,
    mini: isMiniPlayer
  });
  
  // 测试字幕显示
  if (subtitleOverlay) {
    const englishSubtitle = subtitleOverlay.querySelector('#englishSubtitle');
    const chineseSubtitle = subtitleOverlay.querySelector('#chineseSubtitle');
    
    if (englishSubtitle) {
      englishSubtitle.textContent = 'Test English Subtitle - Position Check';
      englishSubtitle.style.display = 'inline-block';
    }
    
    if (chineseSubtitle) {
      chineseSubtitle.textContent = '测试中文字幕 - 位置检查';
      chineseSubtitle.style.display = 'inline-block';
    }
    
    subtitleOverlay.style.display = 'block';
    console.log('✅ 测试字幕已显示');
  }
  
  console.log('=== 调试信息完成 ===');
}

// 添加到全局作用域供控制台调用
window.debugSubtitlePositioning = debugSubtitlePositioning;

// 快速修复字幕位置的函数
function fixSubtitlePosition() {
  const subtitleOverlay = document.getElementById('youtube-local-subtitle-overlay');
  const moviePlayer = document.querySelector('#movie_player');
  
  if (subtitleOverlay && moviePlayer) {
    // 确保播放器容器为相对定位
    moviePlayer.style.position = 'relative';
    
    // 将字幕移动到播放器内
    if (!moviePlayer.contains(subtitleOverlay)) {
      moviePlayer.appendChild(subtitleOverlay);
    }
    
    // 设置正确的定位
    Object.assign(subtitleOverlay.style, {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '60px',
      zIndex: '40',
      maxWidth: '90%'
    });
    
    console.log('✅ 字幕位置已修复');
  } else {
    console.log('❌ 无法修复：缺少必要元素');
  }
}

window.fixSubtitlePosition = fixSubtitlePosition;

console.log('调试函数已加载:');
console.log('- debugSubtitlePositioning() - 查看字幕定位信息');
console.log('- fixSubtitlePosition() - 快速修复字幕位置');