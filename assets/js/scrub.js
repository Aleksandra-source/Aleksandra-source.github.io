/* ==========================================================================
   Scrubbing prose — the paragraph crossing the viewport's centre band lights
   up to full ink colour while the rest stay dim, giving the "text follows
   you as you scroll" effect. Same IntersectionObserver technique as the
   case-page table-of-contents scroll-spy, applied to [data-scrub] blocks.
   ========================================================================== */
(function () {
  "use strict";

  var blocks = document.querySelectorAll("[data-scrub]");
  if (!blocks.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    blocks.forEach(function (el) { el.classList.add("is-active"); });
    return;
  }

  // The first block starts active so there's something lit before the
  // reader has scrolled at all.
  blocks[0].classList.add("is-active");

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
  );
  blocks.forEach(function (el) { io.observe(el); });
})();
