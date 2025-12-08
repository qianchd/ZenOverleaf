// ==UserScript==
// @name         Overleaf Zen Mode
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Zen mode for Overleaf (Toggle Sidebar, Header, Fullscreen) with Scroll Fix
// @author       You
// @match        https://www.overleaf.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- CSS Injection ---
    const customCSS = `
        /* Global Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; background-color: transparent; border-style: none;}
        ::-webkit-scrollbar-track { background: transparent; border-style: none;}
        ::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, .2); border-radius: 4px; border: 1px solid transparent; background-clip: content-box; }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, .3); }
        ::-webkit-scrollbar-track:hover {  background-color: rgba(0, 0, 0, .1); }
        ::-webkit-scrollbar-thumb:active { background-color: rgba(0, 0, 0, .5); }

        /* Overleaf Buttons */
        .ol-zen-button { background-color: transparent !important; font-size: 14px; font-weight: bold; color: #555; width: 34px; height: 34px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background-color 0.2s; }
        .ol-zen-button:hover { color: #000; background-color: rgba(0,0,0,0.05) !important; border-radius: 4px; }

        /* Fullscreen Fixes */
        //:fullscreen, ::backdrop { background-color: #fff; }
        //:fullscreen .pdfjs-viewer-inner, :-webkit-full-screen .pdfjs-viewer-inner,
        //:fullscreen .pdf-viewer, :-webkit-full-screen .pdf-viewer {
        //    height: 100vh !important;
        //    overflow-y: auto !important;
        //}
    `;
    GM_addStyle(customCSS);

    // --- 2. Shared Constants ---
    const SVG_ATTRS = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
    const ICONS = {
        SIDEBAR: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
        LINENUMS: `<svg ${SVG_ATTRS}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
        HEADER: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>`,
        FULLSCREEN: `<svg ${SVG_ATTRS}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`
    };

    // --- 3. Helpers ---
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

    // --- 4. Main Logic ---
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
            if (toolbar.querySelector(`.${BUTTON_CLASS}`)) return;


            // Clean up unwanted elements (Premium Badges)
            const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
            premiumBadges.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });

            // 3. Inject Buttons
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
            const insert_loc = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div.ol-cm-toolbar-button-group.ol-cm-toolbar-end");
            buttons.forEach(btn => toolbar.insertBefore(btn, insert_loc));
            console.log("Overleaf Zen Mode: Buttons Mounted");
        }

        // --- Debounce Utility ---
        function debounce(fn, delay) {
            let timer;
            if(delay < 500) delay = 2000;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(()=>{fn.apply(this, args)}, delay);
            };
        }

        // --- Observer Logic ---
        const debouncedMount = debounce(mountButtons, 3000);

        const observer = new MutationObserver((mutations) => {
            debouncedMount();
        });

        const targetNode = document.querySelector("#ide-redesign-file-tree > div > div.file-tree-inner");

        // Use waitForElement to ensure the targetNode exists before observing
        waitForElement("#ide-redesign-file-tree > div > div.file-tree-inner", (node) => {
             observer.observe(node, { childList: true, subtree: true });
        });

        // Run immediately
        mountButtons();
        debouncedMount();
    }

    // Run when the toolbar is ready
    waitForElement('.toolbar-editor', initOverleaf);

})();