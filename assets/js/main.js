/* ==========================================================================
   Main — preloader, clock, marquee, hover-to-play video, case TOC
   scroll-spy. Each block guards on the elements it needs so this single
   file is safe to include on every page.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---------------------------------------------------------------------
     Preloader — runs once per browser session.
  --------------------------------------------------------------------- */
  (function preloader() {
    var el = document.querySelector(".preloader");
    if (!el) return;
    var bar = el.querySelector(".preloader__bar span");
    var count = el.querySelector(".preloader__count");
    var seen = false;
    try { seen = sessionStorage.getItem("preloaderShown") === "1"; } catch (e) {}

    function finish() {
      el.classList.add("is-hidden");
      setTimeout(function () { el.remove(); }, 900);
    }

    if (seen || reduceMotion) {
      finish();
      return;
    }
    try { sessionStorage.setItem("preloaderShown", "1"); } catch (e) {}

    var n = 0;
    var timer = setInterval(function () {
      n += Math.round(4 + Math.random() * 14);
      if (n >= 100) {
        n = 100;
        clearInterval(timer);
        setTimeout(finish, 260);
      }
      if (bar) bar.style.width = n + "%";
      if (count) count.textContent = n;
    }, 70);
  })();

  /* ---------------------------------------------------------------------
     Saint Petersburg clock
  --------------------------------------------------------------------- */
  (function clock() {
    var els = document.querySelectorAll("[data-clock]");
    if (!els.length) return;
    function tick() {
      var fmt = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      els.forEach(function (el) { el.textContent = fmt; });
    }
    tick();
    setInterval(tick, 30000);
  })();

  /* ---------------------------------------------------------------------
     Marquee — scroll-reactive speed and direction
  --------------------------------------------------------------------- */
  (function marquee() {
    var track = document.querySelector(".marquee__track");
    if (!track) return;

    var pos = 0;
    var half = 0;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener("resize", measure);

    var lastY = window.scrollY;
    var boost = 0;
    var dir = -1;

    window.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY;
        var delta = y - lastY;
        lastY = y;
        if (Math.abs(delta) > 0.5) dir = delta > 0 ? -1 : 1;
        boost = Math.min(Math.abs(delta) * 0.6, 18);
      },
      { passive: true }
    );

    function raf() {
      boost *= 0.92;
      var speed = 0.45 + boost;
      pos += dir * speed;
      if (half > 0) {
        if (pos <= -half) pos += half;
        if (pos > 0) pos -= half;
      }
      track.style.transform = "translate3d(" + pos + "px,0,0)";
      requestAnimationFrame(raf);
    }
    if (!reduceMotion) requestAnimationFrame(raf);
  })();

  /* ---------------------------------------------------------------------
     Copy-to-clipboard buttons — [data-copy="value"]. Pairs with the custom
     cursor's "copy" state: label reads "Copy", flips to "Copied" on click,
     then reverts once the pointer leaves.
  --------------------------------------------------------------------- */
  (function copyButtons() {
    var els = document.querySelectorAll("[data-copy]");
    if (!els.length) return;

    function fallbackCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }

    els.forEach(function (el) {
      el.addEventListener("click", function () {
        var value = el.getAttribute("data-copy");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(function () { fallbackCopy(value); });
        } else {
          fallbackCopy(value);
        }

        el.classList.add("is-copied");
        var loc = document.documentElement.getAttribute("data-locale") || "ru";
        if (window.__cursor) window.__cursor.setLabel(loc === "en" ? "Copied" : "Скопировано");

        clearTimeout(el.__copyTimer);
        el.__copyTimer = setTimeout(function () {
          el.classList.remove("is-copied");
          if (window.__cursor) window.__cursor.resetLabel();
        }, 1600);
      });

      el.addEventListener("mouseleave", function () {
        clearTimeout(el.__copyTimer);
        el.classList.remove("is-copied");
      });
    });
  })();

  /* ---------------------------------------------------------------------
     Hover-to-play video — a poster image by default, cross-fades into the
     looping clip on hover (or tap, on touch devices without hover).
  --------------------------------------------------------------------- */
  (function hoverVideo() {
    var els = document.querySelectorAll(".hover-video");
    if (!els.length) return;
    els.forEach(function (el) {
      var video = el.querySelector(".hover-video__clip");
      if (!video) return;

      function activate() {
        el.classList.add("is-active");
        video.play().catch(function () {});
      }
      function deactivate() {
        el.classList.remove("is-active");
        video.pause();
      }

      el.addEventListener("mouseenter", activate);
      el.addEventListener("mouseleave", deactivate);
      el.addEventListener("touchstart", function () {
        el.classList.contains("is-active") ? deactivate() : activate();
      }, { passive: true });
    });
  })();

  /* ---------------------------------------------------------------------
     Case study — scroll-spy for the sticky table of contents
  --------------------------------------------------------------------- */
  (function caseToc() {
    var toc = document.querySelector(".case-toc");
    if (!toc) return;
    var links = Array.prototype.slice.call(toc.querySelectorAll("a"));
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = toc.querySelector('a[href="#' + entry.target.id + '"]');
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.classList.remove("is-active"); });
            link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { io.observe(s); });

    // Reading progress bar
    var bar = document.querySelector(".progress-bar");
    if (bar) {
      window.addEventListener(
        "scroll",
        function () {
          var h = document.documentElement;
          var scrolled = h.scrollTop;
          var max = h.scrollHeight - h.clientHeight;
          bar.style.width = max > 0 ? (scrolled / max) * 100 + "%" : "0%";
        },
        { passive: true }
      );
    }
  })();
})();
