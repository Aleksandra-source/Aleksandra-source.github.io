/* ==========================================================================
   Reveal on scroll — IntersectionObserver toggles .is-visible on [data-reveal].
   Elements inside [data-reveal-group] get a staggered --i index.
   ========================================================================== */
(function () {
  "use strict";

  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    var items = group.querySelectorAll("[data-reveal]");
    items.forEach(function (el, i) { el.style.setProperty("--i", i); });
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach(function (el) { io.observe(el); });
})();
