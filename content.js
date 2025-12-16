(function() {
    'use strict';

    // --- inject page_script.js to communicate with the editor---
    function injectScript(file) {
        try {
            var th = document.getElementsByTagName('body')[0];
            var s = document.createElement('script');
            s.setAttribute('type', 'text/javascript');
            s.setAttribute('src', chrome.runtime.getURL(file));
            s.onload = function() {
                this.remove();
                console.log("[ZenOverleaf] " + file + " injected.");
            };
            (document.head || document.documentElement).appendChild(s);
        } catch (e) {
            console.error("[ZenOverleaf] Injection failed:", e);
        }
    }
    injectScript('page_script.js');
    // ----------------------------------------------------

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