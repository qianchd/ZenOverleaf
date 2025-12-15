window.Zen = window.Zen || {};

window.Zen.Overleaf = {
    init: function() {
        const BUTTON_CLASS = 'ol-zen-button';
        const ICONS = window.Zen.ICONS;
        const Utils = window.Zen.Utils;

        function fixPdfScroll() {
            const viewers = document.querySelectorAll('.pdfjs-viewer-inner');
            viewers.forEach(el => {
                el.style.setProperty('overflow-y', 'scroll', 'important');
                el.style.setProperty('height', '100vh', 'important');
                el.style.setProperty('display', 'unset', 'important');
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
            if (!Utils.isFullscreen()) {
                const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
                if (request) request.call(docEl).then(() => { fixPdfScroll(); triggerResizePulse(); });
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) cancel.call(document).then(() => triggerResizePulse());
            }
        }

        function createButton(content, title, id, onClick) {
            const btn = document.createElement('button');
            btn.appendChild(Utils.parseSvg(content));
            btn.title = title;
            btn.id = id;
            btn.className = BUTTON_CLASS;
            btn.onclick = (e) => { e.preventDefault(); onClick(btn); };
            return btn;
        }

        function mountButtons() {
            const toolbar = document.querySelector('.toolbar-editor') || document.querySelector('.toolbar-header');
            if (!toolbar) return;

            const sidebar = document.querySelector('.ide-rail-tabs-wrapper');
            if (sidebar) window.Zen.Git.init('overleaf', sidebar);

            if (toolbar.querySelector(`.${BUTTON_CLASS}`)) return;

            const insert_loc = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div.ol-cm-toolbar-button-group.ol-cm-toolbar-end");
            const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
            if(premiumBadges.length > 2) {
                premiumBadges.forEach(el => el.style.setProperty('display', 'none', 'important'));
            }

            const buttons = [
                createButton(ICONS.SIDEBAR, "Toggle Sidebar", "btnSbar", () => {
                    toggleDisplay("#ide-root > div.ide-redesign-main > div.ide-redesign-body > div > nav");
                    toggleDisplay("#review-panel-inner");
                }),
                createButton(ICONS.LINENUMS, "Toggle Gutter", "btnGutter", () => {
                    toggleDisplay(".cm-gutters");
                    toggleDisplay(".cm-gutter-lint");
                }),
                createButton(ICONS.HEADER, "Toggle Header", "btnHeader", () => toggleDisplay(".ide-redesign-toolbar")),
                createButton(ICONS.FULLSCREEN, "Toggle Fullscreen", "btnFull", () => toggleFullScreen())
            ];

            buttons.forEach(btn => {
                if (insert_loc && insert_loc.parentNode === toolbar) toolbar.insertBefore(btn, insert_loc);
                else toolbar.appendChild(btn);
            });
            toggleDisplay(".cm-gutters", 'none');
            toggleDisplay(".cm-gutter-lint", 'none');
        }

        function waitForLoadingGone() {
            return new Promise(resolve => {
                // check if loading panel is gone.
                if (!document.querySelector('.loading-panel')) return resolve();
                let counter = 0;
                let counter_large = 0;
                let counter_leak = 0;
                const timer = setInterval(() => {
                    const button_bold = document.querySelector("div.ol-cm-toolbar-button-group:nth-child(4)");
                    const loader = document.querySelector('.loading-panel');
                    const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
                    if(premiumBadges.length > 0) {
                        counter += 1;
                    }
                    if(premiumBadges.length > 2) {
                        counter_large += 1;
                    }
                    counter_leak += 1;
                    if ((!loader && button_bold !== null && button_bold.style.display === "" && (counter > 1 || premiumBadges.length > 2)) || counter_large > 8 || counter > 8) {
                        clearInterval(timer);
                        resolve();
                    } else if (premiumBadges.length > 2) {
                        counter = 0;
                    }
                    if(counter_leak > 50) {
                        console.log("warning: leak");
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }

        function debounce(fn, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(()=>{
                    (async function() {
                        await waitForLoadingGone();
                        fn.apply(this, args)
                    })();
                }, delay);
            };
        }

        const debouncedMount = debounce(mountButtons, 350);
        const observer = new MutationObserver(() => {
            debouncedMount();
            const sidebar = document.querySelector('.ide-rail-tabs-wrapper');
            if (sidebar) window.Zen.Git.init('overleaf', sidebar);
        });

        const targetNode = document.querySelector("#ide-redesign-file-tree > div > div.file-tree-inner") || document.body;
        if (targetNode) observer.observe(targetNode, { childList: true, subtree: true });

        Utils.waitForElement('.ide-rail-tabs-wrapper', (sidebar) => window.Zen.Git.init('overleaf', sidebar));
        mountButtons();
        debouncedMount();
    }
};