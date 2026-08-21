/* ==========================================================================
   Smooth (lerped) scroll + parallax media + in-page anchor handling.

   The page scrolls natively — scrollbar, wheel, keyboard, touch all behave
   normally. #scroll-fixed is taken out of flow (position: fixed) and its
   transform lags behind window.scrollY with a lerp, which produces the
   inertia feel. #scroll-spacer just reserves real document height.

   Disabled on coarse pointers, small viewports and prefers-reduced-motion —
   those get plain native scrolling with no JS involvement at all.
   ========================================================================== */
(function () {
  "use strict";

  var fixed = document.getElementById("scroll-fixed");
  var spacer = document.getElementById("scroll-spacer");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var wideEnough = window.matchMedia("(min-width: 901px)").matches;
  var smoothEnabled = fixed && spacer && finePointer && wideEnough && !reduceMotion;

  var current = window.scrollY || 0;
  var target = current;

  if (smoothEnabled) {
    document.documentElement.classList.add("has-smooth-scroll");

    var resize = function () {
      spacer.style.height = fixed.getBoundingClientRect().height + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(fixed);
    } else {
      window.addEventListener("load", resize);
      setTimeout(resize, 800);
    }

    var LERP = 0.1;
    function raf() {
      target = window.scrollY;
      current += (target - current) * LERP;
      if (Math.abs(target - current) < 0.05) current = target;
      fixed.style.transform = "translate3d(0," + -current + "px,0)";
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  function scrollYOf() {
    return smoothEnabled ? current : window.scrollY;
  }

  // ---- In-page anchor links: compute target manually so it works with the
  // transformed layer above, and so the motion matches our own easing. ----
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 88;
    var top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    history.pushState(null, "", "#" + id);
  });

  // ---- Parallax media: data-parallax="0.15" on a .frame wrapper ----
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  if (parallaxEls.length) {
    var active = new Set();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) active.add(entry.target);
          else active.delete(entry.target);
        });
      },
      { rootMargin: "10% 0px 10% 0px" }
    );
    parallaxEls.forEach(function (el) { io.observe(el); });

    function parallaxRaf() {
      var vh = window.innerHeight;
      active.forEach(function (el) {
        var factor = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var rect = el.getBoundingClientRect();
        var centerDelta = rect.top + rect.height / 2 - vh / 2;
        var media = el.querySelector("img, video");
        if (media) {
          media.style.transform = "translate3d(0," + (centerDelta * factor).toFixed(2) + "px,0) scale(1.12)";
        }
      });
      requestAnimationFrame(parallaxRaf);
    }
    if (!reduceMotion) requestAnimationFrame(parallaxRaf);
  }

  window.__scroll = { getY: scrollYOf, smoothEnabled: smoothEnabled };
})();
