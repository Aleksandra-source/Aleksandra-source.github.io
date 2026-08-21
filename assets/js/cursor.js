/* ==========================================================================
   Custom cursor — dot (instant) + ring (lerped), state-aware.
   mix-blend-mode: difference (set in CSS) inverts whatever is underneath —
   text, photos, dark or light sections — automatically, so no per-surface
   theming logic is needed here. Disabled entirely on coarse pointers and
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var canRun =
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canRun) return;

  document.documentElement.classList.add("has-custom-cursor");

  var dot = document.createElement("div");
  dot.className = "cursor-dot";
  var ring = document.createElement("div");
  ring.className = "cursor-ring";
  var label = document.createElement("span");
  label.className = "cursor-ring__label";
  ring.appendChild(label);

  function mount() {
    document.body.appendChild(dot);
    document.body.appendChild(ring);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  var mouseX = -100, mouseY = -100;
  var ringX = -100, ringY = -100;
  var visible = false;

  window.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      dot.style.opacity = "1";
      ringX = mouseX;
      ringY = mouseY;
    }
    dot.style.transform = "translate3d(" + mouseX + "px," + mouseY + "px,0)";
  });

  window.addEventListener("mouseleave", function () {
    visible = false;
    dot.style.opacity = "0";
  });

  function raf() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // ---- State handling via data-cursor on any element (or its ancestor) ----
  var STATES = ["link", "case", "drag", "copy"];
  var LABELS = {
    case: { ru: "Смотреть", en: "View" },
    drag: { ru: "Тяни", en: "Drag" },
    copy: { ru: "Скопировать", en: "Copy" },
  };

  function syncDot() {
    var filled = STATES.some(function (s) { return ring.classList.contains("is-" + s); });
    dot.style.opacity = filled ? "0" : (visible ? "1" : "0");
  }

  function applyState(el) {
    var type = el ? el.closest("[data-cursor]") : null;
    STATES.forEach(function (s) { ring.classList.remove("is-" + s); });
    if (!type) { syncDot(); return; }
    var kind = type.getAttribute("data-cursor");
    if (STATES.indexOf(kind) === -1) { syncDot(); return; }
    ring.classList.add("is-" + kind);
    if (LABELS[kind]) {
      var loc = document.documentElement.getAttribute("data-locale") || "ru";
      label.textContent = LABELS[kind][loc] || LABELS[kind].ru;
    } else {
      label.textContent = "";
    }
    syncDot();
  }

  document.addEventListener("mouseover", function (e) { applyState(e.target); });
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget || !(e.relatedTarget instanceof Element) || !e.relatedTarget.closest("[data-cursor]")) {
      STATES.forEach(function (s) { ring.classList.remove("is-" + s); });
      syncDot();
    }
  });

  // The reactive fill isn't limited to links — it grows over any readable
  // text across the site (headings, paragraphs, quotes, list items), so the
  // blend effect is felt everywhere the cursor goes, not just on clickables.
  var REACT_SELECTOR =
    "a, button, h1, h2, h3, h4, p, blockquote, li, dt, dd, .meta, .pill, .work-card__title, .timeline-row__org, .book-row";

  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest(REACT_SELECTOR);
    if (el && !el.closest("[data-cursor]")) { ring.classList.add("is-link"); syncDot(); }
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target.closest(REACT_SELECTOR);
    if (el && !el.closest("[data-cursor]")) { ring.classList.remove("is-link"); syncDot(); }
  });

  document.addEventListener("localechange", function () {
    var active = STATES.find(function (s) { return ring.classList.contains("is-" + s); });
    if (active && LABELS[active]) {
      var loc = document.documentElement.getAttribute("data-locale") || "ru";
      label.textContent = LABELS[active][loc] || LABELS[active].ru;
    }
  });

  // Lets other scripts (e.g. the copy-to-clipboard button) briefly swap the
  // ring's label — "Copy" -> "Copied" — without inventing a whole new state.
  window.__cursor = {
    setLabel: function (text) { label.textContent = text; },
    resetLabel: function () {
      var active = STATES.find(function (s) { return ring.classList.contains("is-" + s); });
      var loc = document.documentElement.getAttribute("data-locale") || "ru";
      label.textContent = active && LABELS[active] ? (LABELS[active][loc] || LABELS[active].ru) : "";
    },
  };
})();
