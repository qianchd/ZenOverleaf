window.Zen = window.Zen || {};

window.Zen.TexPage = {
    init: function() {
        const ICONS = window.Zen.ICONS;
        const Utils = window.Zen.Utils;

        const SELECTORS = {
            TOOLBAR: '.editor-actions',
            HEADER: '.project-header',
            LINENUMS: '.cm-gutters',
            SIDEBAR_TARGET: '.cm-gutter-lint',
            MENU: '.project-menu'
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
        injectStyles(customCSS);

        function triggerResizePulse() {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
        }

        function toggleDisplay(selector) {
            const els = document.querySelectorAll(selector);
            els.forEach(el => {
                if (el.style.display === 'none') el.style.removeProperty('display');
                else el.style.setProperty('display', 'none', 'important');
            });
            triggerResizePulse();
        }

        function forceHide(selector) {
            const els = document.querySelectorAll(selector);
            els.forEach(el => el.style.setProperty('display', 'none', 'important'));
        }

        function toggleFullScreen() {
            const docEl = document.documentElement;
            if (!Utils.isFullscreen()) {
                const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
                const el = document.querySelector('.pdfViewer');
                if (el) el.style.setProperty("background-color", 'transparent', 'important');
                if (request) request.call(docEl).then(() => triggerResizePulse());
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) cancel.call(document).then(() => triggerResizePulse());
            }
        }

        function createButton(iconHtml, title, onClick) {
            const btn = document.createElement('button');
            btn.appendChild(Utils.parseSvg(iconHtml));
            btn.title = title;
            btn.className = BUTTON_CLASS;
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onClick(btn); };
            return btn;
        }

        forceHide(SELECTORS.SIDEBAR_TARGET);

        Utils.waitForElement(SELECTORS.TOOLBAR, (toolbar) => {
            const buttons = [
                createButton(ICONS.SIDEBAR, "Toggle Lint Bar", () => toggleDisplay(SELECTORS.SIDEBAR_TARGET)),
                createButton(ICONS.LINENUMS, "Toggle Line Numbers", () => toggleDisplay(SELECTORS.LINENUMS)),
                createButton(ICONS.HEADER, "Toggle Header", () => toggleDisplay(SELECTORS.HEADER)),
                createButton(ICONS.FULLSCREEN, "Toggle Fullscreen", () => toggleFullScreen())
            ];
            buttons.forEach(btn => toolbar.appendChild(btn));
            setTimeout(() => { forceHide(SELECTORS.SIDEBAR_TARGET); }, 1000);
        });

        // --- Mount Git Panel for TexPage ---
        Utils.waitForElement(SELECTORS.MENU, (menu) => {
            const items = Array.from(menu.children);
            const syncItem = items.find(li => li.textContent.includes('Sync') || li.querySelector('.icon-cloud-sync'));
            if (syncItem) {
                let dropdown = syncItem.querySelector('ul');
                if (dropdown) {
                    window.Zen.Git.init('texpage', dropdown);
                } else {
                    const observer = new MutationObserver(() => {
                        dropdown = syncItem.querySelector('ul');
                        if(dropdown) {
                            window.Zen.Git.init('texpage', dropdown);
                            observer.disconnect();
                        }
                    });
                    observer.observe(syncItem, { childList: true, subtree: true });
                }
            }
        });
    }
};