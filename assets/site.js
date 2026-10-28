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
    var st = this.steps[this.i], el = this.el;
    if (!st || !el.clientWidth) return;
    var zoom = (PHONE.matches && st.mzoom) || st.zoom;
    var R = rect(this.app, this.focus || st.focus) || { x: 0, y: 0, w: this.W, h: this.H };
    var s = el.clientWidth / zoom;
    if (st.fit) { var pad = (zoom - R.w) / 2; el.style.aspectRatio = 'auto'; el.style.height = Math.round((R.h + 2 * pad) * s) + 'px'; }
    var vh = el.clientHeight / s;
    // ax — the left edge in replica points (lines of text read from their start, not from their middle)
    var ax = PHONE.matches && st.max != null ? st.max : st.ax;
    var tx = zoom >= this.W ? (this.W - zoom) / 2 : clamp(ax != null ? ax : R.x + R.w / 2 - zoom / 2, -10, this.W - zoom + 10);
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
    var p = 6;
    this.ring.style.left = (R.x - p) + 'px'; this.ring.style.top = (R.y - p) + 'px';
    this.ring.style.width = (R.w + 2 * p) + 'px'; this.ring.style.height = (R.h + 2 * p) + 'px';
    this.ring.classList.add('on');
  };
  Cam.prototype.tapAt = function (sel) {
    var R = rect(this.app, sel); if (!R || REDUCE) return;
    var t = this.tap;
    t.style.left = (R.x + Math.min(70, R.w / 2)) + 'px'; t.style.top = (R.y + R.h / 2) + 'px';
    t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
  };

  var cams = $$(document, '.k-cam').map(function (el) { var c = new Cam(el); el._cam = c; return c; });
  function layout() { cams.forEach(function (c) { c.place(false); }); }
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

  // The services page's segmented control: its pill sits under «Dashboard» or «Nginx».
  function seg(app, nginx) {
    var pill = app.querySelector('.segpill'), el = app.querySelector(nginx ? '.js-nginx' : '.js-dash');
    if (pill && el) { pill.style.left = el.offsetLeft + 'px'; pill.style.width = el.offsetWidth + 'px'; }
    app.classList.toggle('nginx', !!nginx);
  }
  $$(document, '.app.page').forEach(function (app) { if (!app.classList.contains('frag')) seg(app, false); });

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
      function (app, tl, cam) {
        app.classList.add('play');
        $$(app, '.in').forEach(function (x) { x.classList.remove('in'); });
        reveal($$(app, '.js-step'), tl, 600, 1000);
        tl.at(1600, function () { cam.ringOn(true); });
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
        $$(app, '.js-step, .js-cmd').forEach(function (x) { x.classList.add('in'); });
        $$(app, '.js-card, .js-wait').forEach(function (x) { x.classList.remove('in'); });
        reveal($$(app, '.js-card, .js-wait'), tl, 0, 1100);
        tl.at(1400, function () { cam.ringOn(true); });
      }
    ],
    services: [
      function (app, tl, cam) { seg(app, false); tl.at(1150, function () { cam.ringOn(true); }); },
      function (app, tl, cam) { seg(app, false); tl.at(700, function () { seg(app, true); }); tl.at(1500, function () { cam.ringOn(true); }); },
      function (app, tl, cam) {
        var box = app.querySelector('.js-type'), tx = box.querySelector('.tx'), text = box.dataset.text;
        app.classList.add('play'); app.classList.remove('typed', 'applied'); tx.textContent = '';
        var t = 900;
        for (var i = 1; i <= text.length; i++) (function (k) { tl.at(t + k * 50, function () { tx.textContent = text.slice(0, k); }); })(i);
        t += text.length * 50 + 500;
        tl.at(t, function () { app.classList.add('typed'); cam.ringOn(true); });
        tl.at(t + 1100, function () { app.classList.add('applied'); });
      }
    ],
    automations: [
      function (app, tl, cam) {
        app.classList.add('play'); app.classList.remove('done');
        $$(app, '.js-ac').forEach(function (c) { c.classList.remove('ok'); });
        $$(app, '.js-chip').forEach(function (c) { c.classList.remove('in'); });
        tl.at(1150, function () { cam.ringOn(true); });
      },
      function (app, tl, cam) { tl.at(1150, function () { cam.ringOn(true); }); },
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
            cam.look(sel, sel); cam.ringOn(true);
          });
          t += 1000;
        });
        tl.at(t + 200, function () { app.classList.add('done'); cam.look(null, null); });
      }
    ]
  };
  // With reduced motion each step shows its final state.
  var FINAL = {
    bastions: function (app, i) { app.classList.toggle('done', i === 2); app.classList.toggle('play', i === 0); lines(app).forEach(function (l) { l.classList.add('in'); }); },
    agent: function (app) { app.classList.remove('play'); },
    services: function (app, i) { if (app.classList.contains('page')) seg(app, i === 1); else app.classList.remove('play'); },
    automations: function (app) { app.classList.remove('play'); }
  };

  $$(document, '.k-story').forEach(function (story) {
    var id = story.dataset.story, scenes = SCENES[id] || [];
    var scams = $$(story, '.k-cam').map(function (el) { return el._cam; }), btns = $$(story, '.k-step');
    var path = story.querySelector('.k-hops');
    var tl = new Timeline(), cur = 0, visible = false;
    var DUR = btns.map(function (b, i) { return id === 'bastions' && i === 1 ? 6000 : id === 'automations' && i === 2 ? 9500 : 5400; });
    function go(i, auto) {
      tl.stop(); cur = i;
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); b.classList.remove('run'); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      var cam = scams.filter(function (c) { return c.steps[i]; })[0];
      scams.forEach(function (c) { c.el.classList.toggle('on', c === cam); c.focus = c.ringSel = null; c.ringOn(false); });
      if (path) { path.classList.toggle('on', i === 1); $$(path, '.k-hop').forEach(function (h) { h.classList.toggle('lit', REDUCE); }); }
      cam.i = i;
      if (REDUCE) { (FINAL[id] || function () {})(cam.app, i); cam.place(false); cam.ringOn(true); return; }
      if (scenes[i]) scenes[i](cam.app, tl, cam, story);
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
