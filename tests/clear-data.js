// 临时清理脚本 - 在浏览器控制台运行
chrome.storage.local.clear().then(() => {
  console.log('扩展数据已清除');
  chrome.storage.local.set({
    subtitleEnabled: false,
    subtitleData: [],
    subtitleSettings: {
      fontSize: 18,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      position: 'bottom',
      theme: 'dark'
    }
  }).then(() => {
    console.log('默认设置已重置');
  });
});