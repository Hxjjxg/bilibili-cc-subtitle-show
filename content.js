// 字幕监听和发送功能
(function() {
    'use strict';
    
    // 字幕文本元素的选择器
    const subtitleSelector = '.bili-subtitle-x-subtitle-panel-text';
    const majorGroupSelector = '.bili-subtitle-x-subtitle-panel-major-group';
    const minorGroupSelector = '.bili-subtitle-x-subtitle-panel-minor-group';
    
    let lastMajorText = '';
    let lastMinorText = '';
    let port = 3798; // 默认端口，可通过配置修改
    
    // 从存储中获取端口配置
    chrome.storage.local.get(['taskbarLyricsPort'], function(result) {
        if (result.taskbarLyricsPort) {
            port = result.taskbarLyricsPort;
        }
    });
    
    // 获取当前字幕文本
    function getSubtitleText() {
        const majorElement = document.querySelector(majorGroupSelector + ' ' + subtitleSelector);
        const minorElement = document.querySelector(minorGroupSelector + ' ' + subtitleSelector);
        
        const majorText = majorElement ? majorElement.textContent.trim() : '';
        const minorText = minorElement ? minorElement.textContent.trim() : '';
        
        return {
            major: majorText,
            minor: minorText
        };
    }
    
    // 发送字幕到C++后端
    function sendSubtitleToBackend(subtitle) {
        if (!subtitle.major && !subtitle.minor) return;
        
        fetch(`http://127.0.0.1:${port}/taskbar/lyrics/lyrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                basic: subtitle.major || '',
                extra: subtitle.minor || ''
            })
        }).catch(error => {
            console.error('[B站字幕任务栏] 发送字幕失败:', error);
        });
    }
    
    // 监听字幕变化
    function observeSubtitle() {
        const subtitleWrap = document.querySelector('.bpx-player-subtitle-wrap');
        if (!subtitleWrap) {
            console.log('[B站字幕任务栏] 未找到字幕容器，等待DOM加载...');
            setTimeout(observeSubtitle, 1000);
            return;
        }
        
        console.log('[B站字幕任务栏] 开始监听字幕变化...');
        
        // 创建MutationObserver监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            const currentSubtitle = getSubtitleText();
            
            // 检测字幕变化
            if (currentSubtitle.major !== lastMajorText || currentSubtitle.minor !== lastMinorText) {
                if (currentSubtitle.major !== lastMajorText) {
                    lastMajorText = currentSubtitle.major;
                }
                if (currentSubtitle.minor !== lastMinorText) {
                    lastMinorText = currentSubtitle.minor;
                }
                
                // 发送字幕到后端
                sendSubtitleToBackend(currentSubtitle);
            }
        });
        
        // 开始观察字幕容器及其子节点的变化
        observer.observe(subtitleWrap, {
            childList: true,      // 监听子节点变化
            subtree: true,        // 监听所有后代节点
            characterData: true,  // 监听文本内容变化
            attributes: true      // 监听属性变化
        });
        
        // 初始输出当前字幕
        const initialSubtitle = getSubtitleText();
        if (initialSubtitle.major || initialSubtitle.minor) {
            lastMajorText = initialSubtitle.major;
            lastMinorText = initialSubtitle.minor;
            sendSubtitleToBackend(initialSubtitle);
        }
        
        // 定时检查（作为备用方案，确保不遗漏变化）
        setInterval(function() {
            const currentSubtitle = getSubtitleText();
            if (currentSubtitle.major !== lastMajorText || currentSubtitle.minor !== lastMinorText) {
                if (currentSubtitle.major !== lastMajorText) {
                    lastMajorText = currentSubtitle.major;
                }
                if (currentSubtitle.minor !== lastMinorText) {
                    lastMinorText = currentSubtitle.minor;
                }
                sendSubtitleToBackend(currentSubtitle);
            }
        }, 500); // 每500ms检查一次
    }
    
    // 向后台脚本发送消息，表示内容脚本已加载
    chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });
    
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updatePort') {
            port = request.port;
            console.log('[B站字幕任务栏] 更新端口为:', port);
        }
    });
    
    // 页面加载完成后开始监听
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeSubtitle);
    } else {
        observeSubtitle();
    }
})();