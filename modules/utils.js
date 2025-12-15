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
    }
};