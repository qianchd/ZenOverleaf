window.Zen = window.Zen || {};

window.Zen.DiffUI = {
    // draggable
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
        if (!diffText) return '<div style="padding:15px; color:#666;">No content changes.</div>';

        const lines = diffText.split('\n');
        let oldLineNum = 0;
        let newLineNum = 0;

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        let html = '<table class="zen-diff-table">';
        html += '<colgroup><col class="zen-col-num"><col class="zen-col-num"><col></colgroup>';

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
                html += `
                    <tr class="zen-row-header">
                        <td colspan="3">${escapeHtml(line)}</td>
                    </tr>
                `;
                return;
            }

            let rowClass = 'zen-row-normal';
            let oldNumStr = '';
            let newNumStr = '';
            let content = escapeHtml(line);

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

            html += `
                <tr class="${rowClass} zen-diff-row">
                    <td class="zen-diff-linenum">${oldNumStr}</td>
                    <td class="zen-diff-linenum">${newNumStr}</td>
                    <td class="zen-diff-code">${content}</td>
                </tr>
            `;
        });

        html += '</table>';
        return html;
    },


    showSingleFileDiff: function(change, FS) {
        let modal = document.getElementById('ol-single-diff-modal');


        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ol-single-diff-modal';
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';

        const badgeClass = change.status === 'new' ? 'zen-badge-new' : (change.status === 'del' ? 'zen-badge-del' : 'zen-badge-mod');

        modal.innerHTML = `
            <div id="ol-diff-drag-header" class="zen-diff-header">
                <div>
                    <span class="zen-diff-title">${change.file}</span>
                    <span class="zen-diff-badge ${badgeClass}">
                        ${change.status.toUpperCase()}
                    </span>
                </div>
                <span id="ol-diff-close" class="zen-diff-close">×</span>
            </div>

            <div class="zen-diff-content">
                ${this.formatDiff(change.diff)}
            </div>

            <div class="zen-diff-footer">
                <span class="zen-diff-tip">
                    Tip: Drag header to move · Drag bottom-right to resize
                </span>
                <button id="ol-diff-apply" class="zen-btn-apply">Apply Changes</button>
            </div>
        `;


        document.getElementById('ol-diff-close').onclick = () => modal.style.display = 'none';

        this.makeDraggable(modal, document.getElementById('ol-diff-drag-header'));

        document.getElementById('ol-diff-apply').onclick = async function() {
            const btn = this;
            btn.textContent = 'Applying...';
            btn.disabled = true;
            try {
                const newContent = await FS.promises.readFile(`/remote/${change.file}`, { encoding: 'utf8' });

                window.postMessage({
                    source: 'zenoverleaf-content',
                    action: 'APPLY_CONTENT',
                    content: newContent
                }, '*');

                if (window.Zen.FileTree && typeof window.Zen.FileTree.removeChange === 'function') {
                    window.Zen.FileTree.removeChange(change.file);
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