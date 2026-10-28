/* SSHKipper landing: ASCII helm, sticky contents, and the replicas of real app screens (fit to the column, and
   small animations of what each screen really does). Plain script, no dependencies. All text lives in the HTML.
   Animations run only while their replica is on screen; with reduced motion the replicas stay in their final state. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var A = new URL('.', document.currentScript.src).href; // assets/ folder
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ASCII helm (the logo drawn in characters) ---------- */
  (function helm() {
    var box = document.getElementById('helm');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', '<div class="helm-art" aria-hidden="true"><pre class="w"></pre><pre class="blue"></pre></div><pre class="sea" aria-hidden="true"></pre>');
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

  /* ---------- Sticky contents: highlight the screen in view ---------- */
  (function toc() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    var secs = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });
    var bar = document.querySelector('.toc ol');
    if (!links.length || !bar) return;
    var cur = -1, raf = 0;
    function update() {
      raf = 0;
      var idx = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.45) idx = i; });
      if (idx === cur) return;
      if (cur >= 0) links[cur].removeAttribute('aria-current');
      cur = idx;
      if (cur >= 0) {
        var l = links[cur]; l.setAttribute('aria-current', 'true');
        var left = bar.scrollLeft + l.getBoundingClientRect().left - bar.getBoundingClientRect().left - bar.clientWidth / 2 + l.clientWidth / 2;
        bar.scrollTo({ left: Math.max(0, left), behavior: REDUCE ? 'auto' : 'smooth' });
      }
    }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  })();

  /* ---------- Replicas: scale the fixed-size screen to its column ---------- */
  var fits = Array.prototype.slice.call(document.querySelectorAll('.fit'));
  function layout() {
    fits.forEach(function (f) {
      var w = +f.dataset.w, h = +f.dataset.h;
      f.style.setProperty('--w', w); f.style.setProperty('--h', h);
      // In a wide scene a big replica may grow a little past its design size (it is drawn, not a bitmap).
      var big = f.closest('.scene.L1, .scene.L2, .scene.L3');
      var cw = f.clientWidth, s = Math.min(big ? 1.14 : 1, cw / w), x = 0;
      // A wide screen on a phone: keep it readable and show its focus part (data-fx) instead of shrinking it all.
      if (f.dataset.fx && s < 0.5) { s = 0.5; x = -Math.round((w * s - cw) * +f.dataset.fx); }
      f.style.setProperty('--s', s.toFixed(4));
      f.style.setProperty('--x', x + 'px');
    });
  }
  layout();
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(layout); fits.forEach(function (f) { ro.observe(f); }); }
  else window.addEventListener('resize', layout);

  /* ---------- Replicas: what each screen does, played while it is on screen ---------- */
  // A little timeline runner: step(fn, delay) chains; stop() cancels everything pending.
  function Timeline() { this.ids = []; }
  Timeline.prototype.at = function (ms, fn) { this.ids.push(setTimeout(fn, ms)); };
  Timeline.prototype.stop = function () { this.ids.forEach(clearTimeout); this.ids = []; };
  var $$ = function (el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };

  var players = {
    // 01 — connecting through two bastions: the 2FA lines appear, the status turns «Connected»
    bastions: function (app, tl, loop) {
      var lines = $$(app, '.w-term .tl');
      app.classList.remove('done'); app.classList.add('play');
      lines.forEach(function (l) { l.classList.remove('in'); });
      var t = 300;
      lines.forEach(function (l, i) { tl.at(t, function () { l.classList.add('in'); }); t += i < 4 ? 1000 : 70; });
      tl.at(t + 200, function () { app.classList.add('done'); });
      tl.at(t + 7000, loop);
    },
    // 02 — the agent looks around step by step, then a red approval card waits for you
    agent: function (app, tl, loop) {
      var steps = $$(app, '.js-step'), cmds = $$(app, '.js-cmd'), card = $$(app, '.js-card, .js-wait');
      app.classList.add('play');
      $$(app, '.in').forEach(function (x) { x.classList.remove('in'); });
      var t = 500;
      steps.forEach(function (s, i) {
        tl.at(t, function () {
          s.classList.add('in');
          cmds.forEach(function (c) { if (+c.dataset.at === i + 1 || (+c.dataset.at === i && false)) c.classList.add('in'); });
        });
        t += 750;
      });
      tl.at(t + 300, function () { card.forEach(function (c) { c.classList.add('in'); }); });
      tl.at(t + 8000, loop);
    },
    // 03 — the same tab switches between the dashboard and Nginx
    services: function (app, tl, loop) {
      var pill = app.querySelector('.segpill'), d = app.querySelector('.js-dash'), n = app.querySelector('.js-nginx');
      function to(el, nginx) {
        pill.style.left = el.offsetLeft + 'px'; pill.style.width = el.offsetWidth + 'px';
        app.classList.toggle('nginx', nginx);
      }
      to(d, false);
      tl.at(5500, function () { to(n, true); });
      tl.at(12500, loop);
    },
    // 04 — words in the AI filter become WHERE, the grid shows the filtered rows
    databases: function (app, tl, loop) {
      var box = app.querySelector('.js-type'), tx = box.querySelector('.tx'), text = box.dataset.text;
      app.classList.add('play'); app.classList.remove('typed', 'applied'); tx.textContent = '';
      var t = 700;
      for (var i = 1; i <= text.length; i++) (function (k) { tl.at(t + k * 55, function () { tx.textContent = text.slice(0, k); }); })(i);
      t += text.length * 55 + 600;
      tl.at(t, function () { app.classList.add('typed'); });
      tl.at(t + 1300, function () { app.classList.add('applied'); });
      tl.at(t + 8000, loop);
    },
    // 05 — a run: every module turns green with its result, in order
    automations: function (app, tl, loop) {
      var cards = $$(app, '.js-ac'), chips = $$(app, '.js-chip');
      app.classList.add('play'); app.classList.remove('done');
      cards.forEach(function (c) { c.classList.remove('ok'); });
      chips.forEach(function (c) { c.classList.remove('in'); });
      var t = 800;
      cards.forEach(function (c, i) {
        tl.at(t, function () {
          c.classList.add('ok');
          chips.forEach(function (ch) { if (+ch.dataset.at === i) ch.classList.add('in'); });
        });
        t += i === 1 ? 1200 : 750;
      });
      tl.at(t, function () { app.classList.add('done'); });
      tl.at(t + 7000, loop);
    },
    // 06 — direct copy: sign-in, transfer, checksum, done
    files: function (app, tl, loop) {
      var logs = $$(app, '.js-log'), bar = app.querySelector('.js-prog'), n = app.querySelector('.js-n');
      var mb = n.dataset.mb;
      var ru = (root.lang || 'ru').indexOf('ru') === 0;
      app.classList.add('play'); app.classList.remove('done');
      logs.forEach(function (l) { l.classList.remove('in'); });
      bar.style.transition = 'none'; bar.style.width = '1%'; n.textContent = '0 ' + mb;
      tl.at(50, function () { bar.style.transition = ''; });
      tl.at(600, function () { logs[0].classList.add('in'); });
      tl.at(1400, function () { logs[1].classList.add('in'); });
      tl.at(2100, function () { logs[2].classList.add('in'); });
      for (var k = 1; k <= 10; k++) (function (k) {
        tl.at(2300 + k * 300, function () { bar.style.width = k * 10 + '%'; var v = Math.round(1229 * k / 10); n.textContent = (k === 10 ? (ru ? '1,2 ' : '1.2 ') + (ru ? 'ГБ' : 'GB') : v + ' ' + mb); });
      })(k);
      tl.at(5600, function () { logs[3].classList.add('in'); });
      tl.at(6600, function () { logs[4].classList.add('in'); app.classList.add('done'); });
      tl.at(13000, loop);
    },
    // 07 — typed once, run in both panes
    terminal: function (app, tl, loop) {
      var typed = $$(app, '.js-typed'), outs = $$(app, '.js-out');
      app.classList.add('play'); app.classList.remove('ran');
      typed.forEach(function (x) { x.textContent = ''; });
      outs.forEach(function (o) { o.classList.remove('in'); });
      var word = 'uptime', t = 900;
      for (var i = 1; i <= word.length; i++) (function (k) { tl.at(t + k * 140, function () { typed.forEach(function (x) { x.textContent = word.slice(0, k); }); }); })(i);
      t += word.length * 140 + 500;
      tl.at(t, function () { app.classList.add('ran'); outs.forEach(function (o) { o.classList.add('in'); }); });
      tl.at(t + 5000, loop);
    },
    // 08 — a tunnel switched on from the menu bar
    tunnels: function (app, tl, loop) {
      var row = app.querySelector('.js-tun'), on = app.querySelector('.js-on'), sub = app.querySelector('.js-sub');
      function set(v) {
        row.querySelector('.sw').classList.toggle('on', v); row.querySelector('.port').classList.toggle('on', v);
        row.querySelector('.tic').classList.toggle('on', v);
        on.textContent = v ? on.dataset.b : on.dataset.a; sub.textContent = v ? sub.dataset.b : sub.dataset.a;
      }
      set(false);
      tl.at(2500, function () { set(true); });
      tl.at(7500, loop);
    },
    // 09 — the diagram played step by step: a dot runs along the links, each hop lights up
    route: function (app, tl, loop) {
      var dot = app.querySelector('.js-rdot'), nodes = $$(app, '.js-rn');
      var hops = [[96, 166], [262, 302], [398, 438]];
      nodes.forEach(function (n) { n.classList.remove('lit'); });
      dot.style.transition = 'none'; dot.style.opacity = 0; dot.style.top = '96px';
      var t = 600;
      hops.forEach(function (h, i) {
        tl.at(t, function () { dot.style.transition = 'none'; dot.style.top = h[0] + 'px'; dot.style.opacity = 1; });
        tl.at(t + 40, function () { dot.style.transition = 'top .9s ease-in-out, opacity .2s'; dot.style.top = h[1] + 'px'; });
        tl.at(t + 950, function () { dot.style.opacity = 0; nodes.forEach(function (n, j) { n.classList.toggle('lit', j === i); }); });
        t += 1900;
      });
      tl.at(t + 1500, function () { nodes.forEach(function (n) { n.classList.remove('lit'); }); });
      tl.at(t + 2500, loop);
    }
  };

  // The segmented control's moving pill starts under «Dashboard» (also with reduced motion).
  $$(document, '.app.page').forEach(function (app) {
    var pill = app.querySelector('.segpill'), d = app.querySelector('.js-dash');
    if (pill && d) { pill.style.left = d.offsetLeft + 'px'; pill.style.width = d.offsetWidth + 'px'; }
  });
  if (REDUCE || !('IntersectionObserver' in window)) return;   // final states only (already in the markup)

  /* ---------- Scenes: pain → path → solution, played once when they come into view ---------- */
  // Each act starts when the previous one has finished AND the act itself is on screen (on a phone the acts sit
  // one under another, so each plays when you reach it). The scene ends on its final state; «Play again» replays.
  var NOTL = { at: function () {} }, noop = function () {};
  $$(document, '.scene').forEach(function (fig) {
    var acts = $$(fig, '.act'), app = fig.querySelector('.fit .app'), play = app && players[app.dataset.kind];
    var steps = $$(fig, '.act-v [data-at]'), changers = $$(fig, '.act-v [data-cls]'), typed = $$(fig, '.act-v [data-type]');
    var btn = fig.querySelector('.replay');
    var tl = new Timeline(), vis = acts.map(function () { return false; }), pending = -1, started = false;
    typed.forEach(function (x) { x.dataset.full = x.textContent; });
    function ops(x) { return x.dataset.cls.split(/\s+/).map(function (o) { var p = o.split(':'); return { t: +p[0], c: p[1] }; }); }
    function reset() {
      tl.stop(); pending = -1;
      fig.classList.add('play');
      acts.forEach(function (a) { a.classList.remove('on', 'cur'); });
      steps.forEach(function (x) { x.classList.remove('in'); });
      changers.forEach(function (x) { ops(x).forEach(function (o) { x.classList.remove(o.c.replace(/^-/, '')); }); });
      typed.forEach(function (x) { x.textContent = ''; });
      if (play) play(app, NOTL, noop);      // the replica's own starting state
    }
    function start(i) {
      var a = acts[i];
      acts.forEach(function (b) { b.classList.remove('cur'); });
      a.classList.add('on', 'cur');
      if (a.classList.contains('fix')) { if (play) play(app, tl, noop); if (btn) btn.hidden = false; return; }
      $$(a, '.act-v [data-at]').forEach(function (x) { tl.at(+x.dataset.at, function () { x.classList.add('in'); }); });
      $$(a, '.act-v [data-cls]').forEach(function (x) {
        ops(x).forEach(function (o) {
          tl.at(o.t, function () { if (o.c.charAt(0) === '-') x.classList.remove(o.c.slice(1)); else x.classList.add(o.c); });
        });
      });
      $$(a, '.act-v [data-type]').forEach(function (x) {
        var host = x.closest('[data-at]'), t0 = (host ? +host.dataset.at : 0) + 150, full = x.dataset.full;
        for (var k = 1; k <= full.length; k++) (function (k) { tl.at(t0 + k * 28, function () { x.textContent = full.slice(0, k); }); })(k);
      });
      tl.at(+a.dataset.dur || 1000, function () { next(i + 1); });
    }
    function next(i) { if (i >= acts.length) return; if (vis[i]) start(i); else pending = i; }
    reset();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var i = acts.indexOf(en.target);
        // a tall act counts as seen once it fills a good part of the window
        vis[i] = en.isIntersecting && (en.intersectionRatio >= 0.35 || en.intersectionRect.height >= window.innerHeight * 0.45);
        if (!vis[i]) return;
        if (!started && i === 0) { started = true; start(0); }
        else if (pending === i) { pending = -1; start(i); }
      });
    }, { threshold: [0, 0.1, 0.2, 0.35, 0.5] });
    acts.forEach(function (a) { io.observe(a); });
    if (btn) btn.addEventListener('click', function () { btn.hidden = true; reset(); start(0); });
  });
})();
