/**
 * page_script.js
 */
window.addEventListener("message", (event) => {
    // 1. security checker
    if (event.source !== window || !event.data) return;
    if (event.data.source !== "zenoverleaf-content") return;

    // --- A: Insert context via API ---
    if (event.data.action === "APPLY_CONTENT") {
        const newContent = event.data.content;

        try {
            // (.cm-content)
            const cmContent = document.querySelector('.cm-content');

            if (cmContent) {
                cmContent.focus();

                // 1. (Select All)
                document.execCommand('selectAll');

                // 2. (Insert Text)
                const success = document.execCommand('insertText', false, newContent);

                // 3. If failed, try Paste Event
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
                // Final Plan C
                navigator.clipboard.writeText(newContent).then(() => {
                    alert("Insert failed. Copy to the clipboard. Please paste by hand.");
                });
            }
        } catch (e) {
            console.error("[ZenOverleaf] Apply failed:", e);
        }
    }

    // --- obatin modified time ---
    if (event.data.action === "GET_PROJECT_TIME") {
        let timestamp = 0;
        try {
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