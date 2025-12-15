window.Zen = window.Zen || {};

window.Zen.Git = {
    init: function(platform, mountPoint) {
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
        titleSpan.appendChild(window.Zen.Utils.parseSvg(window.Zen.ICONS.MYGIT));
        titleSpan.appendChild(document.createTextNode(' GitHub/GITEE/CNB Sync'));
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
            iconSpan.appendChild(window.Zen.Utils.parseSvg(window.Zen.ICONS.MYGIT));
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
            iconSpan.appendChild(window.Zen.Utils.parseSvg(window.Zen.ICONS.MYGIT));
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
};