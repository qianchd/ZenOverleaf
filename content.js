(function() {
    'use strict';

    // --- Shared Constants ---
    // FIX 1: Added xmlns namespace so DOMParser recognizes this as an SVG graphic
    const SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';

    const ICONS = {
        SIDEBAR: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
        LINENUMS: `<svg ${SVG_ATTRS}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
        HEADER: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>`,
        FULLSCREEN: `<svg ${SVG_ATTRS}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
        MYGIT: `<svg ${SVG_ATTRS}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`
    };

    // --- 2. Shared Helpers ---
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

    // FIX 2: Parse and Import Node safely
    function parseSvg(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        // Check for parsing errors
        if (doc.querySelector('parsererror')) {
            console.error('SVG Parse Error', doc.querySelector('parsererror'));
            return document.createElement('span'); // Fallback
        }
        // Import the node into the current document to ensure it renders correctly
        return document.importNode(doc.documentElement, true);
    }

// ==========================================
    // LOGIC 1: OVERLEAF
    // ==========================================
    function initOverleaf() {
        const BUTTON_CLASS = 'ol-zen-button';

        // --- Git Sync Logic (Smart Discovery Version) ---
        function initGitPanel() {
            if (document.getElementById('ol-mygit-rail-link')) return;

            // --- 1. 使用 DOM API 创建面板 (替代 innerHTML) ---
            const panel = document.createElement('div');
            panel.className = 'ol-mygit-panel';

            // 1.1 Header
            const header = document.createElement('div');
            header.className = 'ol-mygit-header';

            const titleSpan = document.createElement('span');
            titleSpan.style.display = 'flex';
            titleSpan.style.alignItems = 'center';
            titleSpan.style.gap = '6px';
            titleSpan.appendChild(parseSvg(ICONS.GIT || ICONS.MYGIT));
            titleSpan.appendChild(document.createTextNode(' GitHub/CNB Sync'));

            const closeBtn = document.createElement('span');
            closeBtn.className = 'ol-mygit-close';
            closeBtn.id = 'ol-mygit-close-btn';
            closeBtn.textContent = '×';

            header.appendChild(titleSpan);
            header.appendChild(closeBtn);
            panel.appendChild(header);

            // 1.2 Content
            const content = document.createElement('div');
            content.className = 'ol-mygit-content';

            // Helper to create input groups
            const createInputGroup = (labelText, inputId, placeholder, type = 'text', val = '') => {
                const group = document.createElement('div');
                group.className = 'ol-mygit-input-group';

                const label = document.createElement('label');
                label.textContent = labelText;

                const input = document.createElement('input');
                input.type = type;
                input.className = 'ol-mygit-input';
                input.id = inputId;
                if (placeholder) input.placeholder = placeholder;
                if (val) input.value = val;

                group.appendChild(label);
                group.appendChild(input);
                return group;
            };

            content.appendChild(createInputGroup('Repo URL (.git)', 'ol-mygit-repo', 'https://cnb.cool/user/repo.git'));
            content.appendChild(createInputGroup('Branch', 'ol-mygit-branch', '', 'text', 'main'));
            content.appendChild(createInputGroup('Username (Required for CNB/Gitee)', 'ol-mygit-username', 'e.g. cnb (Leave empty for GitHub)'));
            content.appendChild(createInputGroup('Token (PAT)', 'ol-mygit-token', 'Access Token', 'password'));

            // 1.3 Auto Sync Controls
            const autoSyncDiv = document.createElement('div');
            autoSyncDiv.style.cssText = 'display:flex; gap:10px; align-items:center; margin-bottom:10px; font-size:12px;';

            const checkLabel = document.createElement('label');
            checkLabel.style.cssText = 'display:flex;align-items:center;cursor:pointer;';
            const checkBox = document.createElement('input');
            checkBox.type = 'checkbox';
            checkBox.id = 'ol-mygit-autosync-check';
            checkBox.style.marginRight = '5px';
            checkLabel.appendChild(checkBox);
            checkLabel.appendChild(document.createTextNode(' Auto Sync'));

            const intervalInput = document.createElement('input');
            intervalInput.type = 'number';
            intervalInput.id = 'ol-mygit-interval';
            intervalInput.value = '10';
            intervalInput.min = '1';
            intervalInput.style.cssText = 'width:40px; padding:2px;';

            autoSyncDiv.appendChild(checkLabel);
            autoSyncDiv.appendChild(document.createTextNode('Every '));
            autoSyncDiv.appendChild(intervalInput);
            autoSyncDiv.appendChild(document.createTextNode(' mins'));
            content.appendChild(autoSyncDiv);

            // 1.4 Buttons & Status
            const syncButton = document.createElement('button');
            syncButton.className = 'ol-mygit-btn';
            syncButton.id = 'ol-mygit-sync-btn';
            syncButton.textContent = 'Sync Now';
            content.appendChild(syncButton);

            const statusDiv = document.createElement('div');
            statusDiv.className = 'ol-mygit-status';
            statusDiv.id = 'ol-mygit-status';
            statusDiv.textContent = 'Ready';
            content.appendChild(statusDiv);

            panel.appendChild(content);
            document.body.appendChild(panel);

            // --- 2. Create Sidebar Link ---
            const railLink = document.createElement('a');
            railLink.id = 'ol-mygit-rail-link';
            railLink.href = '#';
            railLink.className = 'ide-rail-tab-link nav-link';
            railLink.title = "Git Sync";

            const iconSpan = document.createElement('span');
            iconSpan.className = 'ol-mygit-rail-icon-container';
            iconSpan.appendChild(parseSvg(ICONS.MYGIT || ICONS.GIT));
            railLink.appendChild(iconSpan);

            const sidebarSelector = '.ide-rail-tabs-wrapper';
            const railWrapper = document.querySelector(sidebarSelector);
            if (railWrapper) railWrapper.appendChild(railLink);

            // --- 状态管理 ---
            let isSyncing = false;
            let autoSyncTimer = null;
            const projectId = window.location.pathname.split('/')[2];
            const STORAGE_KEY_PROJECT = `ol_git_${projectId}`;

            // --- 辅助函数 ---
            const updateStatus = (msg, color = 'black') => {
                const el = document.getElementById('ol-mygit-status');
                if(el) { el.textContent = msg; el.style.color = color; }
            };

            const togglePanel = () => {
                panel.classList.toggle('open');
                railLink.classList.toggle('active');
            };
            railLink.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
            document.getElementById('ol-mygit-close-btn').onclick = () => togglePanel();

            // --- Core Sync Task (Updated with Diff Check) ---
            const performSync = async (isAuto = false) => {
                const repo = document.getElementById('ol-mygit-repo').value.trim();
                let branch = document.getElementById('ol-mygit-branch').value.trim();
                const username = document.getElementById('ol-mygit-username').value.trim();
                const token = document.getElementById('ol-mygit-token').value.trim();
                const btn = document.getElementById('ol-mygit-sync-btn');

                if (!repo || !token) {
                    if(!isAuto) updateStatus('Missing Repo/Token', 'red');
                    return;
                }

                if (isSyncing) return;
                isSyncing = true;

                if (!isAuto) {
                    btn.disabled = true;
                    btn.textContent = 'Syncing...';
                } else {
                    updateStatus('Auto Syncing...', '#007bff');
                }

                // Save config
                const autoSyncCheck = document.getElementById('ol-mygit-autosync-check').checked;
                const intervalVal = document.getElementById('ol-mygit-interval').value;
                const saveObj = {};
                saveObj[STORAGE_KEY_PROJECT] = { repo, branch, username, token, autoSync: autoSyncCheck, interval: intervalVal };
                chrome.storage.local.set(saveObj);

                const DB_NAME = `ol-git-mem-${Date.now()}`;

                try {
                    if (typeof git === 'undefined' || typeof LightningFS === 'undefined') throw new Error("Libs missing");
                    if (typeof GitHttp !== 'undefined') git.http = GitHttp;

                    const FS = new LightningFS(DB_NAME);
                    const pfs = FS.promises;
                    const dir = `/${projectId}`;

                    const authCallback = () => {
                        return username ? { username: username, password: token } : { username: token };
                    };

                    // 1. Init FS & Git
                    await pfs.mkdir(dir);
                    await git.init({ fs: FS, dir: dir });
                    await git.addRemote({ fs: FS, dir: dir, remote: 'origin', url: repo, force: true });

                    // 2. Discover Remote Branches
                    if(!isAuto) updateStatus('Checking remote...', '#007bff');

                    let remoteRefs = [];
                    try {
                        remoteRefs = await git.listServerRefs({
                            http: git.http,
                            url: repo,
                            prefix: 'refs/heads',
                            corsProxy: 'https://cors.isomorphic-git.org',
                            onAuth: authCallback
                        });
                    } catch (listErr) {
                        console.warn("List refs failed:", listErr);
                    }

                    const targetRef = `refs/heads/${branch}`;
                    const hasBranch = remoteRefs.find(r => r.ref === targetRef);

                    // Auto-switch branch logic (e.g. main vs master)
                    if (!hasBranch && remoteRefs.length > 0) {
                        const altBranch = branch === 'main' ? 'master' : 'main';
                        const hasAlt = remoteRefs.find(r => r.ref === `refs/heads/${altBranch}`);

                        if (hasAlt) {
                            if(confirm(`Branch '${branch}' not found, but '${altBranch}' exists. Switch to '${altBranch}'?`)) {
                                branch = altBranch;
                                document.getElementById('ol-mygit-branch').value = branch;
                            } else {
                                throw new Error(`Branch '${branch}' not found.`);
                            }
                        }
                    }

                    // 3. Fetch & Checkout
                    if (hasBranch) {
                        if(!isAuto) updateStatus('Fetching...', '#007bff');
                        await git.fetch({
                            fs: FS, http: git.http, dir: dir,
                            remote: 'origin', ref: branch,
                            corsProxy: 'https://cors.isomorphic-git.org',
                            onAuth: authCallback,
                            depth: 1,
                            singleBranch: true
                        });

                        await git.checkout({ fs: FS, dir: dir, ref: branch, force: true });
                    } else {
                        await git.branch({ fs: FS, dir: dir, ref: branch, checkout: true });
                    }

                    // 4. Download ZIP
                    if(!isAuto) updateStatus('Downloading ZIP...', '#007bff');
                    const dlUrl = `https://www.overleaf.com/project/${projectId}/download/zip`;
                    const resp = await fetch(dlUrl, { method: 'GET', credentials: 'include' });
                    if(!resp.ok) throw new Error(`Download status: ${resp.status}`);

                    const cType = resp.headers.get('content-type');
                    if (cType && cType.toLowerCase().includes('text/html')) throw new Error("Got HTML. Relogin required.");

                    const ab = await resp.arrayBuffer();
                    if (ab.byteLength < 100) throw new Error("ZIP too small.");

                    const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ''));
                    const zip = await JSZip.loadAsync(b64, { base64: true });

                    // 5. Extract
                    if(!isAuto) updateStatus('Extracting...', '#007bff');
                    const ensureDir = async (p) => {
                        const parts = p.split('/'); parts.pop();
                        let c = '';
                        for (const part of parts) {
                            if(!part) continue; c += '/' + part;
                            try { await pfs.mkdir(c); } catch (e) {}
                        }
                    };

                    for (const filename of Object.keys(zip.files)) {
                        if (!zip.files[filename].dir) {
                            const content = await zip.files[filename].async('uint8array');
                            const fullPath = `${dir}/${filename}`;
                            await ensureDir(fullPath);
                            await pfs.writeFile(fullPath, content);
                        }
                    }

                    // 6. Commit & Diff Check (THE NEW LOGIC)
                    if(!isAuto) updateStatus('Committing...', '#007bff');
                    await git.add({ fs: FS, dir: dir, filepath: '.' });

                    const commitSha = await git.commit({
                        fs: FS, dir: dir,
                        message: `Overleaf Sync ${isAuto ? '(Auto)' : ''}: ${new Date().toLocaleString()}`,
                        author: { name: 'Overleaf Bot', email: 'bot@overleaf.com' }
                    });

                    // --- CHECK IF FILES CHANGED ---
                    let hasChanges = true;
                    try {
                        const { commit: newCommit } = await git.readCommit({ fs: FS, dir: dir, oid: commitSha });

                        // If there is a parent commit, compare their Tree OIDs
                        if (newCommit.parent && newCommit.parent.length > 0) {
                            const parentSha = newCommit.parent[0];
                            const { commit: parentCommit } = await git.readCommit({ fs: FS, dir: dir, oid: parentSha });

                            // Identical trees mean identical file contents
                            if (newCommit.tree === parentCommit.tree) {
                                hasChanges = false;
                                console.log("[Overleaf Git] Tree OIDs match. No changes detected.");
                            }
                        }
                    } catch (diffErr) {
                        console.warn("Diff check failed, processing with push:", diffErr);
                    }

                    // Stop if no changes
                    if (!hasChanges) {
                        updateStatus('No updates found.', '#17a2b8'); // Cyan color for "info"
                        try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}
                        return; // Exit function immediately
                    }

                    // 7. Push (Only runs if changes exist)
                    if(!isAuto) updateStatus('Pushing...', '#007bff');
                    await git.push({
                        fs: FS, http: git.http, dir: dir, remote: 'origin', ref: branch,
                        force: true,
                        onAuth: authCallback,
                        corsProxy: 'https://cors.isomorphic-git.org',
                    });

                    updateStatus(`Success: ${new Date().toLocaleTimeString()}`, '#28a745');

                    // Cleanup
                    try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}

                } catch (err) {
                    console.error("Sync Error:", err);
                    updateStatus(`Error: ${err.message}`, '#dc3545');
                } finally {
                    isSyncing = false;
                    btn.disabled = false;
                    btn.textContent = 'Sync Now';
                }
            };

            const manageAutoSync = () => {
                const isChecked = document.getElementById('ol-mygit-autosync-check').checked;
                const intervalMin = parseInt(document.getElementById('ol-mygit-interval').value) || 10;
                if (autoSyncTimer) clearInterval(autoSyncTimer);
                autoSyncTimer = null;
                if (isChecked) {
                    console.log(`[Overleaf Git] Auto-sync enabled. Interval: ${intervalMin} mins.`);
                    autoSyncTimer = setInterval(() => performSync(true), intervalMin * 60 * 1000);
                }
            };

            document.getElementById('ol-mygit-sync-btn').onclick = () => performSync(false);
            document.getElementById('ol-mygit-autosync-check').addEventListener('change', () => {
                manageAutoSync();
                const repo = document.getElementById('ol-mygit-repo').value;
                const branch = document.getElementById('ol-mygit-branch').value;
                const username = document.getElementById('ol-mygit-username').value;
                const token = document.getElementById('ol-mygit-token').value;
                const checked = document.getElementById('ol-mygit-autosync-check').checked;
                const interval = document.getElementById('ol-mygit-interval').value;
                const saveObj = {};
                saveObj[STORAGE_KEY_PROJECT] = { repo, branch, username, token, autoSync: checked, interval };
                chrome.storage.local.set(saveObj);
            });

            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY_PROJECT], function(result) {
                    const conf = result[STORAGE_KEY_PROJECT] || {};
                    if(conf.repo) document.getElementById('ol-mygit-repo').value = conf.repo;
                    if(conf.branch) document.getElementById('ol-mygit-branch').value = conf.branch;
                    if(conf.username) document.getElementById('ol-mygit-username').value = conf.username;
                    if(conf.token) document.getElementById('ol-mygit-token').value = conf.token;
                    if (conf.autoSync) document.getElementById('ol-mygit-autosync-check').checked = true;
                    if (conf.interval) document.getElementById('ol-mygit-interval').value = conf.interval;
                    if (conf.autoSync) manageAutoSync();
                });
            }
        }
        // --- Zen Buttons Logic ---
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
            btn.appendChild(parseSvg(content));
            btn.title = title;
            btn.id = id;
            btn.className = BUTTON_CLASS;
            btn.onclick = (e) => { e.preventDefault(); onClick(btn); };
            return btn;
        }

        function mountButtons() {
            const toolbar = document.querySelector('.toolbar-editor') || document.querySelector('.toolbar-header');
            if (!toolbar) return;

            // 尝试初始化 Git Panel (如果还没初始化)
            initGitPanel();

            if (toolbar.querySelector(`.${BUTTON_CLASS}`)) return;

            const insert_loc = document.querySelector("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div.ol-cm-toolbar-button-group.ol-cm-toolbar-end");

            const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
            if(premiumBadges.length > 2) {
                premiumBadges.forEach(el => {
                    el.style.setProperty('display', 'none', 'important');
                });
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
                createButton(ICONS.HEADER, "Toggle Header", "btnHeader", () => {
                    toggleDisplay(".ide-redesign-toolbar");
                }),
                createButton(ICONS.FULLSCREEN, "Toggle Fullscreen", "btnFull", () => {
                    toggleFullScreen();
                })
            ];

            buttons.forEach(btn => {
                if (insert_loc && insert_loc.parentNode === toolbar) {
                    toolbar.insertBefore(btn, insert_loc);
                } else {
                    toolbar.appendChild(btn);
                }
            });
            toggleDisplay(".cm-gutters", 'none');
            toggleDisplay(".cm-gutter-lint", 'none');
        }

        function waitForLoadingGone() {
            return new Promise(resolve => {
                if (!document.querySelector('.loading-panel')) return resolve();
                let counter = 0;
                let counter_large = 0;
                let counter_leak = 0;
                const timer = setInterval(() => {
                    const button_bold = document.querySelector("div.ol-cm-toolbar-button-group:nth-child(4)");
                    const loader = document.querySelector('.loading-panel');
                    const premiumBadges = document.querySelectorAll("#ol-cm-toolbar-wrapper > div.ol-cm-toolbar.toolbar-editor > div:nth-child(n+3):nth-child(-n+7)");
                    if(premiumBadges.length > 0) counter += 1;
                    if(premiumBadges.length > 2) counter_large += 1;
                    counter_leak += 1;
                    if ((!loader && button_bold !== null && button_bold.style.display === "" && (counter > 1 || premiumBadges.length > 2)) || counter_large > 8 || counter > 8) {
                        clearInterval(timer);
                        resolve();
                    } else if (premiumBadges.length > 2) {
                        counter = 0;
                    }
                    if(counter_leak > 88) {
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

        // --- Initialization ---
        const debouncedMount = debounce(mountButtons, 500);

        const observer = new MutationObserver((mutations) => {
            // FIX: 这里之前写成了 debouncedMountZen()，导致了 ReferenceError
            debouncedMount();
            initGitPanel();
        });

        // 观察 body 或者文件树，确保 React 重绘时能重新挂载
        const targetNode = document.querySelector("#ide-redesign-file-tree > div > div.file-tree-inner") || document.body;
        if (targetNode) {
            observer.observe(targetNode, { childList: true, subtree: true });
        }

        // 针对 Git Panel：等待侧边栏出现
        waitForElement('.ide-rail-tabs-wrapper', () => {
            initGitPanel();
        });

        mountButtons();
        debouncedMount();
    }

    // ==========================================
    // LOGIC 2: TEXPAGE (Unchanged)
    // ==========================================
    function initTexPage() {
        // ... (保持原有的 TexPage 代码不变) ...
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
                if (el) el.style.setProperty("background-color", 'transparent', 'important');
                if (request) request.call(docEl).then(() => triggerResizePulse());
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) cancel.call(document).then(() => triggerResizePulse());
            }
        }

        function createButton(iconHtml, title, onClick) {
            const btn = document.createElement('button');
            btn.appendChild(parseSvg(iconHtml));

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