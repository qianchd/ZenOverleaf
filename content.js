(function() {
    'use strict';

    // Entry point routing
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