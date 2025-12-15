window.Zen = window.Zen || {};

window.Zen.DiffUI = {
    // draggable (保持不变)
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

    // [重构] 返回 DOM 元素而非 HTML 字符串
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

            // 2. Hunk Header (@@ ...)
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
                cell.textContent = line; // Safe: only static diff metadata
                row.appendChild(cell);
                tbody.appendChild(row);
                return;
            }

            let rowClass = 'zen-row-normal';
            let oldNumStr = '';
            let newNumStr = '';
            let codeContent = line; // The content is the whole line

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
            contentCell.textContent = codeContent; // Safe: only text content

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
            // Set lower z-index to avoid covering native Overleaf modals
            modal.style.zIndex = '500';
            document.body.appendChild(modal);
        }

        // --- START FIX: Rebuild Modal DOM using safe methods ---
        // Clear previous content
        modal.innerHTML = '';
        modal.style.display = 'flex';

        const badgeClass = change.status === 'del' ? 'zen-badge-del' : 'zen-badge-mod';

        // 1. Header (Drag Handle)
        const header = document.createElement('div');
        header.id = 'ol-diff-drag-header';
        header.className = 'zen-diff-header';

        const titleGroup = document.createElement('div');
        const titleSpan = document.createElement('span');
        titleSpan.id = 'diff-title';
        titleSpan.className = 'zen-diff-title';
        titleSpan.textContent = change.file; // Dynamic content safe

        const badgeSpan = document.createElement('span');
        badgeSpan.id = 'diff-badge';
        badgeSpan.className = `zen-diff-badge ${badgeClass}`;
        badgeSpan.textContent = change.status.toUpperCase(); // Dynamic content safe

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

        // [FINAL FIX] Direct DOM append, no HTML strings or fragments
        const diffDom = this.formatDiff(change.diff);
        contentPlaceholder.appendChild(diffDom);
        // --- END FINAL FIX ---

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

        // --- END FIX: Rebuild Modal DOM ---


        document.getElementById('ol-diff-close').onclick = () => modal.style.display = 'none';

        this.makeDraggable(modal, document.getElementById('ol-diff-drag-header'));

        document.getElementById('ol-diff-apply').onclick = async function() {
            const btn = this;
            btn.textContent = 'Applying...';
            btn.disabled = true;
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

                // 3. Handle 'new' files after content is applied (and force file tree refresh)
                if (change.status === 'new') {
                    // Give Overleaf a moment to save the file and attempt to add it to the file tree DOM
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Manually dispatch a resize event to trigger internal UI refreshes/checks
                    window.dispatchEvent(new Event('resize', { bubbles: true }));

                    // Wait for the DOM change to propagate completely
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Explicitly remove the icon from the *actual* file tree node
                // Wait briefly for the last possible MutationObserver update after resize/save completes
                await new Promise(resolve => setTimeout(resolve, 50));

                const selector = `li[aria-label="${change.file}"]`;
                const item = document.querySelector(selector);
                if (item) {
                     const icon = item.querySelector('.zen-git-status-icon');
                     if (icon) {
                         icon.remove();
                         console.log(`[ZenOverleaf] Explicitly removed M icon from native node: ${change.file}`);
                     }
                }


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