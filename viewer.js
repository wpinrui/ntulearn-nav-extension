(function () {
  "use strict";

  // === Constants ===
  const DOCUMENT_RE = /\/ultra\/courses\/[^/]+\/outline\/.+/;
  const STYLE_ID = "ntulearn-ext-viewer-style";

  // === URL Detection ===
  function isFileView() {
    return DOCUMENT_RE.test(location.pathname);
  }

  // === CSS Injection ===
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #content-tab-panel-content .panel-content-inner {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
      }
      bb-file-preview {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
      }
      bb-file-preview > div {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
      }
      bb-file-preview iframe {
        flex: 1 1 auto !important;
        width: 100% !important;
        min-height: 0 !important;
        height: 100% !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeStyles() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // === Attribute Fix ===
  const fixedPreviews = new WeakSet();

  function fixGrowIframe() {
    document
      .querySelectorAll('bb-file-preview[grow-iframe="false"]')
      .forEach(function (el) {
        if (fixedPreviews.has(el)) return;
        fixedPreviews.add(el);
        el.setAttribute("grow-iframe", "true");
      });
  }

  // === Observer Lifecycle ===
  let observer = null;

  function startObserver() {
    if (observer || !document.body) return;
    injectStyles();
    observer = new MutationObserver(fixGrowIframe);
    observer.observe(document.body, { childList: true, subtree: true });
    fixGrowIframe();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    removeStyles();
  }

  // === SPA Navigation Detection ===
  function onNavigate() {
    if (isFileView()) {
      startObserver();
    } else {
      stopObserver();
    }
  }

  const _pushState = history.pushState;
  history.pushState = function () {
    const result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  const _replaceState = history.replaceState;
  history.replaceState = function () {
    const result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  if (document.body) {
    onNavigate();
  } else {
    document.addEventListener("DOMContentLoaded", onNavigate);
  }
})();
