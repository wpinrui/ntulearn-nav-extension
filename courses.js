(function () {
  "use strict";

  // === Constants ===
  const STORAGE_KEY = "ntulearn-ext-courses";
  const HIDDEN_KEY = "ntulearn-ext-hidden";
  const COURSES_PAGE_PATH = "/ultra/course";
  const POPOVER_SELECTOR = '[data-test-id="course-switcher-popover"]';
  // Courses page uses AngularJS article cards, not <a href> links
  const COURSE_CARD_SELECTOR = "article.course-element-card";
  const P = "ntulearn-ext"; // CSS class prefix
  const SMALL_WORDS = new Set([
    "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or",
    "the", "to", "with",
  ]);

  // === CSS ===
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .${P}-search {
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        background: rgba(255,255,255,0.08);
        color: inherit;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
      }
      .${P}-search:focus {
        border-color: rgba(255,255,255,0.4);
        background: rgba(255,255,255,0.12);
      }
      .${P}-search::placeholder {
        color: rgba(255,255,255,0.5);
      }
      .${P}-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 400px;
        overflow-y: auto;
      }
      .${P}-item {
        margin: 0;
        padding: 0;
      }
      .${P}-item a {
        display: block;
        padding: 10px 12px;
        border-radius: 6px;
        text-decoration: none;
        color: inherit;
        transition: background 0.15s;
      }
      .${P}-item a:hover,
      .${P}-item a:focus {
        background: rgba(255,255,255,0.08);
        outline: none;
      }
      .${P}-course-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }
      .${P}-course-meta span {
        font-size: 11px;
        opacity: 0.5;
        margin-right: 8px;
      }
      .${P}-no-results {
        padding: 20px 12px;
        text-align: center;
        opacity: 0.5;
        font-size: 14px;
      }
      .${P}-item-row {
        display: flex;
        align-items: flex-start;
      }
      .${P}-item-row a {
        flex: 1;
        min-width: 0;
      }
      .${P}-hide-btn {
        flex-shrink: 0;
        background: none;
        border: none;
        color: inherit;
        opacity: 0;
        cursor: pointer;
        padding: 10px 8px;
        font-size: 14px;
        transition: opacity 0.15s;
      }
      .${P}-item:hover .${P}-hide-btn,
      .${P}-hide-btn:focus {
        opacity: 0.5;
      }
      .${P}-hide-btn:hover {
        opacity: 1 !important;
      }
      .${P}-item-hidden a {
        opacity: 0.35;
      }
      .${P}-item-hidden .${P}-hide-btn {
        opacity: 0.4;
      }
      .${P}-hidden-count {
        padding: 6px 12px;
        font-size: 12px;
        opacity: 0.4;
        text-align: center;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // === Data Layer ===
  function saveCourses(courses) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), courses: courses })
      );
    } catch (_) {}
  }

  function loadCachedCourses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.courses || null;
    } catch (_) {
      return null;
    }
  }

  function loadHidden() {
    try {
      var raw = localStorage.getItem(HIDDEN_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function saveHidden(hiddenSet) {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hiddenSet)));
    } catch (_) {}
  }

  function scrapeCourses() {
    const cards = document.querySelectorAll(COURSE_CARD_SELECTOR);
    const courses = [];
    const seen = new Set();

    cards.forEach(function (card) {
      var courseId = card.getAttribute("data-course-id");
      if (!courseId || seen.has(courseId)) return;
      seen.add(courseId);

      var nameEl = card.querySelector("h4.js-course-title-element");
      var idEl = card.querySelector(".course-id span");
      var statusEl = card.querySelector(".course-status span");

      // Find the term heading: walk backwards from this card's parent
      // to find the preceding h3 term header
      var term = "";
      var prev = card.closest("[ng-repeat-end]");
      if (prev) {
        var termHeader = prev.previousElementSibling;
        while (termHeader && !termHeader.querySelector("h3")) {
          termHeader = termHeader.previousElementSibling;
        }
        if (termHeader) {
          var h3 = termHeader.querySelector("h3");
          if (h3) term = h3.textContent.trim();
        }
      }

      courses.push({
        href: location.origin + "/ultra/courses/" + courseId + "/outline",
        courseId: idEl ? idEl.textContent.trim() : "",
        courseName: nameEl ? nameEl.textContent.trim() : "",
        status: statusEl ? statusEl.textContent.trim() : "",
        semester: term,
      });
    });

    return courses;
  }

  // === Formatting ===
  function toTitleCase(text) {
    return text
      .split(/(\s+|-)/g)
      .map(function (part, i) {
        if (/^\s+$/.test(part) || part === "-") return part;
        // Keep codes with digits as-is (e.g. TG07, I, II)
        if (/\d/.test(part)) return part;
        var lower = part.toLowerCase();
        if (i > 0 && SMALL_WORDS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join("");
  }

  function formatCourseName(raw) {
    // Parse "CODE(DATE):NAME" or "CODE(DATE):NAME - GROUP"
    var match = raw.match(/^([^(]+)\([^)]*\):\s*(.+)$/);
    if (!match) return { code: "", title: raw };
    var code = match[1].trim().replace(/_/g, "/");
    var title = match[2].trim();
    // Convert ALL CAPS to title case, leave mixed case as-is
    if (title === title.toUpperCase()) {
      title = toTitleCase(title);
    }
    return { code: code, title: title };
  }

  // === Search ===
  function getWords(text) {
    return text.split(/[\s/:,\-()]+/).filter(Boolean);
  }

  function acronym(words) {
    return words.map(function (w) { return w[0].toLowerCase(); }).join("");
  }

  function startsWithAny(words, q) {
    for (var i = 0; i < words.length; i++) {
      if (words[i].startsWith(q)) return true;
    }
    return false;
  }

  function matchesCourse(course, q) {
    // Word-start matching (avoids "pp" matching "approaches")
    var nameWords = getWords(course.courseName.toLowerCase());
    var idWords = getWords(course.courseId.toLowerCase());
    if (startsWithAny(nameWords, q)) return true;
    if (startsWithAny(idWords, q)) return true;
    if (q.length >= 2) {
      var words = getWords(course.courseName);
      // Full acronym (e.g. "taml" matches Teaching And Managing Learners)
      if (acronym(words).includes(q)) return true;
      // Filtered acronym (e.g. "tml" skipping stop words)
      var filtered = words.filter(function (w) { return !SMALL_WORDS.has(w.toLowerCase()); });
      if (acronym(filtered).includes(q)) return true;
    }
    return false;
  }

  // === UI Layer ===
  function buildDropdownUI(container, courses) {
    container.innerHTML = "";
    var hidden = loadHidden();

    var search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search courses\u2026";
    search.className = P + "-search";

    var list = document.createElement("ul");
    list.className = P + "-list";
    list.setAttribute("role", "menu");

    function render(query) {
      list.innerHTML = "";
      var q = query.toLowerCase();
      var isSearching = q.length > 0;
      var matched = courses.filter(function (c) {
        return matchesCourse(c, q);
      });
      // When not searching, hide hidden courses; when searching, show all
      var visible = isSearching
        ? matched
        : matched.filter(function (c) { return !hidden.has(c.href); });
      var hiddenCount = isSearching
        ? 0
        : matched.length - visible.length;

      if (visible.length === 0 && hiddenCount === 0) {
        var msg = document.createElement("li");
        msg.className = P + "-no-results";
        msg.textContent = "No courses found";
        list.appendChild(msg);
        return;
      }

      visible.forEach(function (course) {
        var isHidden = hidden.has(course.href);
        var li = document.createElement("li");
        li.className = P + "-item" + (isHidden ? " " + P + "-item-hidden" : "");

        var row = document.createElement("div");
        row.className = P + "-item-row";

        var a = document.createElement("a");
        a.href = course.href;
        a.setAttribute("role", "menuitem");

        var fmt = formatCourseName(course.courseName);

        var name = document.createElement("div");
        name.className = P + "-course-name";
        name.textContent = fmt.code
          ? fmt.code + ": " + fmt.title
          : fmt.title;

        var meta = document.createElement("div");
        meta.className = P + "-course-meta";
        if (course.semester) {
          var sem = document.createElement("span");
          sem.textContent = course.semester;
          meta.appendChild(sem);
        }
        if (course.status) {
          var s = document.createElement("span");
          s.textContent = course.status;
          meta.appendChild(s);
        }

        a.appendChild(name);
        a.appendChild(meta);

        var btn = document.createElement("button");
        btn.className = P + "-hide-btn";
        btn.textContent = isHidden ? "+" : "\u00d7";
        btn.title = isHidden ? "Show in list" : "Hide from list";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (hidden.has(course.href)) {
            hidden.delete(course.href);
          } else {
            hidden.add(course.href);
          }
          saveHidden(hidden);
          render(search.value);
        });

        row.appendChild(a);
        row.appendChild(btn);
        li.appendChild(row);
        list.appendChild(li);
      });

      if (hiddenCount > 0) {
        var hint = document.createElement("li");
        hint.className = P + "-hidden-count";
        hint.textContent = hiddenCount + " hidden course" + (hiddenCount > 1 ? "s" : "");
        list.appendChild(hint);
      }
    }

    search.addEventListener("input", function () {
      render(search.value);
    });

    container.appendChild(search);
    container.appendChild(list);
    render("");

    setTimeout(function () {
      search.focus();
    }, 0);
  }

  // === Dropdown Override ===
  var handledPopovers = new WeakSet();

  function handlePopover(popover) {
    if (handledPopovers.has(popover)) return;
    handledPopovers.add(popover);

    var courses = loadCachedCourses();
    if (!courses || courses.length === 0) return;

    // Find the content area below the header.
    // The header is the first child div (contains h1, "View all" link, close button).
    // The content area is the second child div (contains "Recent courses" and the list).
    var contentArea = popover.querySelector('ul[role="menu"]');
    if (contentArea) contentArea = contentArea.parentElement;
    if (!contentArea) return;
    buildDropdownUI(contentArea, courses);
  }

  function scanForPopover() {
    var popover = document.querySelector(POPOVER_SELECTOR);
    if (popover) handlePopover(popover);
  }

  // === Course Scraping on /ultra/course ===
  var scrapeTimeout = null;
  var scrapingObserver = null;

  function scheduleScrape() {
    clearTimeout(scrapeTimeout);
    scrapeTimeout = setTimeout(function () {
      var courses = scrapeCourses();
      if (courses.length > 0) {
        saveCourses(courses);
      }
    }, 500);
  }

  function startScrapingObserver() {
    if (scrapingObserver) return;
    scrapingObserver = new MutationObserver(scheduleScrape);
    scrapingObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    scheduleScrape();
  }

  function stopScrapingObserver() {
    if (scrapingObserver) {
      scrapingObserver.disconnect();
      scrapingObserver = null;
    }
    clearTimeout(scrapeTimeout);
  }

  // === SPA Navigation Detection ===
  function isCoursesPage() {
    var p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  function onNavigate() {
    if (isCoursesPage()) {
      startScrapingObserver();
    } else {
      stopScrapingObserver();
    }
  }

  var _pushState = history.pushState;
  history.pushState = function () {
    var result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  var _replaceState = history.replaceState;
  history.replaceState = function () {
    var result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  function start() {
    injectStyles();

    var observer = new MutationObserver(scanForPopover);
    observer.observe(document.body, { childList: true, subtree: true });
    scanForPopover();

    onNavigate();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
