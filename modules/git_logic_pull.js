window.Zen = window.Zen || {};

/* ==========================================================================
   PART 1: File Tree Marker Logic
   ========================================================================== */
window.Zen.FileTree = {
    currentChanges: [],
    observer: null,
    FS: null,
    _renderTimer: null,

    // Entry point: Render markers
    renderMarkers: function(changes, FS) {
        this.currentChanges = changes;
        this.FS = FS;
        this.refreshAll();
        this.startObserver();
    },

    // Unified refresh logic
    refreshAll: function() {
        const matchedFiles = new Set();
        this.applyMarkers(matchedFiles);
        const ghostFiles = this.currentChanges.filter(c => !matchedFiles.has(c.file) && c.status === 'new');
        this.renderGhosts(ghostFiles);
    },

    clearMarkers: function() {
        this.currentChanges = [];
        if (this.observer) this.observer.disconnect();
        if (this._renderTimer) clearTimeout(this._renderTimer);

        document.querySelectorAll('.zen-git-status-icon').forEach(el => el.remove());
        document.querySelectorAll('.zen-ghost-node').forEach(el => el.remove());
    },

    // Mutation Observer
    startObserver: function() {
        if (this.observer) this.observer.disconnect();

        const listRoot = document.querySelector('.file-tree-folder-list-inner') ||
                         document.querySelector('.file-tree-list') ||
                         document.querySelector('.file-tree-inner') ||
                         document.querySelector('.project-directory > ul[role="list"]');

        if (!listRoot) return;

        this.observer = new MutationObserver((mutations) => {
            if (this._renderTimer) clearTimeout(this._renderTimer);
            this._renderTimer = setTimeout(() => {
                this.observer.disconnect();
                this.refreshAll();
                this.observer.observe(listRoot, { childList: true, subtree: true });
            }, 100);
        });

        this.observer.observe(listRoot, { childList: true, subtree: true });
    },

    // Marker Application
    applyMarkers: function(matchedSet = new Set()) {
        if (!this.currentChanges || this.currentChanges.length === 0) return;

        const items = document.querySelectorAll('li[role="treeitem"], li[role="listitem"]');

        items.forEach(item => {
            try {
                const fileName = item.querySelector('.file-name > span[title]')?.title || item.getAttribute('aria-label');
                if (!fileName) return;

                const match = this.currentChanges.find(c => c.file === fileName || c.file.endsWith('/' + fileName));

                if (match) {
                    const existingIcon = item.querySelector('.zen-git-status-icon');
                    const targetSymbol = (match.status === 'del' ? '−' : 'M');

                    if (existingIcon) {
                        if (existingIcon.textContent === targetSymbol) {
                            matchedSet.add(match.file);
                            return;
                        }
                        existingIcon.remove();
                    }

                    this.injectIcon(item, match);
                    matchedSet.add(match.file);
                }
            } catch (e) {
                // Ignore
            }
        });
    },

    // Ghost rendering
    renderGhosts: function(ghostFiles) {
        document.querySelectorAll('.zen-ghost-node').forEach(el => el.remove());
        if (ghostFiles.length === 0) return;

        const listContainer = document.querySelector('.file-tree-list') ||
                              document.querySelector('.file-tree-folder-list-inner') ||
                              document.querySelector('.project-directory > ul[role="list"]');
        if (!listContainer) return;

        [...ghostFiles].reverse().forEach(change => {
            const li = document.createElement('li');
            li.className = 'zen-ghost-node';
            li.setAttribute('role', 'presentation');
            li.title = "This file is in Git but not Overleaf. Click to Copy Name.";
            li.style.cssText = "padding-left: 24px; cursor: pointer; display: flex; align-items: center;";

            const iconSpan = document.createElement('span');
            iconSpan.className = 'zen-ghost-icon';
            iconSpan.textContent = 'M';
            iconSpan.style.cssText = "margin-right: 5px; color: #28a745; font-weight: bold;";

            const nameSpan = document.createElement('span');
            nameSpan.className = 'zen-ghost-name';
            nameSpan.textContent = change.file;
            nameSpan.style.color = "#888";

            li.appendChild(iconSpan);
            li.appendChild(nameSpan);

            li.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(change.file);
                if (window.Zen.DiffUI && window.Zen.DiffUI.showSingleFileDiff) {
                    window.Zen.DiffUI.showSingleFileDiff(change, this.FS);
                    const toast = document.createElement('div');
                    toast.className = 'zen-git-toast';
                    toast.innerText = `Copied: '${change.file}'. Create it, then Apply.`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 4000);
                }
            };
            listContainer.prepend(li);
        });
    },

    removeChange: function(fileName) {
        this.currentChanges = this.currentChanges.filter(c => c.file !== fileName);

        const items = document.querySelectorAll('li[role="treeitem"], li[role="listitem"]');
        items.forEach(item => {
             const currentFileName = item.querySelector('.file-name > span[title]')?.title || item.getAttribute('aria-label');
             if (currentFileName === fileName) {
                 item.querySelector('.zen-git-status-icon')?.remove();
             }
        });

        document.querySelectorAll('.zen-ghost-node').forEach(el => {
            if (el.querySelector('.zen-ghost-name')?.textContent === fileName) el.remove();
        });

        if (this._renderTimer) clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => { this.refreshAll(); }, 50);
    },

    injectIcon: function(domItem, change) {
        const tpSpan = domItem.querySelector('.file-name > span[title]');

        const olSpan = domItem.querySelector('.item-name-button');

        const target = tpSpan || olSpan;

        if (target) {
            this._createAndAppend(target, change, domItem);
        } else {
            this._createAndAppend(domItem, change, domItem);
        }
    },

    _createAndAppend: function(container, change, domItem) {
        const btn = document.createElement('span');
        btn.className = 'zen-git-status-icon';

        if (change.status === 'del') {
            btn.classList.add('zen-icon-del');
            btn.textContent = '−';
        } else {
            btn.classList.add('zen-icon-mod');
            btn.textContent = 'M';
        }

        btn.title = `Git: ${change.status.toUpperCase()} (Click to Review)`;

        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            // [Retained] Smart search for click target: TexPage clicks .file-name, Overleaf clicks .name or domItem
            const targetToClick = domItem.querySelector('.file-name') || domItem;

            if (targetToClick) targetToClick.click();

            setTimeout(() => {
                if (window.Zen.DiffUI && window.Zen.DiffUI.showSingleFileDiff) {
                    window.Zen.DiffUI.showSingleFileDiff(change, this.FS);
                } else {
                    console.warn("Diff UI module missing. Please reload.");
                }
            }, 100);
        };

        container.appendChild(btn);
    }
};

