window.Zen = window.Zen || {};

window.Zen.UI = {
    createDiffModal: () => {
        if (document.getElementById('ol-diff-modal')) return document.getElementById('ol-diff-modal');
        const modal = document.createElement('div');
        modal.id = 'ol-diff-modal';
        modal.className = 'ol-diff-modal';
        modal.innerHTML = `
            <div class="ol-diff-container">
                <div class="ol-diff-header">
                    <span>Remote Changes Review</span>
                    <span style="cursor:pointer" onclick="document.getElementById('ol-diff-modal').style.display='none'">×</span>
                </div>
                <div class="ol-diff-body">
                    <div class="ol-diff-list" id="ol-diff-list"></div>
                    <div class="ol-diff-viewer" id="ol-diff-viewer">Select a file to view changes...</div>
                </div>
                <div class="ol-diff-footer">
                    <span id="ol-diff-active-file" style="margin-right:10px; font-size:12px; color:#666;"></span>
                    <button class="ol-diff-apply-btn" id="ol-diff-apply-btn" disabled>Apply to Active Editor</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    },

    renderDiffUI: (changes, FS) => {
        const listEl = document.getElementById('ol-diff-list');
        const viewEl = document.getElementById('ol-diff-viewer');
        const applyBtn = document.getElementById('ol-diff-apply-btn');
        const activeFileLabel = document.getElementById('ol-diff-active-file');

        listEl.innerHTML = '';
        viewEl.textContent = 'Select a file to view changes...';
        applyBtn.disabled = true;
        activeFileLabel.textContent = '';

        if (changes.length === 0) {
            viewEl.textContent = 'No changes found. Remote and Local are in sync.';
            return;
        }

        changes.forEach(change => {
            const item = document.createElement('div');
            item.className = 'ol-diff-item';
            item.innerHTML = `
                <span>${change.file}</span>
                <span class="ol-diff-badge ${change.status}">${change.status.toUpperCase()}</span>
            `;

            item.onclick = async () => {
                document.querySelectorAll('.ol-diff-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                viewEl.innerHTML = window.Zen.Utils.formatDiff(change.diff);

                // Check Path Match
                const breadcrumbParts = window.Zen.Utils.getActiveBreadcrumbParts();
                const isMatch = window.Zen.Utils.isStrictPathMatch(change.file, breadcrumbParts);
                const currentUIPath = breadcrumbParts.join(' > ');

                if (isMatch) {
                    applyBtn.disabled = false;
                    applyBtn.textContent = 'Apply to Active Editor';
                    applyBtn.style.background = '#007bff';
                    activeFileLabel.innerHTML = `<span style="color:green">✓ Path Matched</span>`;
                    applyBtn.onclick = async () => {
                        const newContent = await FS.promises.readFile(`/remote/${change.file}`, { encoding: 'utf8' });
                        window.postMessage({
                            source: 'zenoverleaf-content',
                            action: 'APPLY_CONTENT',
                            content: newContent
                        }, '*');
                        activeFileLabel.textContent = 'Applied!';
                    };
                } else {
                    applyBtn.disabled = true;
                    applyBtn.textContent = 'Path Mismatch';
                    applyBtn.style.background = '#dc3545';
                    activeFileLabel.innerHTML = `<span style="color:red">⚠️ Mismatch! Git: ${change.file} | UI: ${currentUIPath}</span>`;
                }
            };
            listEl.appendChild(item);
        });

        // Auto-refresh safety check
        const safetyCheckInterval = setInterval(() => {
            const activeItem = document.querySelector('.ol-diff-item.active');
            if (activeItem && document.getElementById('ol-diff-modal').style.display !== 'none') {
                activeItem.click();
            } else if (document.getElementById('ol-diff-modal').style.display === 'none') {
                clearInterval(safetyCheckInterval);
            }
        }, 1000);
    }
};