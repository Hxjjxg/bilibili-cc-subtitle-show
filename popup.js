// 弹出窗口的JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const portInput = document.getElementById('port');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusDiv = document.getElementById('status');
  
  // 从存储中加载设置
  chrome.storage.local.get(['taskbarLyricsPort'], function(result) {
    if (result.taskbarLyricsPort) {
      portInput.value = result.taskbarLyricsPort;
    } else {
      portInput.value = 3798; // 默认端口
    }
  });
  
  // 保存设置
  saveBtn.addEventListener('click', function() {
    const port = parseInt(portInput.value);
    
    if (isNaN(port) || port < 1024 || port > 65535) {
      showStatus('请输入有效的端口号 (1024-65535)', false);
      return;
    }
    
    chrome.storage.local.set({ taskbarLyricsPort: port }, function() {
      // 通知后台脚本更新端口
      chrome.runtime.sendMessage({
        action: 'updatePort',
        port: port
      });
      
      showStatus('设置已保存', true);
    });
  });
  
  // 测试连接
  testBtn.addEventListener('click', function() {
    const port = parseInt(portInput.value) || 3798;
    
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    
    // 测试与C++后端的连接
    fetch(`http://127.0.0.1:${port}/taskbar/lyrics/lyrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        basic: '测试连接成功',
        extra: '任务栏字幕已连接'
      })
    })
    .then(response => {
      if (response.ok) {
        showStatus('连接成功！字幕已发送到任务栏', true);
      } else {
        showStatus(`连接失败: 状态码 ${response.status}`, false);
      }
    })
    .catch(error => {
      showStatus(`连接失败: ${error.message}`, false);
    })
    .finally(() => {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
    });
  });
  
  // 显示状态信息
  function showStatus(message, isSuccess) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (isSuccess ? 'success' : 'error');
    statusDiv.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
});