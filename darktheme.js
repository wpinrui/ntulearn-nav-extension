(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("darkTheme", false)) return;

  // === Constants ===
  var STYLE_ID = "ntulearn-ext-dark-style";
  var DARK_CLASS = "ntulearn-ext-dark";

  // Already-dark UI regions that need re-inversion to stay dark.
  // Maintain as an array for easy addition/removal during testing.
  var DARK_CHROME_SELECTORS = [
    ".bb-course-navigation",
    ".base-header",
    "course-banner",
    ".black-panel-header",
    '[data-test-id="course-switcher-popover"]'
  ];

  // Media elements that need re-inversion to preserve original appearance.
  var MEDIA_SELECTORS = [
    "img",
    "video",
    "canvas",
    "iframe",
    '[style*="background-image"]'
  ];

  // === CSS Generation ===
  function buildCSS() {
    var d = "html." + DARK_CLASS;
    var reinvert = "filter:invert(1) hue-rotate(180deg) !important";

    function filterBlock(selectors) {
      return selectors.map(function (s) { return d + " " + s; }).join(",")
        + "{" + reinvert + "}\n";
    }

    var css = d + "{" + reinvert + ";background-color:#111 !important}\n";
    css += filterBlock(MEDIA_SELECTORS);
    if (DARK_CHROME_SELECTORS.length) css += filterBlock(DARK_CHROME_SELECTORS);

    return css;
  }

  // === Injection ===
  var style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = buildCSS();
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add(DARK_CLASS);
})();
