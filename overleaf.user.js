// ==UserScript==
// @name         Overleaf Zen Mode
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  Zen mode for Overleaf (Toggle Sidebar, Header, Fullscreen)
// @author       Chengde Qian
// @match        https://www.overleaf.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const BUTTON_CLASS = 'ol-zen-button';
    // Note: Overleaf classes change often. If buttons don't appear, check the TOOLBAR_SELECTOR.

    // --- CSS Styles ---
    const customCSS = `
        ::-webkit-scrollbar {
            width: 4px;
            height: 6px;
            background-color: transparent;
        }
        ::-webkit-scrollbar-track:hover {
            background-color: rgba(0, 0, 0, .1);
        }
        ::-webkit-scrollbar-thumb {
            background-clip: border-box;
            background-color: rgba(0, 0, 0, .2);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, .3);
        }
        .${BUTTON_CLASS} {
            background-color: transparent !important;
            font-size: 14px;
            font-weight: bold;
            color: #555;
            width: 34px;
            height: 34px;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s, background-color 0.2s;
        }
        .${BUTTON_CLASS}:hover {
            color: #000;
            background-color: rgba(0,0,0,0.05) !important;
            border-radius: 4px;
        }
        /* Fix for PDF viewer scroll in fullscreen */
        :fullscreen .pdfjs-viewer-inner, :-webkit-full-screen .pdfjs-viewer-inner {
            overflow-y: auto !important;
        }
    `;

    // --- Helper Functions ---

    function toggleDisplay(selector, displayType = 'flex') {
        const el = document.querySelector(selector);
        if (!el) return;
        el.style.display = (el.style.display === 'none') ? displayType : 'none';
    }

    function isFullscreen() {
        return document.fullscreenElement ||
               document.mozFullScreenElement ||
               document.webkitFullscreenElement ||
               document.msFullscreenElement;
    }

    function toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;

        if (!isFullscreen()) {
            const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            if (request) request.call(docEl);
        } else {
            const cancel = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
            if (cancel) cancel.call(doc);
        }
    }

    function createButton(text, title, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.className = BUTTON_CLASS;
        btn.onclick = (e) => {
            e.preventDefault();
            onClick(btn); // Pass button instance in case we want to change text later
        };
        return btn;
    }

    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) {
            callback(el);
        } else {
            setTimeout(() => waitForElement(selector, callback), 500);
        }
    }

    // --- Main Logic ---
    function init() {
        GM_addStyle(customCSS);

        const lintGutter = document.querySelector(".cm-gutter-lint");
        if (lintGutter) lintGutter.remove();

        const premiumBadge = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(3)");
        if (premiumBadge) premiumBadge.style.display = "none";

        const buttons = [
            // S: Sidebar
            createButton("S", "Toggle Sidebar", () => {
                toggleDisplay("#ide-root > div.ide-redesign-main > div.ide-redesign-body > div > nav");
                toggleDisplay("#review-panel-inner");
            }),

            // L: Line Numbers
            createButton("L", "Toggle Line Numbers", () => {
                toggleDisplay(".cm-gutters");
                const panel = document.querySelector("#panel-outer-main > div > div:nth-child(2) > div");
                if (panel) panel.style.display = "none";
            }),

            // H: Header
            createButton("H", "Toggle Header", () => {
                toggleDisplay(".ide-redesign-toolbar");
            }),

            // F: Fullscreen Toggle (Merged)
            createButton("F", "Toggle Fullscreen", (btn) => {
                toggleFullScreen();
                // Optional: visual feedback could be added here,
                // but standard fullscreen UI usually suffices.
            })
        ];

        // Inject Buttons
        // 4. Inject Buttons into the Toolbar
        // We look for the editor toolbar. Overleaf classes: 'toolbar-editor-right' or 'toolbar-editor'
        const toolbar = document.querySelector('.toolbar-editor') || document.querySelector('.toolbar-header');
        const insert_loc = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div.ol-cm-toolbar-button-group.ol-cm-toolbar-end")

        if (toolbar) {
            // Insert buttons at the beginning of the toolbar
            // We reverse the array so they appear in S, L, H, F, E order when prepended
            buttons.forEach(btn => {
                toolbar.insertBefore(btn, insert_loc);
            });
        }
    }

    waitForElement('.toolbar-editor', init);

})();
