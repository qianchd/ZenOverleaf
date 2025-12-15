(function() {
    'use strict';

    // --- [新增] 注入 page_script.js 以获得编辑器权限 ---
    // 这是修复 "Apply" 按钮点击无效的关键
    function injectScript(file) {
        try {
            var th = document.getElementsByTagName('body')[0];
            var s = document.createElement('script');
            s.setAttribute('type', 'text/javascript');
            s.setAttribute('src', chrome.runtime.getURL(file));
            s.onload = function() {
                // 执行完后移除 script 标签，保持 DOM 整洁
                this.remove();
                console.log("[ZenOverleaf] " + file + " injected.");
            };
            (document.head || document.documentElement).appendChild(s);
        } catch (e) {
            console.error("[ZenOverleaf] Injection failed:", e);
        }
    }
    // 立即执行注入
    injectScript('page_script.js');
    // ----------------------------------------------------

    // Entry point routing (保持原样)
    const host = window.location.hostname;

    // Check if dependencies are loaded
    if (!window.Zen || !window.Zen.Utils) {
        console.warn("ZenOverleaf modules not loaded yet.");
        return;
    }

    const Utils = window.Zen.Utils;

    if (host.includes('overleaf.com')) {
        Utils.waitForElement('.toolbar-editor', window.Zen.Overleaf.init);
    } else if (host.includes('texpage.com')) {
        Utils.waitForElement("#editor > div > div > div.editor-container > div > div.cm-scroller > div.cm-content.cm-lineWrapping", window.Zen.TexPage.init);
    }
})();