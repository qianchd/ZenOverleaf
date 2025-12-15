window.Zen = window.Zen || {};

window.Zen.Utils = {
    isFullscreen: function() {
        return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    },

    waitForElement: function(selector, callback) {
        const el = document.querySelector(selector);
        if (el) {
            callback(el);
        } else {
            setTimeout(() => window.Zen.Utils.waitForElement(selector, callback), 500);
        }
    },

    parseSvg: function(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        if (doc.querySelector('parsererror')) {
            return document.createElement('span');
        }
        return document.importNode(doc.documentElement, true);
    },

    // --- [修改] 增强版路径检测：支持文件树 DOM ---
    getActiveBreadcrumbParts: function() {
        try {
            // 策略 1: 优先检查左侧文件树中被选中的项 (li.selected)
            // 结构: <li role="treeitem" class="selected" aria-label="main.tex">
            const selectedItem = document.querySelector('.file-tree-list li.selected[role="treeitem"]');
            if (selectedItem) {
                // 尝试直接取 aria-label (通常最准: "main.tex")
                const label = selectedItem.getAttribute('aria-label');
                if (label) return [label]; // 返回数组格式以保持兼容

                // 如果没有 aria-label，尝试找内部的 span
                const nameSpan = selectedItem.querySelector('.item-name-button span');
                if (nameSpan) return [nameSpan.textContent.trim()];
            }

            // 策略 2: 回退到旧的面包屑导航 (Breadcrumbs)
            const breadcrumbsContainer = document.querySelector('.ol-cm-breadcrumbs');
            if (breadcrumbsContainer) {
                const childNodes = Array.from(breadcrumbsContainer.childNodes);
                return childNodes
                    .filter(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return false;
                        if (node.classList.contains('material-symbols')) return false;
                        if (node.tagName === 'DIV' && node.textContent.trim() === '') return false;
                        return true;
                    })
                    .map(node => node.textContent.trim())
                    .filter(text => text.length > 0);
            }

            return [];
        } catch (e) {
            console.warn("[ZenOverleaf] Path parsing failed:", e);
            return [];
        }
    },

    /**
     * 路径匹配逻辑
     */
    isStrictPathMatch: function(gitPath, pathParts) {
        if (!pathParts || pathParts.length === 0) return false;

        // 既然我们现在主要从文件树直接获取文件名（例如 "main.tex"），
        // 那么我们只需要比较文件名是否一致即可。
        // Git path: "chapters/intro.tex" -> fileName: "intro.tex"
        const gitSegments = gitPath.split('/').filter(p => p !== '.' && p !== '');
        const gitFileName = gitSegments[gitSegments.length - 1];

        // UI path: ["intro.tex"] (从文件树获取) 或 ["chapters", "intro.tex"] (从面包屑获取)
        const uiFileName = pathParts[pathParts.length - 1];

        return gitFileName === uiFileName;
    },

    // 格式化 diff
    formatDiff: function(diffText) {
        const lines = diffText.split('\n');
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        return lines.map(line => {
            if (line.startsWith('+++') || line.startsWith('---')) return '';
            if (line.startsWith('+')) return `<span class="diff-added">${escapeHtml(line)}</span>`;
            if (line.startsWith('-')) return `<span class="diff-removed">${escapeHtml(line)}</span>`;
            if (line.startsWith('@@')) return `<div style="color:#aaa; margin:10px 0;">${escapeHtml(line)}</div>`;
            return `<span class="diff-normal">${escapeHtml(line)}</span>`;
        }).join('');
    }
};