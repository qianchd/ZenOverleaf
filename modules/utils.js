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

    // --- [Modified] Enhanced Path Detection: Supports File Tree DOM ---
    getActiveBreadcrumbParts: function() {
        try {
            // Strategy 1: Prioritize checking the selected item in the left file tree (li.selected)
            // Structure: <li role="treeitem" class="selected" aria-label="main.tex">
            const selectedItem = document.querySelector('.file-tree-list li.selected[role="treeitem"]');
            if (selectedItem) {
                // Try to get aria-label directly (usually the most accurate: "main.tex")
                const label = selectedItem.getAttribute('aria-label');
                if (label) return [label]; // Return as array for compatibility

                // If no aria-label, try finding the internal span
                const nameSpan = selectedItem.querySelector('.item-name-button span');
                if (nameSpan) return [nameSpan.textContent.trim()];
            }

            // Strategy 2: Fallback to old breadcrumb navigation (Breadcrumbs)
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
     * Path Matching Logic
     */
    isStrictPathMatch: function(gitPath, pathParts) {
        if (!pathParts || pathParts.length === 0) return false;

        // Since we now mainly get the filename directly from the file tree (e.g., "main.tex"),
        // we only need to compare if the filenames match.
        // Git path: "chapters/intro.tex" -> fileName: "intro.tex"
        const gitSegments = gitPath.split('/').filter(p => p !== '.' && p !== '');
        const gitFileName = gitSegments[gitSegments.length - 1];

        // UI path: ["intro.tex"] (from file tree) or ["chapters", "intro.tex"] (from breadcrumbs)
        const uiFileName = pathParts[pathParts.length - 1];

        return gitFileName === uiFileName;
    },

    // Format Diff
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