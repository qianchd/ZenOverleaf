/**
 * page_script.js (Simplified)
 * 运行在页面上下文中 (Main World)
 */
window.addEventListener("message", (event) => {
    // 1. 安全检查
    if (event.source !== window || !event.data) return;
    if (event.data.source !== "zenoverleaf-content") return;

    // --- 功能 A: 写入内容 (使用标准浏览器 API) ---
    if (event.data.action === "APPLY_CONTENT") {
        const newContent = event.data.content;

        try {
            // 目标：新版编辑器 (.cm-content)
            const cmContent = document.querySelector('.cm-content');

            if (cmContent) {
                cmContent.focus();

                // 1. 全选 (Select All)
                document.execCommand('selectAll');

                // 2. 尝试插入文本 (Insert Text)
                const success = document.execCommand('insertText', false, newContent);

                // 3. 如果插入失败，使用粘贴事件兜底 (Paste Event)
                if (!success) {
                    console.log("[ZenOverleaf] execCommand failed, using Paste Event.");
                    const dt = new DataTransfer();
                    dt.setData('text/plain', newContent);
                    const pasteEvent = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                        clipboardData: dt
                    });
                    cmContent.dispatchEvent(pasteEvent);
                }
                console.log("[ZenOverleaf] Content applied.");
            } else {
                // 找不到编辑器时的最后手段：复制到剪贴板
                navigator.clipboard.writeText(newContent).then(() => {
                    alert("未找到编辑器焦点，内容已复制到剪贴板。");
                });
            }
        } catch (e) {
            console.error("[ZenOverleaf] Apply failed:", e);
        }
    }

    // --- 功能 B: 获取时间 (保持最简逻辑) ---
    if (event.data.action === "GET_PROJECT_TIME") {
        let timestamp = 0;
        try {
            // 尝试读取全局变量
            if (window._ide && window._ide.project) {
                timestamp = new Date(window._ide.project.lastUpdated).getTime();
            } else if (window.project) {
                timestamp = new Date(window.project.lastUpdated).getTime();
            }
        } catch(e) {}

        window.postMessage({
            source: "zenoverleaf-page-script",
            action: "RETURN_PROJECT_TIME",
            timestamp: timestamp
        }, "*");
    }
});