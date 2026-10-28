/* SSHKipper landing, new direction (prototype). A camera over each replica: it scales the fixed-size screen to its
   stage, moves to the part a step talks about and rings it. Stories advance by themselves while on screen; a click
   on a step jumps to it. With reduced motion nothing moves by itself. Plain script, no dependencies. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = window.matchMedia('(max-width: 640px)');
  var $$ = function (el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function Timeline() { this.ids = []; }
  Timeline.prototype.at = function (ms, fn) { this.ids.push(setTimeout(fn, ms)); };
  Timeline.prototype.stop = function () { this.ids.forEach(clearTimeout); this.ids = []; };

  // Position in replica points: offsets aren't affected by the camera's transform.
  function pos(n, app) {
    var x = 0, y = 0;
    while (n && n !== app) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x, y: y };
  }
  function rect(app, sel) {
    var r = null;
    $$(app, sel).forEach(function (n) {
      if (!n.offsetWidth && !n.offsetHeight) return;
      var p = pos(n, app), x2 = p.x + n.offsetWidth, y2 = p.y + n.offsetHeight;
      r = r ? { x: Math.min(r.x, p.x), y: Math.min(r.y, p.y), x2: Math.max(r.x2, x2), y2: Math.max(r.y2, y2) } : { x: p.x, y: p.y, x2: x2, y2: y2 };
    });
    if (r) { r.w = r.x2 - r.x; r.h = r.y2 - r.y; }
    return r;
  }

  function Cam(el) {
    this.el = el; this.app = el.querySelector('.app');
    this.W = +el.dataset.w; this.H = +el.dataset.h;
    this.steps = JSON.parse(el.dataset.steps); this.i = 0;
    this.ring = this.app.querySelector('.k-ring'); this.tap = this.app.querySelector('.k-tap');
  }
  Cam.prototype.place = function (animate) {
    var st = this.steps[this.i], zoom = (PHONE.matches && st.mzoom) || st.zoom, el = this.el;
    var R = rect(this.app, st.focus) || { x: 0, y: 0, w: this.W, h: this.H };
    var s = el.clientWidth / zoom;
    if (st.fit) { var pad = (zoom - R.w) / 2; el.style.aspectRatio = 'auto'; el.style.height = Math.round((R.h + 2 * pad) * s) + 'px'; }
    var vh = el.clientHeight / s;
    // ax — the left edge in replica points (lines of text read from their start, not from their middle)
    var ax = PHONE.matches && st.max != null ? st.max : st.ax;
    var tx = zoom >= this.W ? (this.W - zoom) / 2 : clamp(ax != null ? ax : R.x + R.w / 2 - zoom / 2, -10, this.W - zoom + 10);
    var ty = vh >= this.H ? (this.H - vh) / 2 : clamp(R.y + R.h / 2 - vh / 2, 0, this.H - vh);
    el.classList.toggle('moving', !!animate && !REDUCE);
    this.app.style.transform = 'scale(' + s.toFixed(4) + ') translate(' + (-tx).toFixed(1) + 'px,' + (-ty).toFixed(1) + 'px)';
    this.ringOn(st.ring && this.ringShown);
  };
  Cam.prototype.ringOn = function (on) {
    this.ringShown = !!on;
    var st = this.steps[this.i], R = on && rect(this.app, st.ring);
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

  // Navigation gets its hairline once the page scrolls.
  var nav = document.querySelector('.k-nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- Main window: connecting through two bastions (hero plays it once) ---------- */
  function lines(app) { return $$(app, '.w-term .tl'); }
  function connect(app, tl, from, to, gap, t0) {
    var ls = lines(app), t = t0 || 0;
    ls.slice(from, to).forEach(function (l, k) { tl.at(t, function () { l.classList.add('in'); }); t += gap(from + k); });
    return t;
  }
  var hero = document.querySelector('.k-hero-win');
  if (hero && !REDUCE) {
    var happ = hero.querySelector('.app'), htl = new Timeline();
    happ.classList.add('play');
    var t = connect(happ, htl, 0, 99, function (i) { return i < 4 ? 650 : 60; }, 700);
    htl.at(t + 150, function () { happ.classList.add('done'); });
  } else if (hero) hero.querySelector('.app').classList.add('done');

  /* ---------- Story: steps and the camera ---------- */
  $$(document, '.k-story').forEach(function (story) {
    var cam = story.querySelector('.k-cam')._cam, app = cam.app, btns = $$(story, '.k-step');
    var tl = new Timeline(), DUR = [4200, 6000, 5200], cur = 0, visible = false;
    var path = story.querySelector('.k-hops'), hops = path ? $$(path, '.k-hop') : [];
    // The replica's state at the start of each step (and what the step then plays).
    var scenes = [
      function () {
        app.classList.add('play'); app.classList.remove('done');
        lines(app).forEach(function (l) { l.classList.remove('in'); });
        tl.at(1150, function () { cam.ringOn(true); cam.tapAt('.a-row.sel'); });
      },
      function () {
        app.classList.add('play'); app.classList.remove('done');
        lines(app).forEach(function (l) { l.classList.remove('in'); });
        var t = connect(app, tl, 0, 4, function () { return 750; }, 900);
        // the path card lights up hop by hop, in step with the terminal lines
        hops.forEach(function (h, k) { tl.at(900 + k * 750, function () { h.classList.add('lit'); }); });
        tl.at(t + 100, function () { cam.ringOn(true); });
      },
      function () {
        app.classList.add('play', 'done');
        lines(app).forEach(function (l, i) { if (i < 4) l.classList.add('in'); });
        connect(app, tl, 4, 99, function () { return 60; }, 300);
        tl.at(1150, function () { cam.ringOn(true); });
      }
    ];
    function go(i, auto) {
      tl.stop(); cur = i;
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); b.classList.remove('run'); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      cam.i = i; cam.ringOn(false);
      if (path) { path.classList.toggle('on', i === 1); hops.forEach(function (h) { h.classList.toggle('lit', REDUCE); }); }
      if (REDUCE) {
        app.classList.toggle('done', i === 2); app.classList.toggle('play', i === 0);
        lines(app).forEach(function (l) { l.classList.add('in'); });
        cam.place(false); cam.ringOn(true); return;
      }
      scenes[i]();
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
