// 后台脚本，管理插件状态和与内容脚本通信 
let isTaskbarLyricsRunning = false; 
let taskbarLyricsPort = 3798; // 默认端口 

// 从存储中获取端口配置 
// 在Manifest V3中，需要确保storage API已初始化
const initStorage = async () => {
    try {
        const result = await chrome.storage.local.get(['taskbarLyricsPort']);
        if (result.taskbarLyricsPort) { 
            taskbarLyricsPort = result.taskbarLyricsPort; 
        } 
    } catch (error) {
        console.error('Storage initialization error:', error);
    }
};

// 初始化存储
initStorage();

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'contentScriptLoaded') {
        // 内容脚本已加载，可以发送当前配置
        chrome.tabs.sendMessage(sender.tab.id, {
            action: 'updatePort',
            port: taskbarLyricsPort
        });
    } else if (request.action === 'updatePort') {
        // 更新端口配置
        taskbarLyricsPort = request.port;
        chrome.storage.local.set({ taskbarLyricsPort: taskbarLyricsPort });
        
        // 向所有B站视频页面的内容脚本广播新端口
        chrome.tabs.query({ url: '*://*.bilibili.com/video/*' }, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updatePort',
                    port: taskbarLyricsPort
                });
            });
        });
    }
});

// 监听存储变化 
chrome.storage.onChanged.addListener(function(changes, namespace) { 
    if (namespace === 'local' && changes.taskbarLyricsPort) { 
        taskbarLyricsPort = changes.taskbarLyricsPort.newValue; 
    } 
});