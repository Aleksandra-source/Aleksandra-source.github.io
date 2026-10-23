(() => {
  document.documentElement.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- фон: плотное поле серых символов, еле заметное; пятна чуть темнее медленно плывут, символы не мигают ---------- */
  function codeBackground() {
    const cv = document.createElement("canvas");
    cv.className = "code-bg";
    cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    const base = document.createElement("canvas");
    const bctx = base.getContext("2d");
    const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const FONT = 13, CW = FONT * 0.6, CH = 14;
    const RGB = "28,26,23";
    const BASE_A = 0.035, PEAK_A = 0.05;
    let cols = 0, rows = 0, grid = [], dpr = 1, colL = 0, colR = 0;
    const pick = () => CHARS[(Math.random() * CHARS.length) | 0];

    // value noise: x, y, t -> 0..1
    const P = new Uint8Array(512);
    { const p = [...Array(256).keys()].sort(() => Math.random() - 0.5); for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
    const fade = (t) => t * t * (3 - 2 * t);
    const h3 = (x, y, z) => P[(P[(P[x & 255] + y) & 255] + z) & 255] / 255;
    function noise(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
      const l = (a, b, t) => a + (b - a) * t;
      return l(
        l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
        l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
    }
    const font = () => `${FONT}px "Plex Mono", ui-monospace, monospace`;
    const fadeAt = (x) => { // буквы почти гаснут за колонкой с текстом
      const e = Math.min(x + CW - colL, colR - x);
      return e > 0 ? Math.max(0, 1 - e / 60) : 1;   // за колонкой букв нет совсем
    };

    function drawBase() {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, innerWidth, innerHeight);
      bctx.font = font();
      bctx.textBaseline = "top";
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * CW;
        bctx.fillStyle = `rgba(${RGB},${(BASE_A * fadeAt(x)).toFixed(3)})`;
        bctx.fillText(grid[r * cols + c], x, r * CH);
      }
    }
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      for (const c of [cv, base]) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
      cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
      cols = Math.ceil(innerWidth / CW); rows = Math.ceil(innerHeight / CH);
      grid = Array.from({ length: cols * rows }, pick);
      const m = document.querySelector("main");
      if (m) { const r = m.getBoundingClientRect(); colL = r.left; colR = r.right; }
      drawBase();
    }
    let last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 66) return;              // движение очень медленное, 15 кадров в секунду хватает
      last = now;
      const t = now / 1000 * 0.06;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font();
      ctx.textBaseline = "top";
      for (let r = 0; r < rows; r++) {
        const ny = r / 9;
        for (let c = 0; c < cols; c++) {
          // вытянутые по горизонтали пятна, как строки кода
          const n = noise(c / 26, ny, t) * 0.7 + noise(c / 9, ny * 2.2, t * 1.7 + 40) * 0.3;
          let k = (n - 0.56) / 0.17;
          if (k <= 0) continue;
          k = Math.min(1, k);
          const i = r * cols + c;
          const x = c * CW;
          ctx.fillStyle = `rgba(${RGB},${(PEAK_A * k * fadeAt(x)).toFixed(3)})`;
          ctx.fillText(grid[i], x, r * CH);
        }
      }
    }
    addEventListener("resize", resize);
    resize();
    if (document.fonts) document.fonts.ready.then(drawBase);
    if (reduce) { ctx.drawImage(base, 0, 0); return; }
    requestAnimationFrame(frame);
  }

  /* ---------- печать: инициалы «раскрываются» в полное имя, потом стираются обратно ---------- */
  function makeTyper(el) {
    const out = document.createElement("span");
    out.className = "type";
    out.setAttribute("aria-hidden", "true");
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.setAttribute("aria-hidden", "true");
    el.textContent = "";
    el.append(out, caret);
    const set = (s) => { out.textContent = s; };
    // пока печатает — курсор горит ровно, на паузах мигает
    const busy = (on) => caret.classList.toggle("is-busy", on);
    async function type(from, to) {
      busy(true);
      let s = from;
      for (const ch of to) { s += ch; set(s); await sleep(ch === " " ? 120 : 70 + Math.random() * 60); }
      busy(false);
      return s;
    }
    async function erase(s, keep) {
      busy(true);
      while (s.length > keep) { s = s.slice(0, -1); set(s); await sleep(45); }
      busy(false);
      return s;
    }
    return { set, type, erase, caret };
  }
  // имя печатается по кругу, пока открыта страница: целиком → пауза → стирается → заново
  async function nameLoop(el) {
    const full = el.dataset.type;
    el.setAttribute("aria-label", full);
    const t = makeTyper(el);
    if (reduce) { t.set(full); return; }
    let s = full[0];                                     // первая буква сразу — хедер не мигает пустым
    t.set(s);
    for (;;) {
      await sleep(400);
      s = await t.type(s, full.slice(s.length));
      await sleep(2600);
      s = await t.erase(s, 1);
    }
  }
  // фраза в футере: печатается целиком, потом по кругу стирается и допечатывается только последнее слово —
  // смысл всегда понятен, а строка остаётся живой
  async function phraseLoop(el) {
    const full = el.dataset.type;
    el.setAttribute("aria-label", full);
    const t = makeTyper(el);
    if (reduce) { t.set(full); t.caret.classList.add("is-off"); return; }
    const keep = full.lastIndexOf(" ") + 1;              // «давайте поработаем |вместе»
    let s = await t.type("", full);
    for (;;) {
      await sleep(2800);
      s = await t.erase(s, keep);
      await sleep(350);
      s = await t.type(s, full.slice(keep));
    }
  }
  function typing() {
    document.querySelectorAll("[data-type]").forEach((el) => {
      if (el.dataset.typeWhen === "visible") {
        const full = el.dataset.type;
        el.setAttribute("aria-label", full);
        el.innerHTML = '<span class="type" aria-hidden="true"> </span>';  // место под строку, пока не начали
        const io = new IntersectionObserver((es) => {
          if (es.some((e) => e.isIntersecting)) { io.disconnect(); phraseLoop(el); }
        }, { threshold: 0.8 });
        io.observe(el);
      } else nameLoop(el);
    });
  }

  /* ---------- прототипы в телефонах: экраны из макетов, нажатие видно по самой кнопке ---------- */
  const DIMS = { vv: [1179, 2556], "bs-home": [1125, 4002], "bs-eye": [1125, 4002], "bs-eye-open": [1125, 4002], "bs-settings": [1125, 2436], "bs-hide": [1125, 2436] };
  const dims = (n) => DIMS[n] || DIMS[n.split("-")[0]];
  // press: [x, y, w, h, радиус, вид] в пикселях исходного макета; вид: light | green (темнеют) | dark (светлеет)
  const PROTOS = {
    "vv-catalog": [
      { show: "vv-3" }, { wait: 1400 },
      { press: [48, 480, 336, 110, 45, "light"] }, { go: "vv-4" }, { wait: 1500 },
      { press: [432, 1590, 312, 78, 39, "green"] }, { go: "vv-5" }, { wait: 2200 },
      { go: "vv-3" },
    ],
    "vv-cart": [
      { show: "vv-6" }, { wait: 1600 },
      { press: [60, 1580, 470, 80, 22, "light"] }, { go: "vv-8" }, { wait: 1400 },
      { press: [60, 1428, 501, 96, 48, "green"] }, { go: "vv-9" }, { wait: 1300 },
      { press: [0, 2280, 1179, 276, 0, "green"] }, { go: "vv-10" }, { wait: 2200 },
      { go: "vv-6" },
    ],
    "bs-eye": [
      { show: "bs-home" }, { wait: 1000 },
      { scroll: 470, dur: 1100 }, { wait: 500 },
      { go: "bs-eye-open", keep: true, dur: 380 }, { wait: 1000 },
      { press: [960, 1594, 90, 90, 45, "dark"] }, { go: "bs-eye", keep: true }, { wait: 1900 },
      { go: "bs-home", keep: true }, { wait: 500 },
      { scroll: 0, dur: 900 },
    ],
    "bs-settings": [
      { show: "bs-home" }, { wait: 900 },
      { scroll: 835, dur: 1500 }, { wait: 500 },
      { press: [589, 3218, 488, 401, 60, "light"] }, { go: "bs-settings", dur: 420 }, { wait: 1200 },
      { press: [45, 1770, 1035, 158, 40, "light"] }, { go: "bs-hide" }, { wait: 1500 },
      { press: [49, 1999, 1028, 161, 80, "dark"] }, { go: "bs-home", scrollTo: 835 }, { wait: 500 },
      { scroll: 0, dur: 1200 }, { wait: 300 },
    ],
  };
  const SRC = (n) => `img/proto/${n}.webp`;
  const anim = (el, kf, ms, easing = "cubic-bezier(.4,0,.2,1)") => el.animate(kf, { duration: ms, easing, fill: "forwards" }).finished;

  // все экраны прототипов грузим сразу при открытии страницы, а не когда телефон доскроллили
  function preloadProtos() {
    const need = new Set();
    document.querySelectorAll("[data-proto]").forEach((el) => {
      (PROTOS[el.dataset.proto] || []).forEach((st) => { if (st.show || st.go) need.add(st.show || st.go); });
    });
    if (document.querySelector("[data-shake]")) { need.add("bs-pin"); need.add("bs-home"); }
    need.forEach((n) => { const i = new Image(); i.decoding = "async"; i.src = SRC(n); });
  }

  function phone(el) {
    const steps = PROTOS[el.dataset.proto];
    const screen = el.querySelector(".phone__screen");
    let cur = null, y = 0, playing = false, running = false;
    const px = () => screen.clientWidth / 600;          // прокрутка задана в пикселях экрана шириной 600

    function layer(name, scrollPx = 0) {
      const s = document.createElement("div");
      s.className = "scr";
      s.dataset.name = name;
      const inner = document.createElement("div");
      inner.className = "scr__in";
      inner.style.transform = `translateY(${-scrollPx * px()}px)`;
      const img = new Image();
      img.src = SRC(name); img.alt = ""; img.decoding = "async";
      inner.append(img);
      s.append(inner);
      screen.append(s);
      return s;
    }
    // нажатие: кнопка чуть «проседает» и темнеет (тёмная — светлеет), курсора нет
    async function press([x, y0, w, h, r, kind]) {
      const name = cur.dataset.name, [W] = dims(name);
      const k = screen.clientWidth / W;
      const d = document.createElement("i");
      d.className = "press";
      const tint = kind === "dark" ? "rgba(255,255,255,.2)" : kind === "green" ? "rgba(0,0,0,.2)" : "rgba(0,0,0,.085)";
      Object.assign(d.style, {
        left: x * k + "px", top: y0 * k + "px", width: w * k + "px", height: h * k + "px", borderRadius: r * k + "px",
        backgroundImage: `linear-gradient(${tint},${tint}), url(${SRC(name)})`,
        backgroundSize: `100% 100%, ${screen.clientWidth}px auto`,
        backgroundPosition: `0 0, ${-x * k}px ${-y0 * k}px`,
      });
      cur.querySelector(".scr__in").append(d);
      await anim(d, [{ opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(.965)" }], 140);
      await sleep(260);
    }
    async function go(s) {
      const nextY = s.keep ? y : s.scrollTo || 0;
      const nx = layer(s.go, nextY);
      const old = cur;
      await anim(nx, [{ opacity: 0 }, { opacity: 1 }], s.dur || 320, "ease-in-out");
      old.remove();
      cur = nx; y = nextY;
    }
    async function scroll(to, dur) {
      const inner = cur.querySelector(".scr__in");
      const k = px();
      await anim(inner, [{ transform: `translateY(${-y * k}px)` }, { transform: `translateY(${-to * k}px)` }], dur);
      y = to;
    }
    async function loop() {
      if (running) return;
      running = true;
      await Promise.all([...new Set(steps.filter((s) => s.show || s.go).map((s) => s.show || s.go))]
        .map((n) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = SRC(n); })));
      for (;;) {
        for (const s of steps) {
          while (!playing) await sleep(200);
          if (s.show) { if (cur) cur.remove(); cur = layer(s.show); y = 0; }
          else if (s.wait) await sleep(s.wait);
          else if (s.press) await press(s.press);
          else if (s.go) await go(s);
          else if (s.scroll !== undefined) await scroll(s.scroll, s.dur || 1000);
        }
      }
    }
    cur = layer(steps[0].show);
    if (reduce) return;
    new IntersectionObserver((es) => {
      playing = es[0].isIntersecting;
      if (playing) loop();
    }, { threshold: 0.25 }).observe(el);
  }

  /* ---------- видео играют, только пока видны ---------- */
  function videos() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && !reduce) v.play().catch(() => {});
      else v.pause();
    }), { threshold: 0.3 });
    document.querySelectorAll("video[data-autoplay]").forEach((v) => io.observe(v));
  }

  /* ---------- вкладки опыта ---------- */
  function tabs() {
    document.querySelectorAll("[data-tabs]").forEach(tabBox);
  }
  function tabBox(box) {
    const btns = [...box.querySelectorAll('[role="tab"]')];
    const select = (b, focus) => {
      btns.forEach((x) => {
        const on = x === b;
        x.setAttribute("aria-selected", on);
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) b.focus();
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(b));
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(btns[(i + d + btns.length) % btns.length], true); }
      });
    });
  }


  /* ---------- ленты экранов: перетаскивание мышью (палец и колесо работают сами) ---------- */
  function strips() {
    document.querySelectorAll("[data-strip]").forEach((el) => {
      let x0 = 0, s0 = 0, down = false, moved = false;
      el.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") return;
        down = true; moved = false; x0 = e.clientX; s0 = el.scrollLeft;
      });
      addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 4) { moved = true; el.classList.add("is-drag"); }
        if (moved) el.scrollLeft = s0 - dx;
      });
      addEventListener("pointerup", () => { down = false; el.classList.remove("is-drag"); });
    });
  }

  /* ---------- результаты опроса: полоса из символов «заполняется», число считается ---------- */
  function bars() {
    // сколько символов влезает в ширину плашки (моноширинный шрифт: ~0.6em + межбуквенный 1px)
    const cols = (el) => Math.max(10, Math.floor(el.querySelector(".bar__g").clientWidth / (15 * 0.6 + 1)));
    const draw = (el, v) => {
      const N = cols(el), k = Math.round((v / 100) * N);
      el.querySelector(".bar__g").innerHTML = "█".repeat(k) + "<i>" + "░".repeat(N - k) + "</i>";
      el.querySelector(".bar__v").textContent = Math.round(v) + "%";
    };
    const all = [...document.querySelectorAll("[data-bar]")];
    all.forEach((el) => draw(el, reduce ? +el.dataset.bar : 0));
    if (reduce) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, to = +el.dataset.bar, t0 = performance.now(), d = 1100;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / d), q = 1 - Math.pow(1 - p, 3);
        draw(el, to * q);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    all.forEach((el) => io.observe(el));
  }

  /* ---------- схема флоу (ВкусВилл): проигрывается при прокрутке, можно повторить ---------- */
  function flowAnim() {
    document.querySelectorAll("[data-flowanim]").forEach((box) => {
      const stage = box.querySelector(".stage");
      const replay = box.querySelector(".s-flow__replay");
      let timers = [];
      const reset = () => {
        timers.forEach(clearTimeout); timers = [];
        box.classList.remove("is-s1", "is-s2", "is-s3", "is-done");
        stage.style.transform = "";
      };
      const play = () => {
        reset();
        void box.getBoundingClientRect();
        box.classList.add("is-s1");
        timers.push(setTimeout(() => box.classList.add("is-s2"), 4400));
        timers.push(setTimeout(() => {
          box.classList.add("is-s3");
          if (box.dataset.zoom) stage.style.transform = box.dataset.zoom;   // приближение — только если задано у схемы
        }, 7300));
        timers.push(setTimeout(() => box.classList.add("is-done"), 9700));
      };
      if (reduce) { box.classList.add("no-motion", "is-s1", "is-s2", "is-s3", "is-done"); return; }
      const io = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { io.disconnect(); play(); }
      }, { threshold: 0.5 });
      io.observe(box);
      if (replay) replay.addEventListener("click", play);
    });
  }

  /* ---------- БСПБ: встряхни телефон на экране пин-кода — балансы скрываются ---------- */
  function shakeDemo() {
    document.querySelectorAll("[data-shake]").forEach((box) => {
      const ph = box.querySelector(".phone");
      const screen = ph.querySelector(".phone__screen");
      const btn = box.querySelector(".shake__btn");
      const mk = (name) => {
        const s = document.createElement("div");
        s.className = "scr";
        const img = new Image(); img.src = SRC(name); img.alt = ""; s.append(img);
        return s;
      };
      const pin = mk("bs-pin");
      screen.append(pin);
      const dim = document.createElement("i"); dim.className = "sheet-dim";
      const sheet = document.createElement("div"); sheet.className = "sheet";
      sheet.innerHTML = "<span>Скрыть баланс всех счетов при входе</span><i>Отмена</i><i class=\"go\">Скрыть</i>";
      screen.append(dim, sheet);
      let state = "pin", busy = false;
      const run = async () => {
        if (busy) return;
        busy = true; btn.disabled = true;
        if (state === "home") {                        // вернуть исходное состояние
          screen.querySelector(".scr.home")?.remove();
          state = "pin"; btn.textContent = "встряхнуть"; busy = false; btn.disabled = false;
          return;
        }
        if (!reduce) { ph.classList.remove("is-shaking"); void ph.offsetWidth; ph.classList.add("is-shaking"); }
        await sleep(reduce ? 0 : 650);
        ph.classList.add("is-sheet");
        await sleep(1100);
        const go = sheet.querySelector(".go");
        go.style.transition = "filter .14s"; go.style.filter = "brightness(1.6)";
        await sleep(260);
        go.style.filter = "";
        const home = mk("bs-home"); home.classList.add("home"); home.style.opacity = 0;
        screen.insertBefore(home, dim);
        ph.classList.remove("is-sheet");
        await anim(home, [{ opacity: 0 }, { opacity: 1 }], 380, "ease-in-out");
        state = "home"; btn.textContent = "ещё раз"; busy = false; btn.disabled = false;
      };
      btn.addEventListener("click", async () => {
        // на iPhone доступ к датчику движения просят по нажатию
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function" && !box.dataset.asked) {
          box.dataset.asked = 1;
          try { await DeviceMotionEvent.requestPermission(); } catch (e) { /* без датчика — просто кнопкой */ }
        }
        run();
      });
      // настоящее встряхивание телефона, когда демо на экране
      let visible = false, last = 0;
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.5 }).observe(box);
      addEventListener("devicemotion", (e) => {
        const a = e.accelerationIncludingGravity;
        if (!visible || !a || state !== "pin") return;
        const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
        const now = Date.now();
        if (m > 24 && now - last > 1500) { last = now; run(); }
      });
    });
  }


  /* портрет и видео «за компьютером» — когда текущая страница загрузилась, тихо подтягиваем их в кэш,
     чтобы на главной и в «Обо мне» они появлялись сразу */
  addEventListener("load", () => {
    setTimeout(() => {
      ["video/avatar.mp4", "img/avatar-poster.jpg", "video/hero-desk.mp4", "img/hero-desk-poster.jpg"].forEach((u) => {
        if (document.querySelector('[src="' + u + '"], [poster="' + u + '"]')) return;   // уже есть на странице
        fetch(u, { priority: "low" }).catch(() => {});
      });
    }, 300);
  });

  // codeBackground();   // фон с буквами пока выключен — пробуем просто белый
  typing();
  // экраны телефонов подтягиваем сразу, но не раньше, чем стартует портрет / видео: первое впечатление важнее
  (function afterHero(run) {
    const hv = document.querySelector(".hero__media video");
    if (!hv || (hv.readyState >= 3 && !hv.paused)) return run();
    let done = false;
    const go = () => { if (!done) { done = true; run(); } };
    hv.addEventListener("playing", go, { once: true });
    setTimeout(go, 2500);
  })(preloadProtos);
  document.querySelectorAll("[data-proto]").forEach(phone);
  videos();
  tabs();
  strips();
  bars();
  flowAnim();
  shakeDemo();
})();
