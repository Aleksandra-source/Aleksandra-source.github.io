(function () {
  "use strict";
  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var wide = function () { return window.innerWidth >= 900; };

  /* ---------- Live clock (Saint Petersburg) ---------- */
  var timeEl = doc.querySelector("[data-clock-time]");
  var dayEl = doc.querySelector("[data-clock-day]");
  if (timeEl && dayEl && window.Intl) {
    var tz = "Europe/Moscow";
    var fTime = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    var fDay = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" });
    var tick = function () {
      var now = new Date();
      timeEl.textContent = fTime.format(now);
      dayEl.textContent = fDay.format(now);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Current page in the navigation ---------- */
  var map = { "page-home": "home", "page-about": "about", "page-contacts": "contacts" };
  Object.keys(map).forEach(function (cls) {
    if (body.classList.contains(cls)) {
      var a = doc.querySelector('.nav a[data-nav="' + map[cls] + '"]');
      if (a) a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- Hero loops ---------- */
  var heroVideos = doc.querySelectorAll(".hero__media video, .about__media video");
  heroVideos.forEach(function (v) {
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); return; }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });
  doc.addEventListener("visibilitychange", function () {
    if (doc.visibilityState === "visible" && !reduceMotion) {
      heroVideos.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    }
  });

  /* ---------- Copy e-mail ---------- */
  var toast = doc.querySelector("[data-toast]");
  var toastTimer;
  doc.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        if (!toast) return;
        toast.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
  function fallbackCopy(text) {
    var t = doc.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    doc.body.appendChild(t); t.select();
    try { doc.execCommand("copy"); } catch (e) {}
    doc.body.removeChild(t);
  }

  /* ---------- Case videos: look like the page itself, start when scrolled to ---------- */
  doc.querySelectorAll("[data-player]").forEach(function (box) {
    var v = box.querySelector("video");
    if (!v) return;
    v.removeAttribute("controls");
    v.setAttribute("tabindex", "-1");
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", v.getAttribute("aria-label") || "");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      // no motion: show the finished state (last frames) instead of an empty first frame
      v.pause();
      v.addEventListener("loadedmetadata", function () { v.currentTime = Math.max(0, v.duration - 0.2); });
      return;
    }
    v.pause();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          v.currentTime = 0;
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.4 });
    io.observe(box);
  });

  /* ---------- Case page: reveal on scroll, progress, parallax ---------- */
  if (body.classList.contains("page-case")) {
    var sel = ".c-title,.c-sub,.c-meta,.c-hero,.c-h,.c-p:not(.c-res__list),.c-tag,.c-tp,.c-tiles,.c-findings,.c-findings__list li," +
              ".player,.hyp__card,.c-bench__logos li,.c-res__list li,.metric";
    var items = Array.prototype.slice.call(doc.querySelectorAll(sel));
    var accents = Array.prototype.slice.call(doc.querySelectorAll(".accent"));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      accents.forEach(function (a) { a.classList.add("is-in"); });
    } else {
      var groups = new Map();
      items.forEach(function (el) {
        el.classList.add("reveal");
        if (el.matches(".c-hero,.c-tiles,.player,.c-findings,.metric,.hyp__card")) el.classList.add("reveal--scale");
        var parent = el.parentElement;
        if (el.matches(".hyp__card,.metric,.c-bench__logos li,.c-res__list li,.c-findings__list li")) {
          var i = groups.get(parent) || 0;
          groups.set(parent, i + 1);
          el.style.setProperty("--d", (i * 0.09) + "s");
        }
      });
      var rv = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-in"); rv.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      items.concat(accents).forEach(function (el) { rv.observe(el); });
    }

    var bar = doc.createElement("div");
    bar.className = "progress";
    bar.setAttribute("aria-hidden", "true");
    body.appendChild(bar);
    var heroImg = doc.querySelector(".c-hero img");
    var targetP = 0, curP = 0, targetY = 0, curY = 0, running = false;
    var measure = function () {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      targetP = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (heroImg && wide()) {
        var r = heroImg.parentElement.getBoundingClientRect();
        var k = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        targetY = Math.max(-16, Math.min(16, k * -22));
      }
      if (!running) { running = true; requestAnimationFrame(frame); }
    };
    var frame = function () {
      curP += (targetP - curP) * 0.14;
      curY += (targetY - curY) * 0.1;
      bar.style.transform = "scaleX(" + curP.toFixed(4) + ")";
      if (heroImg && !reduceMotion) heroImg.style.transform = "translateY(" + curY.toFixed(2) + "px)";
      if (Math.abs(targetP - curP) > 0.0005 || Math.abs(targetY - curY) > 0.02) requestAnimationFrame(frame);
      else running = false;
    };
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
  }

  /* ---------- About: light up the place of work nearest to the middle of the screen ---------- */
  if (body.classList.contains("page-about") && !reduceMotion) {
    var tls = Array.prototype.slice.call(doc.querySelectorAll(".tl"));
    var tickA = false, activeEl = null;
    var pick = function () {
      var mid = window.innerHeight * 0.5, best = null, bestD = Infinity;
      tls.forEach(function (t) {
        var r = t.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) { bestD = d; best = t; }
      });
      if (best && best !== activeEl) {
        activeEl = best;
        tls.forEach(function (t) { t.classList.toggle("is-active", t === best); });
      }
      tickA = false;
    };
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    pick();
  }

  /* ---------- Home: interactive cursor + magnetic buttons ---------- */
  if (body.hasAttribute("data-has-cursor") && finePointer && !reduceMotion && wide()) {
    var root = doc.documentElement;
    root.classList.add("has-cursor");
    var cur = doc.createElement("div");
    cur.className = "cursor";
    cur.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
    var lab = doc.createElement("div");
    lab.className = "cursor-label";
    lab.innerHTML = "<i></i>";
    body.appendChild(cur);
    body.appendChild(lab);
    var ring = cur.querySelector(".cursor__ring");
    var dot = cur.querySelector(".cursor__dot");
    var labText = lab.querySelector("i");
    var mx = -100, my = -100, rx = -100, ry = -100, lx = -100, ly = -100, seen = false;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!seen) { rx = lx = mx; ry = ly = my; seen = true; }
      cur.classList.add("is-on");
    }, { passive: true });
    doc.addEventListener("mouseleave", function () { cur.classList.remove("is-on"); lab.classList.remove("is-on"); });
    window.addEventListener("mousedown", function () { cur.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { cur.classList.remove("is-down"); });
    doc.addEventListener("mouseover", function (e) {
      var t = e.target;
      var withLabel = t.closest && t.closest("[data-cursor]");
      var link = t.closest && t.closest("a,button");
      if (withLabel) {
        labText.textContent = withLabel.getAttribute("data-cursor");
        lab.classList.add("is-on");
        cur.classList.add("is-label");
        cur.classList.remove("is-link");
      } else {
        lab.classList.remove("is-on");
        cur.classList.remove("is-label");
        cur.classList.toggle("is-link", !!link);
      }
    });
    (function loop() {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      lx += (mx - lx) * 0.26; ly += (my - ly) * 0.26;
      dot.style.translate = mx + "px " + my + "px";
      ring.style.translate = rx + "px " + ry + "px";
      lab.style.left = lx + "px"; lab.style.top = ly + "px";
      requestAnimationFrame(loop);
    })();

    doc.querySelectorAll(".hero__links a").forEach(function (a) {
      a.addEventListener("mousemove", function (e) {
        var r = a.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        a.style.transform = "translate(" + (dx * 0.28).toFixed(1) + "px," + (dy * 0.5).toFixed(1) + "px)";
      });
      a.addEventListener("mouseleave", function () { a.style.transform = ""; });
    });
  }
})();
