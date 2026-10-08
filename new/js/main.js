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
    }, { threshold: box.hasAttribute("data-early") ? 0.08 : 0.4 });
    io.observe(box);
  });

  /* ---------- Case videos: start downloading well before they are scrolled to ---------- */
  var warmBoxes = doc.querySelectorAll("[data-player]");
  if (warmBoxes.length && "IntersectionObserver" in window) {
    var warm = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var v = e.target.querySelector("video");
        if (v && v.preload !== "auto") { v.preload = "auto"; v.load(); }
        warm.unobserve(e.target);
      });
    }, { rootMargin: "1800px 0px" });
    warmBoxes.forEach(function (b) { warm.observe(b); });
  }

  /* ---------- Case page: reveal on scroll, progress, parallax ---------- */
  var isStory = body.classList.contains("page-story");
  if (body.classList.contains("page-case") || isStory) {
    var sel = isStory ? ".s-r" :
              ".c-title,.c-sub,.c-meta,.c-hero,.c-h,.c-p:not(.c-res__list),.c-tag,.c-tp,.c-tiles,.c-findings,.c-findings__list li," +
              ".player,.hyp__card,.c-bench__logos li,.c-res__list li,.metric";
    var items = Array.prototype.slice.call(doc.querySelectorAll(sel));
    var counters = Array.prototype.slice.call(doc.querySelectorAll(".s-res"));
    var countUp = function (row) {
      var n = row.querySelector("[data-count]");
      if (!n) return;
      var to = parseFloat(n.getAttribute("data-count")), t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1500);
        n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var accents = Array.prototype.slice.call(doc.querySelectorAll(".accent"));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      accents.forEach(function (a) { a.classList.add("is-in"); });
      counters.forEach(function (r) { r.classList.add("is-in", "no-motion"); });
    } else {
      var groups = new Map();
      counters.forEach(function (r) { var n = r.querySelector("[data-count]"); if (n) n.textContent = "0"; });
      items.forEach(function (el) {
        el.classList.add("reveal");
        if (el.matches(".c-hero,.c-tiles,.player,.c-findings,.metric,.hyp__card,.s-r--scale")) el.classList.add("reveal--scale");
        var parent = el.parentElement;
        if (el.matches(".hyp__card,.metric,.c-bench__logos li,.c-res__list li,.c-findings__list li") || (isStory && parent.classList.contains("s-group"))) {
          var i = groups.get(parent) || 0;
          groups.set(parent, i + 1);
          el.style.setProperty("--d", (i * 0.09) + "s");
        }
      });
      var rv = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            if (e.target.classList.contains("s-res")) setTimeout(function () { countUp(e.target); }, 250);
            rv.unobserve(e.target);
          }
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

  /* ---------- Animated flow diagram: plays once when scrolled to, can be replayed ---------- */
  doc.querySelectorAll("[data-flowanim]").forEach(function (box) {
    var stage = box.querySelector(".stage");
    var replay = box.querySelector(".s-flow__replay");
    var timers = [];
    var reset = function () {
      timers.forEach(clearTimeout); timers = [];
      box.classList.remove("is-s1", "is-s2", "is-s3", "is-done");
      stage.style.transform = "";
    };
    var play = function () {
      reset();
      void box.getBoundingClientRect();
      box.classList.add("is-s1");
      timers.push(setTimeout(function () { box.classList.add("is-s2"); }, 4400));
      timers.push(setTimeout(function () {
        box.classList.add("is-s3");
        stage.style.transform = "translate(-945px,-114.75px) scale(1.5)";
      }, 7300));
      timers.push(setTimeout(function () { box.classList.add("is-done"); }, 9700));
    };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      box.classList.add("no-motion", "is-s1", "is-s2", "is-s3", "is-done");
      return;
    }
    var fio = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { play(); fio.disconnect(); }
    }, { threshold: 0.5 });
    fio.observe(box);
    if (replay) replay.addEventListener("click", play);
  });

  /* ---------- Story pages: horizontal strips (drag / scroll) and tabs ---------- */
  doc.querySelectorAll("[data-strip]").forEach(function (strip) {
    var track = strip.nextElementSibling;
    var thumb = track && track.classList.contains("s-track") ? track.querySelector("i") : null;
    var upd = function () {
      if (!thumb) return;
      var w = strip.scrollWidth, vis = strip.clientWidth;
      thumb.style.width = Math.min(100, vis / w * 100) + "%";
      thumb.style.left = (strip.scrollLeft / w * 100) + "%";
    };
    strip.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
    var down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 4) { moved = true; strip.classList.add("is-drag"); }
      if (moved) strip.scrollLeft = sl - dx;
    });
    var up = function () { down = false; strip.classList.remove("is-drag"); };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });

  doc.querySelectorAll("[data-tabs]").forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    var figs = Array.prototype.slice.call(box.querySelectorAll(".s-tabs__view figure"));
    var select = function (i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
      figs.forEach(function (f, k) { f.classList.toggle("is-on", k === i); });
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.tabIndex = i === 0 ? 0 : -1;
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); select((i + tabs.length - 1) % tabs.length, true); }
      });
    });
  });

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