/* ==========================================================================
   PART 2: Git Pull Logic (Standard)
   ========================================================================== */
(function() {
    window.Zen.GitPull = {
        perform: async (platform, projectId) => {
            const updateStatus = window.Zen.Git.updateStatus || console.log;

            window.Zen.isTexPage = (platform === 'texpage');

            const repo = document.getElementById('ol-mygit-repo').value.trim();
            const branch = document.getElementById('ol-mygit-branch').value.trim();
            const token = document.getElementById('ol-mygit-token').value.trim();
            const username = document.getElementById('ol-mygit-username').value.trim();
            const customProxy = document.getElementById('ol-mygit-proxy').value.trim();

            if (!repo || !token) { updateStatus('Missing Repo/Token', 'red'); return; }

            let diffLib = window.Diff || (typeof Diff !== 'undefined' ? Diff : null);
            if (!diffLib) { updateStatus('Error: Diff lib not found', 'red'); return; }

            updateStatus('Pulling...', '#6f42c1');

            const DB_NAME = `ol-pull-${Date.now()}`;
            const FS = new LightningFS(DB_NAME);
            const pfs = FS.promises;
            const authCallback = () => username ? { username, password: token } : { username: token };

            try {
                await pfs.mkdir('/remote');
                await git.init({ fs: FS, dir: '/remote' });
                await git.addRemote({ fs: FS, dir: '/remote', remote: 'origin', url: repo });

                let proxyList = customProxy ? [customProxy] : ['https://gitcors4516.qianchd.workers.dev', 'https://cors.isomorphic-git.org'];
                let activeProxy = proxyList[0];
                let connectSuccess = false;

                for (const proxyUrl of proxyList) {
                    try {
                        console.log(`Trying proxy: ${proxyUrl}`);
                        await git.listServerRefs({
                            http: GitHttp, url: repo, prefix: 'refs/heads',
                            corsProxy: proxyUrl, onAuth: authCallback
                        });
                        activeProxy = proxyUrl;
                        connectSuccess = true;
                        break;
                    } catch (e) { console.warn(`Proxy ${proxyUrl} failed:`, e); }
                }

                if (!connectSuccess) throw new Error("Network/Proxy Error");

                await git.fetch({
                    fs: FS, http: GitHttp, dir: '/remote',
                    corsProxy: activeProxy,
                    ref: branch,
                    onAuth: authCallback, depth: 1, singleBranch: true
                });

                let remoteTime = 0;
                try {
                    const commits = await git.log({ fs: FS, dir: '/remote', ref: `origin/${branch}`, depth: 1 });
                    if (commits.length > 0) remoteTime = commits[0].commit.committer.timestamp * 1000;
                } catch(e) {}

                await git.checkout({ fs: FS, dir: '/remote', ref: branch, force: true });

                updateStatus('Downloading Snapshot...', '#6f42c1');
                await pfs.mkdir('/local');

                let dlUrl;
                const timestamp = Date.now();
                if (platform === 'overleaf') {
                    dlUrl = `https://www.overleaf.com/project/${projectId}/download/zip?_t=${timestamp}`;
                } else {
                    const match = window.location.pathname.match(/\/([0-9a-fA-F-]{36})\/([0-9a-fA-F-]{36})/);

                    let pKey, vNo;
                    if (match) {
                        pKey = match[1];
                        vNo = match[2];
                    } else {
                        // Fallback: Extract from HTML
                        const html = document.documentElement.innerHTML;
                        const pMatch = html.match(/"projectKey"\s*:\s*"([0-9a-fA-F-]+)"/);
                        const vMatch = html.match(/"versionNo"\s*:\s*"([0-9a-fA-F-]+)"/);
                        if (pMatch) pKey = pMatch[1];
                        if (vMatch) vNo = vMatch[1];
                    }

                    if (!pKey || !vNo) {
                        throw new Error("TexPage ID extraction failed.");
                    }

                    dlUrl = `https://www.texpage.com/api/project/download?projectKey=${pKey}&versionNo=${vNo}&bbl=false`;
                }

                if (!dlUrl) throw new Error("Cannot determine download URL");

                const resp = await fetch(dlUrl, { method: 'GET', credentials: 'include' });
                if(!resp.ok) throw new Error("Download failed");
                const blob = await resp.blob();

                if (blob.size < 100) {
                     updateStatus('Download failed: File is too small', 'red');
                     throw new Error("Downloaded file size is suspiciously small. Not a valid ZIP.");
                }

                const base64String = await new Promise((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result.split(',')[1]);
                    r.readAsDataURL(blob);
                });
                const zip = await JSZip.loadAsync(base64String, { base64: true });

                let localTime = 0;

                // --- Pull Conflict Check ---
                if (platform === 'overleaf') {
                    if (window.Zen.Git && window.Zen.Git.getProjectLastUpdated) {
                        localTime = await window.Zen.Git.getProjectLastUpdated(projectId);
                    }
                } else if (platform === 'texpage') {
                    if (window.Zen.Git && window.Zen.Git.getTexPageProjectLastUpdated) {
                        localTime = await window.Zen.Git.getTexPageProjectLastUpdated(projectId);
                    }
                }

                if (localTime > 0 && localTime > remoteTime + 2000) {
                    const rDate = new Date(remoteTime).toLocaleString();
                    const lDate = new Date(localTime).toLocaleString();
                    const msg = `⚠️ NOTICE: Local is Newer\n\nLocal: ${lDate}\nRemote: ${rDate}\n\nContinue Pull (Overwrite Local)?`;

                    const userConfirmed = await window.Zen.Git.askUser(msg);

                    if (!userConfirmed) {
                        updateStatus('Cancelled', 'orange');
                        try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}
                        return;
                    } else {
                        updateStatus('Resuming...', '#007bff');
                    }
                }
                // --- End Pull Conflict Check ---

                for (const filename of Object.keys(zip.files)) {
                    if (!zip.files[filename].dir) {
                        const content = await zip.files[filename].async('string');
                        const parts = filename.split('/'); parts.pop(); let cur = '/local';
                        for(const p of parts) { cur += '/' + p; try { await pfs.mkdir(cur); } catch(e){} }
                        await pfs.writeFile(`/local/${filename}`, content);
                    }
                }

                updateStatus('Calculating Diff...', '#6f42c1');
                const remoteFiles = await git.listFiles({ fs: FS, dir: '/remote' });
                const changes = [];

                for (const file of remoteFiles) {
                    if (!file.match(/\.(tex|bib|txt|cls|sty|md|bibtex)$/i)) continue;

                    let rC = null, lC = null;
                    try { rC = await pfs.readFile(`/remote/${file}`, { encoding: 'utf8' }); } catch(e){}
                    try { lC = await pfs.readFile(`/local/${file}`, { encoding: 'utf8' }); } catch(e){}

                    const rClean = (rC || '').replace(/\r\n/g, '\n');
                    const lClean = (lC || '').replace(/\r\n/g, '\n');

                    if (rClean !== lClean) {
                        changes.push({
                            file: file,
                            status: !lClean ? 'new' : (!rClean ? 'del' : 'mod'),
                            diff: diffLib.createTwoFilesPatch(file, file, lClean || '', rClean || '')
                        });
                    }
                }

                if (changes.length === 0) {
                    updateStatus('Synced (No Changes)', 'green');
                    if (window.Zen.FileTree) window.Zen.FileTree.clearMarkers();
                    try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}
                    return;
                }

                window.Zen.FileTree.renderMarkers(changes, FS);

                updateStatus(`Found ${changes.length} changes`, '#28a745');

                const toast = document.createElement('div');
                toast.className = 'zen-git-toast';

                const boldDiv = document.createElement('div');
                boldDiv.style.fontWeight = 'bold';
                boldDiv.textContent = `Git Sync: ${changes.length} Changes`;

                const infoDiv = document.createElement('div');
                infoDiv.textContent = 'Check file icons (M/−) to review.';

                toast.appendChild(boldDiv);
                toast.appendChild(infoDiv);

                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 4000);

            } catch (e) {
                console.error(e);
                updateStatus(`Error: ${e.message}`, 'red');
            }
        }
    };
})();