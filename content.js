(function() {
    'use strict';

    // --- Shared Constants ---
    const SVG_ATTRS = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
    const ICONS = {
        SIDEBAR: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
        LINENUMS: `<svg ${SVG_ATTRS}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
        HEADER: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>`,
        FULLSCREEN: `<svg ${SVG_ATTRS}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`
    };

    // --- Shared Helpers ---
    function isFullscreen() {
        return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    }

    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) {
            callback(el);
        } else {
            setTimeout(() => waitForElement(selector, callback), 500);
        }
    }

    // ==========================================
    // LOGIC 1: OVERLEAF
    // ==========================================
    function initOverleaf() {
        const BUTTON_CLASS = 'ol-zen-button';

        // Helper: Find the PDF container and force it to scroll/display correctly
        function fixPdfScroll() {
            const viewers = document.querySelectorAll('.pdfjs-viewer-inner');
            viewers.forEach(el => {
                el.style.setProperty('overflow-y', 'scroll', 'important');
                el.style.setProperty('height', '100vh', 'important');
                el.style.setProperty('display', 'unset', 'important'); // Critical fix for the flexbox lock
            });
        }

        function triggerResizePulse() {
            let count = 0;
            const interval = setInterval(() => {
                // if (isFullscreen()) fixPdfScroll();
                window.dispatchEvent(new Event('resize', { bubbles: true, cancelable: true }));
                count++;
                if (count > 6) clearInterval(interval);
            }, 200);
        }

        function toggleDisplay(selector, displayType = 'flex') {
            const els = document.querySelectorAll(selector);
            els.forEach(el => {
                el.style.display = (el.style.display === 'none') ? displayType : 'none';
            });
        }

        function toggleFullScreen() {
            const docEl = document.documentElement;
            if (!isFullscreen()) {
                const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
                if (request) {
                    request.call(docEl).then(() => {
                        fixPdfScroll();
                        triggerResizePulse();
                    });
                }
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) {
                    cancel.call(document).then(() => {
                        triggerResizePulse();
                    });
                }
            }
        }

        function createButton(content, title, id, onClick) {
            const btn = document.createElement('button');
            btn.innerHTML = content;
            btn.title = title;
            btn.id = id;
            btn.className = BUTTON_CLASS;
            btn.onclick = (e) => { e.preventDefault(); onClick(btn); };
            return btn;
        }

        // --- Core Mount Logic ---
        function mountButtons() {
            // 1. Locate Toolbar
            const toolbar = document.querySelector('.toolbar-editor') || document.querySelector('.toolbar-header');
            if (!toolbar) return;

            // 2. Efficiency Check: Do our buttons already exist?
            // If they do, we stop immediately to avoid duplication.
            if (toolbar.querySelector(`.${BUTTON_CLASS}`)) return;

            // 3. Inject Buttons
            const insert_loc = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div.ol-cm-toolbar-button-group.ol-cm-toolbar-end");

            // Clean up unwanted elements
            const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
            premiumBadges.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });

            const buttons = [
                createButton(ICONS.SIDEBAR, "Toggle Sidebar", "btnSbar", () => {
                    toggleDisplay("#ide-root > div.ide-redesign-main > div.ide-redesign-body > div > nav");
                    toggleDisplay("#review-panel-inner");
                }),
                createButton(ICONS.LINENUMS, "Toggle Gutter", "btnGutter", () => {
                    toggleDisplay(".cm-gutters");
                    toggleDisplay(".cm-gutter-lint");
                }),
                createButton(ICONS.HEADER, "Toggle Header", "btnHeader", () => {
                    toggleDisplay(".ide-redesign-toolbar");
                }),
                createButton(ICONS.FULLSCREEN, "Toggle Fullscreen", "btnFull", () => {
                    toggleFullScreen();
                })
            ];

            buttons.forEach(btn => toolbar.insertBefore(btn, insert_loc));
        }

        // --- 3. Debounce Utility (核心：防抖函数) ---
        // 只有当 DOM 停止变化 delay 毫秒后，fn 才会执行
        function debounce(fn, delay) {
            let timer;
            if(delay < 500) delay = 2000;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(()=>{fn.apply(this, args)}, delay);
            };
        }
        const debouncedMount = debounce(mountButtons, 3000);


        // --- Observer: Watch for UI Updates ---
        const observer = new MutationObserver((mutations) => {
            debouncedMount();
        });
        // const observer = new MutationObserver((mutations) => {
        //     waitForElement('#ide-redesign-panel-source-editor > div > div', mountButtons)
        // });
        const targetNode = document.querySelector("#ide-redesign-file-tree > div > div.file-tree-inner");
        // Start watching the body for changes
        observer.observe(targetNode, { childList: true, subtree: true });

        mountButtons()
        debouncedMount();
    }

    // ==========================================
    // LOGIC 2: TEXPAGE
    // ==========================================
    function initTexPage() {
        const SELECTORS = {
            TOOLBAR: '.editor-actions',
            HEADER: '.project-header',
            LINENUMS: '.cm-gutters',
            SIDEBAR_TARGET: '.cm-gutter-lint'
        };
        const BUTTON_CLASS = 'tp-zen-button';

        const customCSS = `
            ::-webkit-scrollbar { width: 6px; height: 6px; background-color: transparent; border-style: none;}
            ::-webkit-scrollbar-track { background: transparent; border-style: none;}
            ::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, .2); border-radius: 4px; border: 1px solid transparent; background-clip: content-box; }
            ::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, .3); }
            ::-webkit-scrollbar-track:hover {  background-color: rgba(0, 0, 0, .07); }
            ::-webkit-scrollbar-thumb:active { background-color: rgba(0, 0, 0, .5); }

            :fullscreen { background-color: #fff; overflow-y: auto; }
        `;

        function injectStyles(css) {
            const head = document.head || document.getElementsByTagName('head')[0];
            const style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            head.appendChild(style);
        }

        // Apply the styles immediately
        injectStyles(customCSS);

        function triggerResizePulse() {
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
        }

        function toggleDisplay(selector) {
            const els = document.querySelectorAll(selector);
            els.forEach(el => {
                if (el.style.display === 'none') {
                    el.style.removeProperty('display');
                } else {
                    el.style.setProperty('display', 'none', 'important');
                }
            });
            triggerResizePulse();
        }

        function forceHide(selector) {
            const els = document.querySelectorAll(selector);
            els.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        }

        function toggleFullScreen() {
            const docEl = document.documentElement;
            if (!isFullscreen()) {
                const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
                const el = document.querySelector('.pdfViewer');
                el.style.setProperty("background-color", 'transparent', 'important');
                if (request) request.call(docEl).then(() => triggerResizePulse());
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) cancel.call(document).then(() => triggerResizePulse());
            }
        }

        function createButton(iconHtml, title, onClick) {
            const btn = document.createElement('button');
            btn.innerHTML = iconHtml;
            btn.title = title;
            btn.className = BUTTON_CLASS;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick(btn);
            };
            return btn;
        }

        forceHide(SELECTORS.SIDEBAR_TARGET);

        waitForElement(SELECTORS.TOOLBAR, (toolbar) => {
            const buttons = [
                createButton(ICONS.SIDEBAR, "Toggle Lint Bar", () => toggleDisplay(SELECTORS.SIDEBAR_TARGET)),
                createButton(ICONS.LINENUMS, "Toggle Line Numbers", () => toggleDisplay(SELECTORS.LINENUMS)),
                createButton(ICONS.HEADER, "Toggle Header", () => toggleDisplay(SELECTORS.HEADER)),
                createButton(ICONS.FULLSCREEN, "Toggle Fullscreen", () => toggleFullScreen())
            ];
            buttons.forEach(btn => toolbar.appendChild(btn));
            setTimeout(() => { forceHide(SELECTORS.SIDEBAR_TARGET); }, 1000);
        });
    }

    // ==========================================
    // ROUTER
    // ==========================================
    const host = window.location.hostname;
    if (host.includes('overleaf.com')) {
        waitForElement('.toolbar-editor', initOverleaf);
    } else if (host.includes('texpage.com')) {
        waitForElement("#editor > div > div > div.editor-container > div > div.cm-scroller > div.cm-content.cm-lineWrapping", initTexPage);
    }
})();