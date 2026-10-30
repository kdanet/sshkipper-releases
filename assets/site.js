/* SSHKipper landing: the ASCII helm, and a camera over each replica of an app screen — it scales the fixed-size
   screen to its stage, moves to the part a story step talks about and rings it. Stories advance by themselves while on
   screen; a click on a step jumps to it. With reduced motion nothing moves by itself. Plain script, no dependencies. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var A = new URL('.', document.currentScript.src).href; // assets/ folder
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = window.matchMedia('(max-width: 640px)');
  var $$ = function (el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function Timeline() { this.ids = []; }
  Timeline.prototype.at = function (ms, fn) { this.ids.push(setTimeout(fn, ms)); };
  Timeline.prototype.stop = function () { this.ids.forEach(clearTimeout); this.ids = []; };

  /* ---------- ASCII helm (the logo drawn in characters, slowly turning) ---------- */
  (function helm() {
    var box = document.getElementById('helm');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', '<div class="k-helm-art" aria-hidden="true"><pre class="w"></pre><pre class="blue"></pre></div><pre class="sea" aria-hidden="true"></pre>');
    var W = box.querySelector('.w'), B = box.querySelector('.blue'), S = box.querySelector('.sea');
    var img = new Image(); img.src = A + 'mark-white.svg';
    var COLS = 76, ROWS = 42, SEA = 5, ramp = ' .:-=+*#%@';
    var cv = document.createElement('canvas'); cv.width = COLS; cv.height = COLS;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var a = 0, f = 0;
    function draw() {
      if (!img.complete || !img.naturalWidth) return;
      ctx.clearRect(0, 0, COLS, COLS); ctx.save(); ctx.translate(COLS / 2, COLS / 2); ctx.rotate(a);
      ctx.drawImage(img, -COLS * 0.46, -COLS * 0.46, COLS * 0.92, COLS * 0.92); ctx.restore();
      var d = ctx.getImageData(0, 0, COLS, COLS).data, w = '', b = '', s = '';
      for (var y = 0; y < ROWS; y++) {
        var sy = Math.floor(y * COLS / ROWS);
        for (var x = 0; x < COLS; x++) {
          var i = (sy * COLS + x) * 4, al = d[i + 3] / 255;
          if (al < 0.08) { w += ' '; b += ' '; continue; }
          var k = Math.round(al * 6 + Math.sin(x * 0.35 + y * 0.25 + f * 0.25) * 1.6);
          k = Math.max(1, Math.min(ramp.length - 1, k));
          if (d[i + 2] > d[i] + 60) { w += ' '; b += ramp[k]; } else { w += ramp[k]; b += ' '; }
        }
        w += '\n'; b += '\n';
      }
      for (var yy = 0; yy < SEA; yy++) {
        for (var xx = 0; xx < COLS; xx++) {
          var v = Math.sin(xx * 0.28 - f * 0.18 + yy * 1.3) + Math.sin(xx * 0.11 + f * 0.07);
          s += v > 0.9 - yy * 0.25 ? '~' : v > 0.2 ? '-' : ' ';
        }
        s += '\n';
      }
      W.textContent = w; B.textContent = b; S.textContent = s;
      a += 0.012; f++;
    }
    img.onload = draw;
    var id = 0;
    var go = function () { if (!id && !REDUCE) id = setInterval(draw, 80); };
    var halt = function () { clearInterval(id); id = 0; };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? go() : halt(); }).observe(box); else go();
  })();

  /* ---------- Camera ---------- */
  // A rectangle in replica points (the union of the matches). The app's own scale right now — also in the middle of a
  // camera move — comes from its drawn width, so inner transforms (a canvas at 60 %) are counted as drawn.
  function rect(app, sel) {
    var a = app.getBoundingClientRect(), k = a.width / app.offsetWidth, r = null;
    if (!k) return null;
    $$(app, sel).forEach(function (n) {
      var b = n.getBoundingClientRect();
      // a terminal line is as wide as the terminal: frame its text, not the empty rest of the row
      if (n.classList.contains('tl')) {
        var rg = document.createRange(); rg.selectNodeContents(n); var t = rg.getBoundingClientRect();
        if (t.width) b = { left: t.left, right: t.right, top: b.top, bottom: b.bottom, width: t.width, height: b.height };
      }
      if (!b.width && !b.height) return;
      var x = (b.left - a.left) / k, y = (b.top - a.top) / k, x2 = (b.right - a.left) / k, y2 = (b.bottom - a.top) / k;
      r = r ? { x: Math.min(r.x, x), y: Math.min(r.y, y), x2: Math.max(r.x2, x2), y2: Math.max(r.y2, y2) } : { x: x, y: y, x2: x2, y2: y2 };
    });
    if (r) { r.w = r.x2 - r.x; r.h = r.y2 - r.y; }
    return r;
  }

  function Cam(el) {
    this.el = el; this.app = el.querySelector('.app');
    this.W = +el.dataset.w; this.H = +el.dataset.h;
    this.steps = JSON.parse(el.dataset.steps);
    this.i = 0; while (this.i < this.steps.length - 1 && !this.steps[this.i]) this.i++;
    this.ring = this.app.querySelector('.k-ring'); this.tap = this.app.querySelector('.k-tap');
  }
  Cam.prototype.place = function (animate) {
    var st = this.steps[this.i], el = this.el, phone = PHONE.matches;
    if (!st || !el.clientWidth) return;
    // mfocus — what a phone frames instead, when the whole focus is too tall for its short screen
    var R = rect(this.app, this.focus || (phone && st.mfocus) || st.focus) || { x: 0, y: 0, w: this.W, h: this.H };
    var cw = el.clientWidth, zoom, auto = false;
    if (phone && st.mzoom) zoom = st.mzoom;
    else if (st.zoom) zoom = st.zoom;
    else {
      // The frame fits the whole focus with a margin, but never enlarges the screen past a readable size.
      var pad = phone ? 10 : (st.pad != null ? st.pad : 28), ar = cw / el.clientHeight;
      zoom = Math.max(R.w + 2 * pad, (R.h + 2 * pad) * ar, cw / (phone ? 1 : (st.ms || 1.5)));
      auto = true;
    }
    var s = cw / zoom;
    if (st.fit) { var p0 = (zoom - R.w) / 2; el.style.aspectRatio = 'auto'; el.style.height = Math.round((R.h + 2 * p0) * s) + 'px'; }
    var vh = el.clientHeight / s, edge = auto ? 0 : 10;
    // ax — the left edge in replica points (lines of text read from their start, not from their middle)
    var ax = phone && st.max != null ? st.max : st.ax;
    var tx = zoom >= this.W ? (this.W - zoom) / 2 : clamp(ax != null ? ax : R.x + R.w / 2 - zoom / 2, -edge, this.W - zoom + edge);
    var ty = vh >= this.H ? (this.H - vh) / 2 : clamp(R.y + R.h / 2 - vh / 2, 0, this.H - vh);
    el.classList.toggle('moving', !!animate && !REDUCE);
    this.app.style.transform = 'scale(' + s.toFixed(4) + ') translate(' + (-tx).toFixed(1) + 'px,' + (-ty).toFixed(1) + 'px)';
    this.ringOn(this.ringShown);
  };
  // A scene may point the camera somewhere else within its step (focus and ring selectors); null — back to the step's.
  Cam.prototype.look = function (focus, ring) { this.focus = focus; this.ringSel = ring; this.place(true); };
  Cam.prototype.ringOn = function (on) {
    this.ringShown = !!on;
    var st = this.steps[this.i], sel = this.ringSel || (st && st.ring), R = on && sel && rect(this.app, sel);
    if (!R) { this.ring.classList.remove('on'); return; }
    // lines of text sit tight: a ring around some of them keeps clear of the lines above and below
    var lines = $$(this.app, sel).every(function (n) { return n.classList.contains('tl'); });
    var p = 6, py = lines ? 1 : p, g = this.ring;
    // a ring that appears doesn't fly in from where it was last time; one that is on follows its target
    if (!g.classList.contains('on')) { g.style.transition = 'opacity .4s ease'; void g.offsetWidth; }
    this.ring.style.left = (R.x - p) + 'px'; this.ring.style.top = (R.y - py) + 'px';
    this.ring.style.width = (R.w + 2 * p) + 'px'; this.ring.style.height = (R.h + 2 * py) + 'px';
    g.classList.add('on');
    if (g.style.transition) { void g.offsetWidth; g.style.transition = ''; }
  };
  Cam.prototype.tapAt = function (sel) {
    var R = rect(this.app, sel); if (!R || REDUCE) return;
    var t = this.tap;
    t.style.left = (R.x + Math.min(70, R.w / 2)) + 'px'; t.style.top = (R.y + R.h / 2) + 'px';
    t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
  };

  // tmux's sessions menu drops down from the tab's «tmux · Session 1» mark, wherever the status text puts it
  function alignMenus() {
    $$(document, '.tmx').forEach(function (main) {
      var k = main.querySelector('.js-tm'), m = main.querySelector('.tm-menu'), app = main.closest('.app');
      var s = app && app.getBoundingClientRect().width / app.offsetWidth;
      if (!k || !m || !s) return;
      var kr = k.getBoundingClientRect(), mr = main.getBoundingClientRect();
      m.style.left = Math.round((kr.left - mr.left) / s - 12) + 'px';
      m.style.top = Math.round((kr.bottom - mr.top) / s + 5) + 'px';
    });
  }
  alignMenus();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alignMenus(); layout(); });

  var cams = $$(document, '.k-cam').map(function (el) { var c = new Cam(el); el._cam = c; return c; });
  function layout() { alignMenus(); cams.forEach(function (c) { c.place(false); c.ringOn(c.ringShown); }); }
  layout();
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(layout); cams.forEach(function (c) { ro.observe(c.el); }); }
  else window.addEventListener('resize', layout);
  if (PHONE.addEventListener) PHONE.addEventListener('change', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // The navigation gets its hairline once the page scrolls.
  var nav = document.querySelector('.k-nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Things come in as you reach them (CSS does the motion; without IntersectionObserver they're simply there).
  var rvs = $$(document, '.rv');
  if ('IntersectionObserver' in window && !REDUCE) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (x) { rio.observe(x); });
  } else rvs.forEach(function (x) { x.classList.add('in'); });

  // The navigation marks the section you are reading.
  var links = $$(document, '.k-nav nav a'), spy = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });
  if (links.length) {
    var spyRaf = 0;
    var mark = function () {
      spyRaf = 0;
      var cur = -1, y = window.innerHeight * 0.35;
      spy.forEach(function (sec, i) { if (sec && sec.getBoundingClientRect().top < y && sec.getBoundingClientRect().bottom > y) cur = i; });
      links.forEach(function (l, i) { l.classList.toggle('cur', i === cur); });
    };
    window.addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(mark); }, { passive: true });
    mark();
  }

  // The services page's segmented control: the pill slides under the section shown.
  var VIEWS = ['dash', 'nginx', 'docker', 'sup', 'cron', 'sec'];
  function seg(app, key) {
    var pill = app.querySelector('.segpill'), el = app.querySelector('.js-' + key);
    if (pill && el) { pill.style.left = el.offsetLeft + 'px'; pill.style.width = el.offsetWidth + 'px'; }
    app.dataset.v = key;
  }
  $$(document, '.app.page').forEach(function (app) { seg(app, 'dash'); });

  function lines(app) { return $$(app, '.w-term .tl'); }
  // Adds a class to each element in turn; returns when the last one happens.
  function reveal(list, tl, gap, t0, cls) {
    var t = t0 || 0;
    list.forEach(function (l, k) { tl.at(t, function () { l.classList.add(cls || 'in'); }); t += typeof gap === 'function' ? gap(k) : gap; });
    return t;
  }

  /* ---------- Hero: the main window connects through two bastions, once ---------- */
  var hero = document.querySelector('.k-hero-win');
  if (hero && !REDUCE) {
    var happ = hero.querySelector('.app'), htl = new Timeline();
    happ.classList.add('play');
    var ht = reveal(lines(happ), htl, function (i) { return i < 4 ? 650 : 60; }, 700);
    htl.at(ht + 150, function () { happ.classList.add('done'); });
  } else if (hero) hero.querySelector('.app').classList.add('done');

  // The live hero window (demo.js) comes only where it runs: a pointer and room for the whole window
  var live = document.querySelector('.k-live-src');
  if (live && matchMedia('(hover: hover) and (pointer: fine) and (min-width: 861px)').matches) {
    var sc = document.createElement('script'); sc.src = live.dataset.js; sc.defer = true; document.head.appendChild(sc);
  }

  /* ---------- Stories ---------- */
  // What each step plays: the replica's state at the start of the step, then its little animation.
  // fn(app, tl, cam, story); cam.ringOn(true) shows the ring once the step's point is on screen.
  var SCENES = {
    bastions: [
      function (app, tl, cam) {
        app.classList.add('play'); app.classList.remove('done');
        lines(app).forEach(function (l) { l.classList.remove('in'); });
        tl.at(1150, function () { cam.ringOn(true); cam.tapAt('.a-row.sel'); });
      },
      function (app, tl, cam, story) {
        app.classList.add('play'); app.classList.remove('done');
        lines(app).forEach(function (l) { l.classList.remove('in'); });
        var t = reveal(lines(app).slice(0, 4), tl, 750, 900);
        reveal($$(story, '.k-hop'), tl, 750, 900, 'lit');   // the path card, in step with the terminal lines
        tl.at(t + 100, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) {
        app.classList.add('play', 'done');
        lines(app).forEach(function (l, i) { if (i < 4) l.classList.add('in'); });
        reveal(lines(app).slice(4), tl, 60, 300);
        tl.at(1150, function () { cam.ringOn(true); });
      }
    ],
    agent: [
      // the panel: the question, then the agent's steps one by one
      function (app, tl, cam) {
        app.classList.add('play');
        $$(app, '.in').forEach(function (x) { x.classList.remove('in'); });
        reveal($$(app, '.js-step'), tl, 600, 900);
        tl.at(1500, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) {
        app.classList.add('play');
        $$(app, '.js-card, .js-wait, .js-cmd').forEach(function (x) { x.classList.remove('in'); });
        $$(app, '.js-step').forEach(function (x) { x.classList.add('in'); });
        var t = reveal($$(app, '.js-cmd'), tl, 700, 1100);
        tl.at(t, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) {
        app.classList.add('play');
        $$(app, '.js-step').forEach(function (x) { x.classList.add('in'); });
        $$(app, '.js-card, .js-wait').forEach(function (x) { x.classList.remove('in'); });
        reveal($$(app, '.js-card, .js-wait'), tl, 0, 1100);
        tl.at(1400, function () { cam.ringOn(true); });
      },
      // the second model's verdict arrives in the card a moment after it
      function (app, tl, cam) {
        var rv = app.querySelector('.js-rv');
        app.classList.add('play'); rv.classList.remove('in');
        tl.at(1200, function () { rv.classList.add('in'); });
        tl.at(1700, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) { tl.at(1150, function () { cam.ringOn(true); }); },
      // asked in words: the agent looks around, canvas_show opens the tab, the scene plays step by step
      function (app, tl, cam) {
        var bar = app.querySelector('.js-cvbar'), S = JSON.parse(bar.dataset.steps), wk = app.querySelector('.js-wk');
        function step(k) {
          $$(app, '[data-s]').forEach(function (n) {
            var s = +n.dataset.s;
            n.classList.toggle('cs-in', s <= k);
            n.classList.toggle('cs-hl', s === k || (n.dataset.h || '') === String(k));
          });
          wk.classList.toggle('warn', k === S.length);
          if (!k) return;
          // a phone can't read the whole canvas: its camera rides from step to step, like the app's does
          if (PHONE.matches) cam.look('.cv-n.cs-hl', '.cv-n.cs-hl');
          app.querySelector('.js-cvk').textContent = bar.dataset.of.replace('{}', k);
          app.querySelector('.js-cvt').textContent = S[k - 1][0]; app.querySelector('.js-cvd').textContent = S[k - 1][1];
        }
        app.classList.add('play'); app.classList.remove('shown');
        $$(app, '.js-step, .js-ans').forEach(function (x) { x.classList.remove('in'); });
        step(0);
        tl.at(600, function () { cam.ringOn(true); });
        var t = reveal($$(app, '.js-step'), tl, 650, 1300);
        tl.at(t + 200, function () {
          app.classList.add('shown'); step(1);
          cam.ringOn(false); if (!PHONE.matches) cam.look(null, '.js-cvk, .js-cvt, .js-cvd');
        });
        tl.at(t + 700, function () { cam.ringOn(true); });
        for (var k = 2; k <= S.length; k++) (function (k) { tl.at(t + 200 + (k - 1) * 1250, function () { step(k); }); })(k);
        tl.at(t + 200 + (S.length - 1) * 1250 + 400, function () { app.querySelector('.js-ans').classList.add('in'); });
      },
      // the slider moves: the formula under it recounts the memory, no new question to the model
      function (app, tl, cam) {
        var th = app.querySelector('.js-wk'), tr = app.querySelector('.js-wt'), n = app.querySelector('.js-wn'), m = app.querySelector('.js-wm');
        var ru = (document.documentElement.lang || 'ru') === 'ru';
        function set(k) {
          var p = (k - 1) / 5 * 100;
          th.style.left = p + '%'; tr.style.width = p + '%'; n.textContent = k;
          m.textContent = (k * 0.4).toFixed(1).replace('.', ru ? ',' : '.') + (ru ? ' ГБ' : ' GB');
        }
        set(2);
        tl.at(1300, function () { cam.ringOn(true); });
        [3, 4, 5, 4].forEach(function (k, i) { tl.at(2000 + i * 900, function () { set(k); }); });
      },
      // an external agent calls SSHKipper's tools, line by line
      function (app, tl, cam) {
        app.classList.add('play');
        var ls = $$(app, '.js-ml');
        ls.forEach(function (l) { l.classList.remove('in'); });
        var t = reveal(ls, tl, 450, 900);
        tl.at(t, function () { cam.ringOn(true); });
      }
    ],
    terminal: [
      function (app, tl, cam) { app.classList.remove('menu'); tl.at(1150, function () { cam.ringOn(true); }); },
      // the tab's mark opens its sessions menu
      function (app, tl, cam) { app.classList.remove('menu'); tl.at(900, function () { app.classList.add('menu'); }); tl.at(1300, function () { cam.ringOn(true); }); },
      // a command is made (name, command), the servers are ticked, then the group runs: four at a time, one by one
      function (app, tl, cam) {
        var rows = $$(app, '.js-sn'), checks = $$(app, '.js-snc'), code = app.querySelector('.js-sncmd'), text = code.dataset.text;
        var k = app.querySelector('.js-snk'), n = app.querySelector('.js-snn'), phone = PHONE.matches, done = 0;
        function phase(p) { app.classList.remove('sn-p-ed', 'sn-p-pk', 'sn-p-run'); if (p) app.classList.add('sn-p-' + p); }
        function count(c) {
          var f = n.dataset.of.split('|'), m = c % 10, h = c % 100;
          n.textContent = (m === 1 && h !== 11 ? f[2] : m >= 2 && m <= 4 && (h < 12 || h > 14) ? f[1] : f[0]).replace('{}', c);
        }
        function st(i, v) { rows[i].dataset.st = v; if (v !== 'w' && v !== 'c') { done++; k.textContent = k.dataset.of.replace('{}', done); } }
        app.classList.add('play', 'sn-going'); app.classList.remove('sn-made', 'sn-typing'); phase(null);
        $$(app, '.press').forEach(function (b) { b.classList.remove('press'); });
        checks.forEach(function (c) { c.classList.remove('in'); }); count(0);
        rows.forEach(function (r) { r.dataset.st = 'w'; }); k.textContent = k.dataset.of.replace('{}', 0);
        code.textContent = '';
        // the editor: the command is typed, «Create» puts the node in the tree
        tl.at(500, function () { phase('ed'); app.classList.add('sn-typing'); cam.look(phone ? '.sn-ed' : null, '.sn-ed'); });
        tl.at(800, function () { cam.ringOn(true); });
        var t = 900;
        for (var i = 1; i <= text.length; i++) (function (c) { tl.at(t + c * 42, function () { code.textContent = text.slice(0, c); }); })(i);
        t += text.length * 42 + 350;
        tl.at(t, function () { app.querySelector('.js-snok').classList.add('press'); });
        tl.at(t + 300, function () { phase(null); app.classList.remove('sn-typing'); app.classList.add('sn-made'); cam.ringOn(false); });
        // the picker: the servers get ticked, «Run…»
        tl.at(t + 700, function () { phase('pk'); cam.look(phone ? '.sn-pk' : null, '.sn-pk .snx-ls'); });
        tl.at(t + 900, function () { cam.ringOn(true); });
        checks.forEach(function (c, i) { tl.at(t + 1000 + i * 180, function () { c.classList.add('in'); count(i + 1); }); });
        t += 1000 + checks.length * 180 + 350;
        tl.at(t, function () { app.querySelector('.js-snrun').classList.add('press'); });
        // the «Command» tab: four connect at once, the fifth waits for a free slot
        tl.at(t + 300, function () { phase('run'); cam.ringOn(false); cam.look(phone ? '.sn' : null, null); });
        tl.at(t + 600, function () { [0, 1, 2, 3].forEach(function (i) { rows[i].dataset.st = 'c'; }); });
        tl.at(t + 1300, function () { st(3, 'ok'); rows[4].dataset.st = 'c'; });
        tl.at(t + 1600, function () { st(0, 'ok'); });
        tl.at(t + 1800, function () { st(1, 'ok'); });
        tl.at(t + 2100, function () { st(2, 'ok'); });
        tl.at(t + 3300, function () { st(4, 'bad'); app.classList.remove('sn-going'); cam.ringOn(true); });
      },
      // typed once, run in both panes
      function (app, tl, cam) {
        var typed = $$(app, '.js-typed'), outs = $$(app, '.js-out');
        app.classList.add('play'); app.classList.remove('ran');
        typed.forEach(function (x) { x.textContent = ''; });
        outs.forEach(function (o) { o.classList.remove('in'); });
        var word = 'uptime', t = 900;
        for (var i = 1; i <= word.length; i++) (function (k) { tl.at(t + k * 140, function () { typed.forEach(function (x) { x.textContent = word.slice(0, k); }); }); })(i);
        t += word.length * 140 + 500;
        tl.at(t, function () { app.classList.add('ran'); outs.forEach(function (o) { o.classList.add('in'); }); cam.ringOn(true); });
      }
    ],
    tunnels: [
      null,
      // the switch goes on, the port appears
      function (app, tl, cam) {
        var sw = $$(app, '.js-tw');
        app.classList.add('play'); sw.forEach(function (x) { x.classList.remove('on'); });
        tl.at(1100, function () { sw.forEach(function (x) { x.classList.add('on'); }); });
        tl.at(1500, function () { cam.ringOn(true); });
      },
      null
    ],
    services: VIEWS.map(function (v, i) {
      return function (app, tl, cam) {
        seg(app, v);
        if (v === 'sec') {
          tl.at(1150, function () { cam.ringOn(true); });
          tl.at(3000, function () { cam.ringOn(false); cam.look('.v-sec .fwh.f2, .v-sec .fpc, .v-sec .fpw', '.v-sec .fpath'); });
          tl.at(3700, function () { cam.ringOn(true); });
        } else tl.at(1150, function () { cam.ringOn(true); });
      };
    }),
    databases: [
      function (app, tl, cam) {
        var tx = app.querySelector('.js-type .tx');
        app.classList.add('play'); app.classList.remove('typed', 'applied'); if (tx) tx.textContent = '';
        tl.at(1150, function () { cam.ringOn(true); });
      },
      // words in the AI filter become WHERE, the grid shows the filtered rows
      function (app, tl, cam) {
        var box = app.querySelector('.js-type'), tx = box.querySelector('.tx'), text = box.dataset.text;
        app.classList.add('play'); app.classList.remove('typed', 'applied'); tx.textContent = '';
        var t = 900;
        for (var i = 1; i <= text.length; i++) (function (k) { tl.at(t + k * 50, function () { tx.textContent = text.slice(0, k); }); })(i);
        t += text.length * 50 + 500;
        tl.at(t, function () { app.classList.add('typed'); cam.ringOn(true); });
        tl.at(t + 1100, function () { app.classList.add('applied'); });
      },
      // «Compose»: the task is typed, the SQL is inserted line by line and stays selected — not run
      function (app, tl, cam) {
        var task = app.querySelector('.js-task'), text = task.dataset.text, ql = $$(app, '.js-ql');
        app.classList.add('play'); app.classList.remove('done'); task.textContent = '';
        ql.forEach(function (l) { l.classList.remove('in', 'lit'); });
        var t = 700;
        for (var i = 1; i <= text.length; i++) (function (k) { tl.at(t + k * 32, function () { task.textContent = text.slice(0, k); }); })(i);
        t += text.length * 32 + 600;
        t = reveal(ql, tl, 120, t);
        tl.at(t, function () { ql.forEach(function (l) { l.classList.add('lit'); }); app.classList.add('done'); cam.ringOn(true); });
      },
      function (app, tl, cam) {
        var pop = app.querySelector('.js-pop');
        app.classList.add('play'); pop.classList.remove('in');
        tl.at(1000, function () { pop.classList.add('in'); });
        tl.at(1300, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) { tl.at(1150, function () { cam.ringOn(true); }); }
    ],
    automations: [
      function (app, tl, cam) {
        app.classList.add('play'); app.classList.remove('done');
        $$(app, '.js-ac').forEach(function (c) { c.classList.remove('ok'); });
        tl.at(1150, function () { cam.ringOn(true); });
      },
      // the AI draft (its own camera): a still screen with the ring
      null,
      // the morning check runs: the server, the three checks at once, AI, the summary
      function (app, tl, cam) {
        var cards = $$(app, '.js-ac');
        app.classList.add('play'); app.classList.remove('done');
        cards.forEach(function (c) { c.classList.remove('ok'); });
        var at = [900, 1700, 1700, 1700, 2900, 3700];
        cards.forEach(function (c, i) { tl.at(at[i] || 900, function () { c.classList.add('ok'); }); });
        tl.at(4000, function () { app.classList.add('done'); cam.ringOn(true); });
      },
      function (app, tl, cam) {
        app.classList.add('play', 'done');
        $$(app, '.js-ac').forEach(function (c) { c.classList.add('ok'); });
        tl.at(1150, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) {
        var cards = $$(app, '.js-ac'), chips = $$(app, '.js-chip');
        app.classList.add('play'); app.classList.remove('done');
        cards.forEach(function (c) { c.classList.remove('ok'); });
        chips.forEach(function (c) { c.classList.remove('in'); });
        // the camera follows the run along the chain: each module turns green with its result
        cards.forEach(function (c, i) { c.setAttribute('data-n', i); });
        var t = 1100;
        cards.forEach(function (c, i) {
          var sel = '.js-ac[data-n="' + i + '"]';
          tl.at(t, function () {
            c.classList.add('ok'); chips.forEach(function (ch) { if (+ch.dataset.at === i) ch.classList.add('in'); });
            cam.look(sel, sel);
          });
          // the card grows to show its result (.35 s): the ring comes once it has, so it wraps the card whole
          tl.at(t + 380, function () { cam.ringOn(true); });
          t += 1000;
        });
        tl.at(t + 200, function () { app.classList.add('done'); cam.look(null, null); });
      }
    ]
  };
  // With reduced motion each step shows its final state.
  var FINAL = {
    bastions: function (app, i) { app.classList.toggle('done', i === 2); app.classList.toggle('play', i === 0); lines(app).forEach(function (l) { l.classList.add('in'); }); },
    agent: function (app) { app.classList.remove('play'); $$(app, '.js-rv').forEach(function (x) { x.classList.add('in'); }); },
    services: function (app, i) { seg(app, VIEWS[i]); },
    databases: function (app) { app.classList.remove('play'); },
    terminal: function (app, i) { if (!app.classList.contains('win')) app.classList.remove('play'); app.classList.toggle('menu', i === 1); },
    tunnels: function (app) { app.classList.remove('play'); $$(app, '.js-tw').forEach(function (x) { x.classList.add('on'); }); },
    automations: function (app) { app.classList.remove('play'); }
  };

  $$(document, '.k-story').forEach(function (story) {
    var id = story.dataset.story, scenes = SCENES[id] || [];
    var scams = $$(story, '.k-cam').map(function (el) { return el._cam; }), btns = $$(story, '.k-step');
    var path = story.querySelector('.k-hops');
    var tl = new Timeline(), cur = 0, visible = false;
    var DUR = btns.map(function (b, i) { return id === 'bastions' && i === 1 ? 6000 : id === 'automations' && i === 4 ? 9500 : id === 'databases' && i === 2 ? 8000 : id === 'terminal' && i === 2 ? 10500 : id === 'agent' && i === 5 ? 10500 : id === 'agent' && (i === 6 || i === 7) ? 7000 : id === 'services' && i === 5 ? 8000 : 5400; });
    function go(i, auto) {
      tl.stop(); cur = i;
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); b.classList.remove('run'); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      var cam = scams.filter(function (c) { return c.steps[i]; })[0];
      scams.forEach(function (c) { c.el.classList.toggle('on', c === cam); c.focus = c.ringSel = null; c.ringOn(false); });
      if (path) { path.classList.toggle('on', i === 1); $$(path, '.k-hop').forEach(function (h) { h.classList.toggle('lit', REDUCE); }); }
      cam.i = i;
      if (REDUCE) { (FINAL[id] || function () {})(cam.app, i); cam.place(false); cam.ringOn(true); return; }
      if (scenes[i]) scenes[i](cam.app, tl, cam, story);
      else tl.at(1150, function () { cam.ringOn(true); });   // a still screen: only the ring
      cam.place(true);
      if (!auto) return;
      var b = btns[i]; b.style.setProperty('--dur', DUR[i] + 'ms'); void b.offsetWidth; b.classList.add('run');
      tl.at(DUR[i], function () { go((i + 1) % btns.length, true); });
    }
    btns.forEach(function (b, k) { b.addEventListener('click', function () { go(k, visible); }); });
    go(0, false);
    if (REDUCE || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      var was = visible; visible = es[0].isIntersecting;
      if (visible && !was) go(cur, true);
      else if (!visible && was) { tl.stop(); btns.forEach(function (b) { b.classList.remove('run'); }); }
    }, { threshold: 0.45 }).observe(story.querySelector('.k-story-vis'));
  });
})();
