window.Zen = window.Zen || {};

window.Zen.DiffUI = {
    // --- 内部辅助：解析 Diff 并生成带行号的 HTML 表格 ---
    formatDiffWithLineNumbers: function(diffText) {
        if (!diffText) return '';

        const lines = diffText.split('\n');
        let oldLineNum = 0;
        let newLineNum = 0;
        let html = '<table class="ol-diff-table" style="width:100%; border-collapse:collapse; font-family: monospace; font-size: 12px;">';

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        lines.forEach(line => {
            // 忽略文件头信息
            if (line.startsWith('Index:') || line.startsWith('================') || line.startsWith('---') || line.startsWith('+++')) {
                return;
            }

            // 处理 Hunk Header (e.g., @@ -15,7 +15,7 @@)
            // 用于重置行号计数器
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                if (match) {
                    oldLineNum = parseInt(match[1]);
                    newLineNum = parseInt(match[2]);
                }
                // 显示分隔行
                html += `
                    <tr style="background:#f1f8ff; color:#666; border-top:1px solid #e1e4e8; border-bottom:1px solid #e1e4e8;">
                        <td colspan="3" style="padding:4px 10px; font-size:11px;">${escapeHtml(line)}</td>
                    </tr>`;
                return;
            }

            // 处理内容行
            let type = '';
            let bg = '#fff';
            let oNum = '';
            let nNum = '';
            let content = line.length > 0 ? line.substring(1) : ''; // 去掉开头的 +/-/空格

            if (line.startsWith('+')) {
                type = 'add';
                bg = '#e6ffec'; // 浅绿
                nNum = newLineNum++;
            } else if (line.startsWith('-')) {
                type = 'del';
                bg = '#ffebe9'; // 浅红
                oNum = oldLineNum++;
            } else if (line.startsWith(' ')) {
                type = 'ctx';
                bg = '#fff';
                oNum = oldLineNum++;
                nNum = newLineNum++;
            } else {
                // 如果是空行或者无法识别的行，直接跳过
                if (line.length === 0) return;
                // 或者是 No newline at end of file
                if (line.startsWith('\\')) {
                     html += `<tr><td colspan="3" style="color:#999; padding:2px 10px; font-style:italic;">${escapeHtml(line)}</td></tr>`;
                     return;
                }
            }

            html += `
                <tr style="background:${bg}; vertical-align:top;">
                    <td style="
                        width: 40px;
                        text-align: right;
                        padding-right: 8px;
                        color: #bbb;
                        user-select: none;
                        border-right: 1px solid #eee;
                        background: rgba(0,0,0,0.02);
                        line-height: 1.5;
                    ">${oNum}</td>
                    <td style="
                        width: 40px;
                        text-align: right;
                        padding-right: 8px;
                        color: #bbb;
                        user-select: none;
                        border-right: 1px solid #eee;
                        background: rgba(0,0,0,0.02);
                        line-height: 1.5;
                    ">${nNum}</td>
                    <td style="
                        padding-left: 10px;
                        white-space: pre-wrap;
                        word-break: break-all;
                        line-height: 1.5;
                        color: #24292e;
                    ">${escapeHtml(content)}</td>
                </tr>
            `;
        });

        html += '</table>';
        return html;
    },

    // --- 拖拽逻辑 (保持不变) ---
    makeDraggable: function(el, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.style.cursor = 'grab';

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'SPAN' && e.target.id === 'ol-diff-close-btn') return;
            e.preventDefault();
            isDragging = true;
            handle.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            el.style.transform = 'none';
            el.style.left = `${rect.left}px`;
            el.style.top = `${rect.top}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
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
            handle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    },

    // --- 创建 UI ---
    createDiffModal: function() {
        if (document.getElementById('ol-diff-modal')) return document.getElementById('ol-diff-modal');
        const modal = document.createElement('div');
        modal.id = 'ol-diff-modal';
        modal.className = 'ol-diff-modal';

        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 900px;
            height: 700px;
            min-width: 600px;
            min-height: 400px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            background: white;
            border: 1px solid #bbb;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            resize: both;
            overflow: hidden;
        `;

        const resetCss = `
            <style>
                #ol-diff-modal, #ol-diff-modal * { box-sizing: border-box; }
                #ol-diff-viewer::-webkit-scrollbar { width: 10px; height: 10px; }
                #ol-diff-viewer::-webkit-scrollbar-track { background: #f5f5f5; }
                #ol-diff-viewer::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; border: 2px solid #f5f5f5; }
                #ol-diff-viewer::-webkit-scrollbar-thumb:hover { background: #999; }
                #ol-diff-list::-webkit-scrollbar { width: 6px; }
                #ol-diff-list::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
            </style>
        `;

        modal.innerHTML = `
            ${resetCss}
            <div class="ol-diff-header" id="ol-diff-header" style="
                width: 100%; height: 40px; flex-shrink: 0; background: #e8e8e8; border-bottom: 1px solid #ccc;
                display: flex; justify-content: space-between; align-items: center; padding: 0 12px; user-select: none;
            ">
                <span style="font-weight: 600; font-size: 14px; color: #333; display:flex; align-items:center; gap:6px;">
                    <span style="font-size:16px;">🔄</span> Remote Changes
                </span>
                <span id="ol-diff-close-btn" style="cursor: pointer; font-size: 20px; color: #666; font-weight:bold; line-height:1;">×</span>
            </div>

            <div class="ol-diff-body" style="width: 100%; flex: 1; display: flex; flex-direction: row; overflow: hidden; background: #fff;">
                <div class="ol-diff-sidebar" style="
                    width: 25%; min-width: 200px; height: 100%; border-right: 1px solid #ddd;
                    display: flex; flex-direction: column; background: #fcfcfc;
                ">
                    <div style="padding: 8px 10px; font-size: 11px; font-weight: bold; color: #666; border-bottom: 1px solid #eee; background:#f7f7f7; text-transform: uppercase;">Files</div>
                    <div id="ol-diff-list" style="flex: 1; overflow-y: auto; overflow-x: hidden;"></div>
                </div>

                <div class="ol-diff-main" style="
                    flex: 1; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff;
                ">
                    <div id="ol-diff-viewer" style="
                        width: 100%; height: 100%; overflow: auto; padding: 0;
                        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                        font-size: 13px; color: #24292e;
                    ">Select a file from the left to view changes...</div>
                </div>
            </div>

            <div class="ol-diff-footer" style="
                width: 100%; height: 45px; flex-shrink: 0; border-top: 1px solid #ddd; background: #f8f9fa;
                display: flex; justify-content: space-between; align-items: center; padding: 0 16px;
            ">
                <div id="ol-diff-active-file" style="font-size: 13px; color: #586069;"></div>
                <button class="ol-diff-apply-btn" id="ol-diff-apply-btn" disabled style="
                    padding: 6px 14px; cursor: pointer; background: #e1e4e8; border: 1px solid #d1d5da;
                    border-radius: 4px; font-weight: 600; color: #959da5; font-size: 13px;
                ">Apply to Active Editor</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = document.getElementById('ol-diff-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

        const header = document.getElementById('ol-diff-header');
        this.makeDraggable(modal, header);

        return modal;
    },

    // --- 渲染逻辑 ---
    renderDiffUI: function(changes, FS) {
        const listEl = document.getElementById('ol-diff-list');
        const viewEl = document.getElementById('ol-diff-viewer');
        const applyBtn = document.getElementById('ol-diff-apply-btn');
        const activeFileLabel = document.getElementById('ol-diff-active-file');

        listEl.innerHTML = '';
        viewEl.innerHTML = '<div style="padding:20px; color:#666;">← Select a file to view changes</div>';
        applyBtn.disabled = true;
        applyBtn.style.background = '#e1e4e8';
        applyBtn.style.color = '#959da5';
        applyBtn.style.cursor = 'not-allowed';
        activeFileLabel.innerHTML = '<span>No file selected</span>';

        if (changes.length === 0) {
            viewEl.innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#28a745;">
                    <div style="font-size:40px; margin-bottom:10px;">🎉</div>
                    <div style="font-size:18px; font-weight:bold;">Sync Complete</div>
                    <div style="color:#666; margin-top:5px;">No differences found.</div>
                </div>`;
            return;
        }

        changes.forEach(change => {
            const item = document.createElement('div');
            item.className = 'ol-diff-item';

            item.style.cssText = `
                padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f1f1;
                border-left: 4px solid transparent; font-size: 13px; display: flex;
                align-items: center; justify-content: space-between; transition: background 0.1s; overflow: hidden;
            `;

            item.onmouseenter = () => { if(!item.classList.contains('active')) item.style.background = '#f6f8fa'; };
            item.onmouseleave = () => { if(!item.classList.contains('active')) item.style.background = 'transparent'; };

            let badgeColor = change.status === 'new' ? '#22863a' : (change.status === 'del' ? '#cb2431' : '#b08800');
            let badgeText = change.status === 'mod' ? 'MOD' : (change.status === 'new' ? 'NEW' : 'DEL');

            item.innerHTML = `
                <div style="display:flex; align-items:center; overflow:hidden; flex:1; margin-right:8px;">
                    <span style="margin-right:6px; color:#586069; font-family:monospace; font-size:14px;">📄</span>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#24292e;" title="${change.file}">${change.file}</span>
                </div>
                <span style="font-size: 10px; padding: 2px 5px; border-radius: 4px; background: ${badgeColor}; color: white; font-weight: bold; min-width:30px; text-align:center;">${badgeText}</span>
            `;

            item.onclick = async () => {
                document.querySelectorAll('.ol-diff-item').forEach(c => {
                    c.classList.remove('active');
                    c.style.background = 'transparent';
                    c.style.borderLeftColor = 'transparent';
                });
                item.classList.add('active');
                item.style.background = '#e1f0fa';
                item.style.borderLeftColor = '#0366d6';

                // --- 渲染行号 Diff ---
                if(change.status === 'new') {
                    // 全新文件，我们构造一个伪 Diff 字符串，让所有行都带 +
                    const lines = change.diff.split('\n');
                    let newDiff = "";
                    // JsDiff createTwoFilesPatch 已经包含了 header，我们只需要 body
                    // 但如果是 'new' 状态，change.diff 可能已经是 patch 格式
                    // 这里直接用 formatDiffWithLineNumbers 处理即可
                    viewEl.innerHTML = window.Zen.DiffUI.formatDiffWithLineNumbers(change.diff);
                } else if(change.status === 'del') {
                    viewEl.innerHTML = `<div style="padding:20px; text-align:center; color:#cb2431; font-weight:bold;">🗑️ This file was DELETED on remote.</div>`;
                } else {
                    // 普通修改
                    viewEl.innerHTML = window.Zen.DiffUI.formatDiffWithLineNumbers(change.diff);
                }

                // Safety Check Logic (保持不变)
                const checkSafety = () => {
                    const breadcrumbParts = window.Zen.Utils.getActiveBreadcrumbParts();
                    const isMatch = window.Zen.Utils.isStrictPathMatch(change.file, breadcrumbParts);

                    if (isMatch) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = 'Apply to Active Editor';
                        applyBtn.style.background = '#28a745';
                        applyBtn.style.borderColor = '#28a745';
                        applyBtn.style.color = '#fff';
                        applyBtn.style.cursor = 'pointer';
                        activeFileLabel.innerHTML = `
                            <div style="display:flex; align-items:center; gap:5px;">
                                <span style="color:#28a745; font-size:16px;">✅</span>
                                <span>Target: <b>${change.file}</b></span>
                            </div>`;

                        applyBtn.onclick = async () => {
                            try {
                                applyBtn.textContent = 'Applying...';
                                applyBtn.disabled = true;
                                const newContent = await FS.promises.readFile(`/remote/${change.file}`, { encoding: 'utf8' });
                                window.postMessage({
                                    source: 'zenoverleaf-content',
                                    action: 'APPLY_CONTENT',
                                    content: newContent
                                }, '*');
                                activeFileLabel.innerHTML = `<span style="color:#0366d6; font-weight:bold;">🚀 Request Sent!</span>`;
                                setTimeout(() => {
                                    applyBtn.textContent = 'Applied';
                                    applyBtn.style.background = '#0366d6';
                                }, 800);
                            } catch(e) {
                                alert("Read Error: " + e.message);
                                applyBtn.textContent = 'Error';
                            }
                        };
                    } else {
                        applyBtn.disabled = true;
                        applyBtn.textContent = 'Select File in Left Sidebar First';
                        applyBtn.style.background = '#f6f8fa';
                        applyBtn.style.borderColor = '#d1d5da';
                        applyBtn.style.color = '#959da5';
                        applyBtn.style.cursor = 'not-allowed';
                        activeFileLabel.innerHTML = `
                            <div style="display:flex; align-items:center; gap:5px; color:#d73a49;">
                                <span style="font-size:16px;">⚠️</span>
                                <span>Open <b>${change.file}</b> in Overleaf to apply.</span>
                            </div>`;
                        applyBtn.onclick = null;
                    }
                };

                checkSafety();
                item._checkSafety = checkSafety;
            };
            listEl.appendChild(item);
        });

        if(window._diffPoller) clearInterval(window._diffPoller);
        window._diffPoller = setInterval(() => {
            const modal = document.getElementById('ol-diff-modal');
            if(!modal || modal.style.display === 'none') {
                clearInterval(window._diffPoller);
                return;
            }
            const activeItem = document.querySelector('.ol-diff-item.active');
            if (activeItem && activeItem._checkSafety) {
                activeItem._checkSafety();
            }
        }, 1000);
    }
};