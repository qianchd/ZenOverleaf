(function() {
    'use strict';

    // --- Shared Constants ---
    const SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';

    const ICONS = {
        SIDEBAR: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
        LINENUMS: `<svg ${SVG_ATTRS}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
        HEADER: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>`,
        FULLSCREEN: `<svg ${SVG_ATTRS}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
        MYGIT: `<svg ${SVG_ATTRS}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`
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

    function parseSvg(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        if (doc.querySelector('parsererror')) {
            return document.createElement('span');
        }
        return document.importNode(doc.documentElement, true);
    }

    // ==========================================
    // SHARED: GIT PANEL LOGIC
    // ==========================================
    function initGitPanel(platform, mountPoint) {
        const linkId = `ol-mygit-trigger-${platform}`;
        if (document.getElementById(linkId)) return;

        // --- Determine Project ID (Generic) ---
        let projectId = 'unknown_project';
        if (platform === 'overleaf') {
            const parts = window.location.pathname.split('/');
            if(parts.length > 2) projectId = parts[2];
        } else if (platform === 'texpage') {
            // Try to grab UUID from URL if present, else use slug
            const match = window.location.pathname.match(/([0-9a-fA-F-]{36})/);
            projectId = match ? match[1] : window.location.pathname.replace(/^\/|\/$/g, '').replace(/\//g, '_');
        }
        const STORAGE_KEY_PROJECT = `git_config_${projectId}`;

        // --- 1. Create Panel ---
        const panel = document.createElement('div');
        panel.className = 'ol-mygit-panel';

        if (platform === 'texpage') {
            panel.style.left = 'unset';
            panel.style.right = '280px';
            panel.style.top = '50px';
            panel.style.bottom = 'unset';
        }

        // Header
        const header = document.createElement('div');
        header.className = 'ol-mygit-header';
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'display:flex;align-items:center;gap:6px';
        titleSpan.appendChild(parseSvg(ICONS.MYGIT));
        titleSpan.appendChild(document.createTextNode(' GitHub/CNB Sync'));
        const closeBtn = document.createElement('span');
        closeBtn.className = 'ol-mygit-close';
        closeBtn.id = 'ol-mygit-close-btn';
        closeBtn.textContent = '×';
        header.appendChild(titleSpan);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'ol-mygit-content';

        const createInput = (labelText, id, placeholder, type = 'text', defaultVal = '') => {
            const group = document.createElement('div');
            group.className = 'ol-mygit-input-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            const input = document.createElement('input');
            input.type = type;
            input.className = 'ol-mygit-input';
            input.id = id;
            if(placeholder) input.placeholder = placeholder;
            if(defaultVal) input.value = defaultVal;
            group.appendChild(label);
            group.appendChild(input);
            return group;
        };

        content.appendChild(createInput('Repo URL (.git)', 'ol-mygit-repo', 'e.g., https://github.com/{user}/{repo}.git'));
        content.appendChild(createInput('Branch', 'ol-mygit-branch', '', 'text', 'main'));
        content.appendChild(createInput('Username (Required for CNB/Gitee)', 'ol-mygit-username', 'e.g. cnb'));
        content.appendChild(createInput('Token (PAT)', 'ol-mygit-token', 'Access Token', 'password'));

        // [Feature] Custom Commit Message (Not saved to storage)
        content.appendChild(createInput('Commit Message (Optional)', 'ol-mygit-commit-msg', 'Default: Platform Sync + Time'));

        // [Feature] Custom Proxy (Saved to storage)
        content.appendChild(createInput('CORS Proxy (Optional)', 'ol-mygit-proxy', 'Default: Auto-select (Custom/Workers/Official)'));

        // Auto Sync
        const autoSyncContainer = document.createElement('div');
        autoSyncContainer.style.cssText = 'display:flex; gap:10px; align-items:center; margin-bottom:10px; font-size:12px;';
        const checkboxLabel = document.createElement('label');
        checkboxLabel.style.cssText = 'display:flex;align-items:center;cursor:pointer;';
        const autoSyncCheck = document.createElement('input');
        autoSyncCheck.type = 'checkbox';
        autoSyncCheck.id = 'ol-mygit-autosync-check';
        autoSyncCheck.style.marginRight = '5px';
        checkboxLabel.appendChild(autoSyncCheck);
        checkboxLabel.appendChild(document.createTextNode(' Auto Sync'));
        const intervalInput = document.createElement('input');
        intervalInput.type = 'number';
        intervalInput.id = 'ol-mygit-interval';
        intervalInput.value = '10';
        intervalInput.min = '1';
        intervalInput.style.cssText = 'width:40px; padding:2px;';
        autoSyncContainer.appendChild(checkboxLabel);
        autoSyncContainer.appendChild(document.createTextNode('Every '));
        autoSyncContainer.appendChild(intervalInput);
        autoSyncContainer.appendChild(document.createTextNode(' mins'));
        content.appendChild(autoSyncContainer);

        // Button & Status
        const syncBtn = document.createElement('button');
        syncBtn.className = 'ol-mygit-btn';
        syncBtn.id = 'ol-mygit-sync-btn';
        syncBtn.textContent = 'Sync Now';
        content.appendChild(syncBtn);

        const statusDiv = document.createElement('div');
        statusDiv.className = 'ol-mygit-status';
        statusDiv.id = 'ol-mygit-status';
        statusDiv.textContent = 'Ready';
        content.appendChild(statusDiv);

        panel.appendChild(content);
        document.body.appendChild(panel);

        // --- 2. Create Trigger ---
        const togglePanel = () => {
            if(panel.style.display === 'block') {
                panel.style.display = 'none';
                if(platform === 'overleaf' && railLink) railLink.classList.remove('active');
            } else {
                panel.style.display = 'block';
                if(platform === 'overleaf' && railLink) railLink.classList.add('active');
            }
        };

        let railLink;
        if (platform === 'overleaf') {
            railLink = document.createElement('a');
            railLink.id = linkId;
            railLink.href = '#';
            railLink.className = 'ide-rail-tab-link nav-link';
            railLink.title = "Git Sync";
            const iconSpan = document.createElement('span');
            iconSpan.className = 'ol-mygit-rail-icon-container';
            iconSpan.appendChild(parseSvg(ICONS.MYGIT));
            railLink.appendChild(iconSpan);
            railLink.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
            if (mountPoint) mountPoint.appendChild(railLink);
        } else if (platform === 'texpage') {
            const li = document.createElement('li');
            li.id = linkId;
            li.style.cursor = 'pointer';
            li.onclick = (e) => { e.stopPropagation(); togglePanel(); };
            const iconSpan = document.createElement('span');
            iconSpan.className = 'anticon';
            iconSpan.style.marginRight = '8px';
            iconSpan.appendChild(parseSvg(ICONS.MYGIT));
            const textNode = document.createTextNode(' MyGit');
            li.appendChild(iconSpan);
            li.appendChild(textNode);
            if (mountPoint) mountPoint.appendChild(li);
        }

        document.getElementById('ol-mygit-close-btn').onclick = () => togglePanel();

        // --- Core Sync Logic (Updated) ---
        let isSyncing = false;
        let autoSyncTimer = null;

        const updateStatus = (msg, color = 'black') => {
            const el = document.getElementById('ol-mygit-status');
            if(el) { el.textContent = msg; el.style.color = color; }
        };

        const performSync = async (isAuto = false) => {
            const repo = document.getElementById('ol-mygit-repo').value.trim();
            let branch = document.getElementById('ol-mygit-branch').value.trim();
            const username = document.getElementById('ol-mygit-username').value.trim();
            const token = document.getElementById('ol-mygit-token').value.trim();

            // Get Custom inputs
            const customCommitMsg = document.getElementById('ol-mygit-commit-msg').value.trim();
            const customProxy = document.getElementById('ol-mygit-proxy').value.trim();

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

            // Save settings (EXCLUDING commitMsg)
            const autoSyncCheck = document.getElementById('ol-mygit-autosync-check').checked;
            const intervalVal = document.getElementById('ol-mygit-interval').value;
            const saveObj = {};
            saveObj[STORAGE_KEY_PROJECT] = { repo, branch, username, token, autoSync: autoSyncCheck, interval: intervalVal,
                // commitMsg: NOT SAVED
                proxy: customProxy
            };
            chrome.storage.local.set(saveObj);

            const DB_NAME = `ol-git-mem-${Date.now()}`;

            try {
                if (typeof git === 'undefined' || typeof LightningFS === 'undefined') throw new Error("Libs missing");
                if (typeof GitHttp !== 'undefined') git.http = GitHttp;

                const FS = new LightningFS(DB_NAME);
                const pfs = FS.promises;
                const dir = `/${projectId}`;
                const authCallback = () => username ? { username: username, password: token } : { username: token };

                // 1. Init
                await pfs.mkdir(dir);
                await git.init({ fs: FS, dir: dir });
                await git.addRemote({ fs: FS, dir: dir, remote: 'origin', url: repo, force: true });

                // 2. Discover Remote & Determine Proxy
                let proxyList = [];
                if (customProxy) {
                    proxyList = [customProxy];
                } else {
                    proxyList = [
                        'https://gitcors4516.qianchd.workers.dev',
                        'https://cors.isomorphic-git.org'
                    ];
                }

                if(!isAuto) updateStatus('Checking remote...', '#007bff');

                let remoteRefs = [];
                let activeProxy = proxyList[0];
                let connectSuccess = false;

                // Loop through proxies
                for (const proxyUrl of proxyList) {
                    try {
                        console.log(`[Git Sync] Trying proxy: ${proxyUrl}`);
                        remoteRefs = await git.listServerRefs({
                            http: git.http, url: repo, prefix: 'refs/heads',
                            corsProxy: proxyUrl,
                            onAuth: authCallback
                        });
                        activeProxy = proxyUrl;
                        connectSuccess = true;
                        break;
                    } catch (e) {
                        console.warn(`[Git Sync] Proxy ${proxyUrl} failed:`, e);
                    }
                }

                if (!connectSuccess && !isAuto) {
                    console.warn("Could not list remote refs with any proxy.");
                }

                const targetRef = `refs/heads/${branch}`;
                const hasBranch = remoteRefs.find(r => r.ref === targetRef);
                if (!hasBranch && remoteRefs.length > 0) {
                    const alt = branch === 'main' ? 'master' : 'main';
                    if (remoteRefs.find(r => r.ref === `refs/heads/${alt}`) && confirm(`Branch '${branch}' not found, use '${alt}'?`)) {
                        branch = alt;
                        document.getElementById('ol-mygit-branch').value = branch;
                    }
                }

                // 3. Fetch/Checkout
                if (hasBranch) {
                    if(!isAuto) updateStatus('Fetching...', '#007bff');
                    await git.fetch({
                        fs: FS, http: git.http, dir: dir, remote: 'origin', ref: branch,
                        corsProxy: activeProxy,
                        onAuth: authCallback,
                        depth: 1, singleBranch: true
                    });
                    await git.checkout({ fs: FS, dir: dir, ref: branch, force: true });
                } else {
                    await git.branch({ fs: FS, dir: dir, ref: branch, checkout: true });
                }

                // 4. Download (Platform specific)
                if(!isAuto) updateStatus('Downloading ZIP...', '#007bff');
                let dlUrl;

                if (platform === 'overleaf') {
                    dlUrl = `https://www.overleaf.com/project/${projectId}/download/zip`;
                } else {
                    // --- TexPage ID Extraction Strategy ---
                    let pKey, vNo;

                    // Priority 1: Extract from URL (e.g. /project/user/UUID/UUID)
                    const urlMatch = window.location.pathname.match(/\/([0-9a-fA-F-]{36})\/([0-9a-fA-F-]{36})/);
                    if (urlMatch) {
                        pKey = urlMatch[1];
                        vNo = urlMatch[2];
                        console.log(`[Git Sync] Extracted from URL: P=${pKey}, V=${vNo}`);
                    } else {
                        // Priority 2: Fallback to scraping page source (for vanity URLs)
                        console.log("[Git Sync] URL regex failed, scanning source...");
                        const html = document.documentElement.innerHTML;
                        const pMatch = html.match(/"projectKey"\s*:\s*"([0-9a-fA-F-]+)"/);
                        const vMatch = html.match(/"versionNo"\s*:\s*"([0-9a-fA-F-]+)"/) || html.match(/"versionId"\s*:\s*"([0-9a-fA-F-]+)"/);
                        if (pMatch) pKey = pMatch[1];
                        if (vMatch) vNo = vMatch[1];
                    }

                    if (!pKey || !vNo) {
                        throw new Error("Could not find ProjectKey or VersionNo. Please ensure you are inside a project editor.");
                    }

                    dlUrl = `https://www.texpage.com/api/project/download?projectKey=${pKey}&versionNo=${vNo}&bbl=false`;
                }

                const resp = await fetch(dlUrl, { method: 'GET', credentials: 'include' });
                if(!resp.ok) throw new Error(`Download failed: ${resp.status}`);

                // Content Type check
                const cType = resp.headers.get('content-type');
                if (cType && cType.includes('application/json')) {
                    const json = await resp.json();
                    if (json.status && json.status.code !== 200) {
                        throw new Error(`API Error: ${json.status.message} (${json.status.code})`);
                    }
                    throw new Error("Got JSON but expected ZIP. Check console.");
                }

                const blob = await resp.blob();
                if (blob.size < 100) throw new Error("File too small");

                const base64String = await new Promise((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result.split(',')[1]);
                    r.readAsDataURL(blob);
                });
                const zip = await JSZip.loadAsync(base64String, { base64: true });

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

                // 6. Commit & Diff
                if(!isAuto) updateStatus('Committing...', '#007bff');
                await git.add({ fs: FS, dir: dir, filepath: '.' });

                // Use Custom Commit Message or Default
                const defaultMsg = `${platform === 'overleaf' ? 'Overleaf' : 'TexPage'} Sync ${isAuto ? '(Auto)' : ''}: ${new Date().toLocaleString()}`;
                const finalMsg = customCommitMsg ? customCommitMsg : defaultMsg;

                const commitSha = await git.commit({
                    fs: FS, dir: dir,
                    message: finalMsg,
                    author: { name: 'Bot', email: 'bot@qstat.site' }
                });

                // Diff Check
                let hasChanges = true;
                try {
                    const { commit: newC } = await git.readCommit({ fs: FS, dir: dir, oid: commitSha });
                    if (newC.parent && newC.parent.length > 0) {
                        const { commit: parentC } = await git.readCommit({ fs: FS, dir: dir, oid: newC.parent[0] });
                        if (newC.tree === parentC.tree) {
                            hasChanges = false;
                            console.log("[Git Sync] No changes.");
                        }
                    }
                } catch (e) {}

                if (!hasChanges) {
                    updateStatus('No updates found.', '#17a2b8');
                    try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}
                    return;
                }

                // 7. Push (Use activeProxy)
                if(!isAuto) updateStatus('Pushing...', '#007bff');
                await git.push({
                    fs: FS, http: git.http, dir: dir, remote: 'origin', ref: branch,
                    force: true, onAuth: authCallback,
                    corsProxy: activeProxy
                });

                updateStatus(`Success: ${new Date().toLocaleTimeString()}`, '#28a745');
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
            if (isChecked) {
                autoSyncTimer = setInterval(() => performSync(true), intervalMin * 60 * 1000);
            }
        };

        document.getElementById('ol-mygit-sync-btn').onclick = () => performSync(false);
        document.getElementById('ol-mygit-autosync-check').addEventListener('change', () => {
            manageAutoSync();
            const saveObj = {};
            saveObj[STORAGE_KEY_PROJECT] = {
                repo: document.getElementById('ol-mygit-repo').value,
                branch: document.getElementById('ol-mygit-branch').value,
                username: document.getElementById('ol-mygit-username').value,
                token: document.getElementById('ol-mygit-token').value,
                autoSync: document.getElementById('ol-mygit-autosync-check').checked,
                interval: document.getElementById('ol-mygit-interval').value,
                // commitMsg: NOT SAVED
                proxy: document.getElementById('ol-mygit-proxy').value
            };
            chrome.storage.local.set(saveObj);
        });

        // Load Config
        if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([STORAGE_KEY_PROJECT], function(result) {
                const conf = result[STORAGE_KEY_PROJECT] || {};
                if(conf.repo) document.getElementById('ol-mygit-repo').value = conf.repo;
                if(conf.branch) document.getElementById('ol-mygit-branch').value = conf.branch;
                if(conf.username) document.getElementById('ol-mygit-username').value = conf.username;
                if(conf.token) document.getElementById('ol-mygit-token').value = conf.token;
                // do not load commitMsg
                if(conf.proxy) document.getElementById('ol-mygit-proxy').value = conf.proxy;
                if(conf.autoSync) {
                    document.getElementById('ol-mygit-autosync-check').checked = true;
                    manageAutoSync();
                }
                if(conf.interval) document.getElementById('ol-mygit-interval').value = conf.interval;
            });
        }
    }

    // ==========================================
    // LOGIC 1: OVERLEAF
    // ==========================================
    function initOverleaf() {
        const BUTTON_CLASS = 'ol-zen-button';

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
                if (request) request.call(docEl).then(() => { fixPdfScroll(); triggerResizePulse(); });
            } else {
                const cancel = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (cancel) cancel.call(document).then(() => triggerResizePulse());
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

            const sidebar = document.querySelector('.ide-rail-tabs-wrapper');
            if (sidebar) initGitPanel('overleaf', sidebar);

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
                if (!document.querySelector('.loading-panel')) return resolve();
                const timer = setInterval(() => {
                    if (!document.querySelector('.loading-panel')) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
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

        const debouncedMount = debounce(mountButtons, 500);
        const observer = new MutationObserver(() => {
            debouncedMount();
            const sidebar = document.querySelector('.ide-rail-tabs-wrapper');
            if (sidebar) initGitPanel('overleaf', sidebar);
        });

        const targetNode = document.querySelector("#ide-redesign-file-tree > div > div.file-tree-inner") || document.body;
        if (targetNode) observer.observe(targetNode, { childList: true, subtree: true });

        waitForElement('.ide-rail-tabs-wrapper', (sidebar) => initGitPanel('overleaf', sidebar));
        mountButtons();
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
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onClick(btn); };
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

        // --- Mount Git Panel for TexPage ---
        waitForElement(SELECTORS.MENU, (menu) => {
            const items = Array.from(menu.children);
            const syncItem = items.find(li => li.textContent.includes('Sync') || li.querySelector('.icon-cloud-sync'));
            if (syncItem) {
                let dropdown = syncItem.querySelector('ul');
                if (dropdown) {
                    initGitPanel('texpage', dropdown);
                } else {
                    const observer = new MutationObserver(() => {
                        dropdown = syncItem.querySelector('ul');
                        if(dropdown) {
                            initGitPanel('texpage', dropdown);
                            observer.disconnect();
                        }
                    });
                    observer.observe(syncItem, { childList: true, subtree: true });
                }
            }
        });
    }

    const host = window.location.hostname;
    if (host.includes('overleaf.com')) {
        waitForElement('.toolbar-editor', initOverleaf);
    } else if (host.includes('texpage.com')) {
        waitForElement("#editor > div > div > div.editor-container > div > div.cm-scroller > div.cm-content.cm-lineWrapping", initTexPage);
    }
})();