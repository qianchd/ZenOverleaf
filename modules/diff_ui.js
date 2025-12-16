window.Zen = window.Zen || {};

window.Zen.DiffUI = {
    // 1. [Enhancement] Get the standardized file path of the current open editor file
    getCurrentOpenFilePath: function() {
        try {
            // --- Overleaf Logic ---
            // Structure: <div class="ol-cm-breadcrumbs"><div>ProjectName</div>...<div>file.tex</div></div>
            const olBreadcrumbs = document.querySelector('.ol-cm-breadcrumbs');
            if (olBreadcrumbs) {
                // Extract text from all child divs (ignore chevron icons)
                // Result array example: ["MyProject", "chapters", "intro.tex"]
                const parts = Array.from(olBreadcrumbs.querySelectorAll('div'))
                                       .map(el => el.textContent.trim())
                                       .filter(t => t.length > 0);

                if (parts.length > 0) {
                    return parts.join('/'); // "MyProject/chapters/intro.tex"
                }
            }

            // --- TexPage Logic ---
            // Structure: <div class="editor-footer"><div>test/bbb/aa.tex</div>...</div>
            const tpFooter = document.querySelector('.editor-footer > div:first-child');
            if (tpFooter) {
                return tpFooter.textContent.trim(); // "test/bbb/aa.tex"
            }

        } catch (e) {
            console.warn("[ZenDiff] Failed to detect current file path:", e);
        }
        return null;
    },

    // 2. [New] Strict path comparison logic (prevents confusion between files with the same name in different directories)
    checkPathMatch: function(uiPath, gitPath) {
        if (!uiPath || !gitPath) return false;

        // Unify separators
        const u = uiPath.replace(/\\/g, '/');
        const g = gitPath.replace(/\\/g, '/');

        // Case A: Fully equal (This should be the case for TexPage)
        if (u === g) return true;

        // Case B: Overleaf (UI path usually has one extra level "ProjectName" compared to Git path)
        // UI: "ProjectName/folder/file.tex" (3 segments)
        // Git: "folder/file.tex" (2 segments)
        const uParts = u.split('/');
        const gParts = g.split('/');

        // Only if the UI path has exactly 1 more segment than the Git path, it might be the Overleaf root directory difference
        if (uParts.length === gParts.length + 1) {
            // Remove the first segment of the UI path (ProjectName) and compare the rest
            const uTail = uParts.slice(1).join('/');
            if (uTail === g) {
                return true;
            }
        }

        return false;
    },

    // Draggable Logic (Unchanged)
    makeDraggable: function(el, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = el.getBoundingClientRect();
            el.style.left = `${rect.left}px`;
            el.style.top = `${rect.top}px`;
            el.style.transform = 'none';
            el.style.margin = '0';

            initialLeft = rect.left;
            initialTop = rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            el.style.left = `${initialLeft + (e.clientX - startX)}px`;
            el.style.top = `${initialTop + (e.clientY - startY)}px`;
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    },

    formatDiff: function(diffText) {
        if (!diffText) {
            const noContent = document.createElement('div');
            noContent.style.cssText = 'padding:15px; color:#666;';
            noContent.textContent = 'No content changes.';
            return noContent;
        }

        const lines = diffText.split('\n');
        let oldLineNum = 0;
        let newLineNum = 0;

        const table = document.createElement('table');
        table.className = 'zen-diff-table';

        const colgroup = document.createElement('colgroup');
        colgroup.innerHTML = '<col class="zen-col-num"><col class="zen-col-num"><col>';
        table.appendChild(colgroup);

        const tbody = document.createElement('tbody');

        lines.forEach(line => {
            if (line.startsWith('Index:') || line.startsWith('+++') || line.startsWith('---') || line.startsWith('===')) {
                return;
            }

            if (line.startsWith('@@')) {
                const match = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
                if (match) {
                    oldLineNum = parseInt(match[1], 10) - 1;
                    newLineNum = parseInt(match[2], 10) - 1;
                }
                const row = document.createElement('tr');
                row.className = 'zen-row-header';
                const cell = document.createElement('td');
                cell.setAttribute('colspan', '3');
                cell.textContent = line;
                row.appendChild(cell);
                tbody.appendChild(row);
                return;
            }

            let rowClass = 'zen-row-normal';
            let oldNumStr = '';
            let newNumStr = '';
            let codeContent = line;

            if (line.startsWith('+')) {
                newLineNum++;
                newNumStr = newLineNum;
                rowClass = 'zen-row-add';
            } else if (line.startsWith('-')) {
                oldLineNum++;
                oldNumStr = oldLineNum;
                rowClass = 'zen-row-del';
            } else {
                oldLineNum++;
                newLineNum++;
                oldNumStr = oldLineNum;
                newNumStr = newLineNum;
            }

            const row = document.createElement('tr');
            row.className = `${rowClass} zen-diff-row`;

            const oldNumCell = document.createElement('td');
            oldNumCell.className = 'zen-diff-linenum';
            oldNumCell.textContent = oldNumStr;

            const newNumCell = document.createElement('td');
            newNumCell.className = 'zen-diff-linenum';
            newNumCell.textContent = newNumStr;

            const contentCell = document.createElement('td');
            contentCell.className = 'zen-diff-code';
            contentCell.textContent = codeContent;

            row.appendChild(oldNumCell);
            row.appendChild(newNumCell);
            row.appendChild(contentCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    },


    showSingleFileDiff: function(change, FS) {
        let modal = document.getElementById('ol-single-diff-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ol-single-diff-modal';
            modal.style.zIndex = '500';
            document.body.appendChild(modal);
        }

        modal.innerHTML = '';
        modal.style.display = 'flex';

        const badgeClass = change.status === 'del' ? 'zen-badge-del' : 'zen-badge-mod';

        // 1. Header
        const header = document.createElement('div');
        header.id = 'ol-diff-drag-header';
        header.className = 'zen-diff-header';

        const titleGroup = document.createElement('div');
        const titleSpan = document.createElement('span');
        titleSpan.id = 'diff-title';
        titleSpan.className = 'zen-diff-title';
        titleSpan.textContent = change.file;

        const badgeSpan = document.createElement('span');
        badgeSpan.id = 'diff-badge';
        badgeSpan.className = `zen-diff-badge ${badgeClass}`;
        badgeSpan.textContent = change.status.toUpperCase();

        titleGroup.appendChild(titleSpan);
        titleGroup.appendChild(badgeSpan);

        const closeBtn = document.createElement('span');
        closeBtn.id = 'ol-diff-close';
        closeBtn.className = 'zen-diff-close';
        closeBtn.textContent = '×';

        header.appendChild(titleGroup);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // 2. Content Area
        const content = document.createElement('div');
        content.className = 'zen-diff-content';

        const contentPlaceholder = document.createElement('div');
        contentPlaceholder.id = 'diff-content-placeholder';

        const diffDom = this.formatDiff(change.diff);
        contentPlaceholder.appendChild(diffDom);

        content.appendChild(contentPlaceholder);
        modal.appendChild(content);

        // 3. Footer
        const footer = document.createElement('div');
        footer.className = 'zen-diff-footer';

        const tipSpan = document.createElement('span');
        tipSpan.className = 'zen-diff-tip';
        tipSpan.textContent = 'Tip: Drag header to move · Drag bottom-right to resize';

        const applyBtn = document.createElement('button');
        applyBtn.id = 'ol-diff-apply';
        applyBtn.className = 'zen-btn-apply';
        applyBtn.textContent = 'Apply Changes';

        footer.appendChild(tipSpan);
        footer.appendChild(applyBtn);
        modal.appendChild(footer);

        document.getElementById('ol-diff-close').onclick = () => modal.style.display = 'none';

        this.makeDraggable(modal, document.getElementById('ol-diff-drag-header'));

        // --- Apply Button Logic ---
        document.getElementById('ol-diff-apply').onclick = async function() {
            const btn = this;

            // ============================================================
            // Safety Check: Strict file and path matching
            // ============================================================
            const currentOpenPath = window.Zen.DiffUI.getCurrentOpenFilePath();
            const targetGitPath = change.file;

            if (currentOpenPath) {
                // Use strict segment comparison logic
                const isMatch = window.Zen.DiffUI.checkPathMatch(currentOpenPath, targetGitPath);

                if (!isMatch) {
                    const msg = `⚠️ Safety Warning: File Mismatch!\n\n` +
                                 `Target Git File:  ${targetGitPath}\n` +
                                 `Current Editor:   ${currentOpenPath}\n\n` +
                                 `Current file path does NOT match the Git target.\n` +
                                 `This prevents overwriting a file with the same name in a different folder.\n\n` +
                                 `Please open the correct file and try again.\n\n` +
                                 `Do you want to FORCE apply anyway? (Dangerous)`;

                    if (!confirm(msg)) {
                        return; // User cancelled
                    }
                }
            } else {
                console.warn("[ZenDiff] Could not detect current file path. Skipping safety check.");
            }
            // ============================================================

            btn.textContent = 'Applying...';
            btn.disabled = true;

            // New file existence check (for Ghost Files)
            if (change.status === 'new') {
                // Attempt to find a list item matching the file name (supports Overleaf aria-label and TexPage span title)
                let item = null;
                // Method 1: Query Selector
                const possibleItems = document.querySelectorAll(`li[aria-label="${change.file}"], .file-name > span[title="${change.file}"]`);

                // Simple name match is not enough to prove path, but for 'new' status, we assume the user just created it
                if (possibleItems.length > 0) {
                    item = possibleItems[0];
                }

                if (!item) {
                    alert(`Action Failed: File "${change.file}" must be manually created in the project file tree before applying content.`);
                    btn.disabled = false;
                    btn.textContent = 'Apply Changes';
                    return;
                }
            }

            try {
                const newContent = await FS.promises.readFile(`/remote/${change.file}`, { encoding: 'utf8' });

                // 1. Send content to page script
                window.postMessage({
                    source: 'zenoverleaf-content',
                    action: 'APPLY_CONTENT',
                    content: newContent
                }, '*');

                // 2. Clear marker/ghost node for this file
                if (window.Zen.FileTree && typeof window.Zen.FileTree.removeChange === 'function') {
                    window.Zen.FileTree.removeChange(change.file);
                }

                // 3. Handle 'new' files refresh
                if (change.status === 'new') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    window.dispatchEvent(new Event('resize', { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                await new Promise(resolve => setTimeout(resolve, 50));

                setTimeout(() => {
                    btn.textContent = 'Done!';
                    setTimeout(() => {
                        modal.style.display = 'none';
                        btn.disabled = false;
                        btn.textContent = 'Apply Changes';
                    }, 500);
                }, 500);

            } catch(e) {
                console.error(e);
                alert('Error: ' + e.message);
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        };
    }
};