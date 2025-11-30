// ==UserScript==
// @name         Overleaf Zen Mode
// @namespace    http://tampermonkey.net/
// @version      0.2.0
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
    const TOOLBAR_SELECTOR = '.toolbar-editor-right'; // More stable selector for the top right toolbar
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
            transition: color 0.2s;
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

    // Toggle display property between 'none' and 'flex' (or provided type)
    function toggleDisplay(selector, displayType = 'flex') {
        const el = document.querySelector(selector);
        if (!el) return;
        el.style.display = (el.style.display === 'none') ? displayType : 'none';
    }

    // Toggle fullscreen safely
    function toggleFullScreen(action) {
        const doc = window.document;
        const docEl = doc.documentElement; // Target the whole page

        if (action === 'enter') {
            const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            if (request) request.call(docEl);
        } else {
            const cancel = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
            if (cancel) cancel.call(doc);
        }
    }

    // Factory to create buttons easily
    function createButton(text, title, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title; // Tooltip
        btn.className = BUTTON_CLASS;
        btn.onclick = (e) => {
            e.preventDefault(); // Prevent form submission triggers
            onClick();
        };
        return btn;
    }

    // Wait for the toolbar to exist before injecting buttons
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

        // 1. Remove Lint Gutter (as per original script)
        const lintGutter = document.querySelector(".cm-gutter-lint");
        if (lintGutter) lintGutter.remove();

        // 2. Hide specific Overleaf elements initially if needed
        // (Original script hid a specific toolbar item immediately)
        const premiumBadge = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(3)");
        if (premiumBadge) premiumBadge.style.display = "none";

        // 3. Define Buttons
        const buttons = [
            // S: Sidebar (File tree & Review panel)
            createButton("S", "Toggle Sidebar", () => {
                toggleDisplay("#ide-root > div.ide-redesign-main > div.ide-redesign-body > div > nav"); // File tree
                toggleDisplay("#review-panel-inner"); // Review panel
            }),

            // L: Line Numbers / Gutter
            createButton("L", "Toggle Line Numbers", () => {
                toggleDisplay(".cm-gutters");
                // Also hide the chat/history panel if open
                const panel = document.querySelector("#panel-outer-main > div > div:nth-child(2) > div");
                if (panel) panel.style.display = "none";
            }),

            // H: Header / Top Bar
            createButton("H", "Toggle Header", () => {
                toggleDisplay(".ide-redesign-toolbar");
            }),

            // F: Fullscreen Enter
            createButton("F", "Enter Fullscreen", () => {
                toggleFullScreen('enter');
            }),

            // E: Fullscreen Exit
            createButton("E", "Exit Fullscreen", () => {
                toggleFullScreen('exit');
            })
        ];

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

    // Start waiting for the UI to load
    waitForElement('.toolbar-editor', init);

})();
