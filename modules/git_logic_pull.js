window.Zen = window.Zen || {};

(function() {
    window.Zen.GitPull = {
        perform: async (platform, projectId) => {
            const updateStatus = window.Zen.Git.updateStatus || console.log;

            const repo = document.getElementById('ol-mygit-repo').value.trim();
            const branch = document.getElementById('ol-mygit-branch').value.trim();
            const token = document.getElementById('ol-mygit-token').value.trim();
            const username = document.getElementById('ol-mygit-username').value.trim();
            const customProxy = document.getElementById('ol-mygit-proxy').value.trim();

            if (!repo || !token) { updateStatus('Missing Repo/Token', 'red'); return; }

            // [修改] 尝试获取 Diff 对象，支持 window.Diff 或 Diff 全局变量
            let diffLib = window.Diff || (typeof Diff !== 'undefined' ? Diff : null);

            if (!diffLib) {
                updateStatus('Error: Diff library not found.', 'red');
                return;
            }

            const modal = window.Zen.DiffUI.createDiffModal();
            modal.style.display = 'flex';
            updateStatus('Pulling...', '#6f42c1');

            const DB_NAME = `ol-pull-${Date.now()}`;
            const FS = new LightningFS(DB_NAME);
            const pfs = FS.promises;
            const authCallback = () => username ? { username, password: token } : { username: token };

            try {
                await pfs.mkdir('/remote');
                await git.init({ fs: FS, dir: '/remote' });
                await git.addRemote({ fs: FS, dir: '/remote', remote: 'origin', url: repo });

                // --- Proxy Discovery ---
                let proxyList = [];
                if (customProxy) { proxyList = [customProxy]; }
                else { proxyList = ['https://gitcors4516.qianchd.workers.dev', 'https://cors.isomorphic-git.org']; }

                let activeProxy = proxyList[0];
                let connectSuccess = false;

                for (const proxyUrl of proxyList) {
                    try {
                        console.log(`[Git Pull] Trying proxy: ${proxyUrl}`);
                        await git.listServerRefs({
                            http: GitHttp, url: repo, prefix: 'refs/heads',
                            corsProxy: proxyUrl, onAuth: authCallback
                        });
                        activeProxy = proxyUrl;
                        connectSuccess = true;
                        break;
                    } catch (e) { console.warn(`Proxy ${proxyUrl} failed:`, e); }
                }

                if (!connectSuccess) throw new Error("Cannot connect to remote (Network/Proxy Error)");

                // --- Fetch ---
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
                if (platform === 'overleaf') {
                    dlUrl = `https://www.overleaf.com/project/${projectId}/download/zip`;
                } else {
                    const match = window.location.pathname.match(/\/([0-9a-fA-F-]{36})\/([0-9a-fA-F-]{36})/);
                    if(match) dlUrl = `https://www.texpage.com/api/project/download?projectKey=${match[1]}&versionNo=${match[2]}&bbl=false`;
                    else {
                        const html = document.documentElement.innerHTML;
                        const pMatch = html.match(/"projectKey"\s*:\s*"([0-9a-fA-F-]+)"/);
                        const vMatch = html.match(/"versionNo"\s*:\s*"([0-9a-fA-F-]+)"/);
                        if(pMatch && vMatch) dlUrl = `https://www.texpage.com/api/project/download?projectKey=${pMatch[1]}&versionNo=${vMatch[1]}&bbl=false`;
                    }
                }

                if (!dlUrl) throw new Error("Cannot determine download URL");

                const resp = await fetch(dlUrl, { credentials: 'include' });
                if(!resp.ok) throw new Error("Download failed");
                const blob = await resp.blob();
                if (blob.size < 100) throw new Error("File too small");

                const base64String = await new Promise((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result.split(',')[1]);
                    r.readAsDataURL(blob);
                });
                const zip = await JSZip.loadAsync(base64String, { base64: true });

                // [Time Check]
                let localTime = 0;
                if (window.Zen.Git && window.Zen.Git.getProjectLastUpdated) {
                    localTime = await window.Zen.Git.getProjectLastUpdated(projectId);
                }

                if (localTime > 0 && localTime > remoteTime + 2000) {
                    const rDate = new Date(remoteTime).toLocaleString();
                    const lDate = new Date(localTime).toLocaleString();
                    if (!confirm(`⚠️ NOTICE: Local Version is Newer\n\nOverleaf (${lDate}) is newer than Remote (${rDate}).\n\nPull?`)) {
                        updateStatus('Cancelled', 'orange'); modal.style.display = 'none';
                        try { window.indexedDB.deleteDatabase(DB_NAME); } catch(e){}
                        return;
                    }
                }

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
                    if (!file.match(/\.(tex|bib|txt|cls|sty|md)$/i)) continue;
                    let rC = null, lC = null;
                    try { rC = await pfs.readFile(`/remote/${file}`, { encoding: 'utf8' }); } catch(e){}
                    try { lC = await pfs.readFile(`/local/${file}`, { encoding: 'utf8' }); } catch(e){}
                    if (rC !== lC) {
                        changes.push({
                            file: file,
                            status: !lC ? 'new' : (!rC ? 'del' : 'mod'),
                            // [修改] 使用我们找到的 diffLib 对象
                            diff: diffLib.createTwoFilesPatch(file, file, lC || '', rC || '')
                        });
                    }
                }

                window.Zen.DiffUI.renderDiffUI(changes, FS);
                updateStatus('Review changes', 'black');

            } catch (e) {
                console.error(e);
                updateStatus(`Pull Error: ${e.message}`, 'red');
            }
        }
    };
})();