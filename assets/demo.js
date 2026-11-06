/* The live hero window: the tree opens, servers connect through their bastions, tabs, a small shell, Files, splits,
   the palette, the lock and the agent's card all answer clicks. Data: #demo-data (scripts/site/gen.py, demo_data). */
(function () {
  'use strict';
  var hero = document.querySelector('.k-hero-win'), src = document.querySelector('.k-live-src');
  if (!hero || !src) return;
  fetch(src.dataset.json).then(function (r) { return r.json(); }).then(start).catch(function () {});
  function start(D) {
  var T = D.t, S = D.servers, app = hero.querySelector('.app');
  var $ = function (r, s) { return r.querySelector(s); }, $$ = function (r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ms = function (n, c) { return '<span class="ms' + (c ? ' ' + c : '') + '" aria-hidden="true">' + n + '</span>'; };
  var fmt = function (s) { var a = arguments, i = 1; return s.replace(/\{\}/g, function () { return a[i++]; }); };
  var tree = $(app, '.w-tree'), main = $(app, '.w-main'), bar = $(app, '.w-tabs'), status = $(app, '.w-status');
  var tabs = [], cur = null, seq = 0, aiOn = false, timers = [];
  var later = function (ms_, fn) { var t = setTimeout(fn, ms_); timers.push(t); return t; };

  // ---------- servers ----------
  var local = Object.assign({}, S['macbook-air'], { name: 'MacBook-Pro', via: [], local: true });
  function prompt(s) {
    if (s.os === 'macos') return esc(s.user + '@' + s.name) + ' ~ % ';
    return '<b class="pg">' + esc(s.user + '@' + s.name) + '</b>:<b class="pb">~</b>' + (s.user === 'root' ? '#' : '$') + ' ';
  }
  function fastfetch(s) { return s.local ? D.localfetch : s.fetch; }   // the whole output at once, as fastfetch prints
  function run(s, cmd) {
    var c = cmd.trim(), w = c.split(/\s+/), lines = [];
    var L = function (t, raw) { lines.push('<div class="tl">' + (raw ? t : esc(t)) + '</div>'); };
    if (!c) return { html: '' };
    if (c === 'help') L(T.help);
    else if (c === 'clear' || c === 'reset') return { clear: true };
    else if (c === 'exit' || c === 'logout') { L(fmt(T.closed, s.name)); return { html: lines.join(''), exit: true }; }
    else if (w[0] === 'neofetch' || w[0] === 'fastfetch') return { html: fastfetch(s) };
    else if (c === 'whoami') L(s.user);
    else if (c === 'hostname') L(s.name);
    else if (c === 'pwd') L(s.os === 'macos' ? '/Users/' + s.user : s.user === 'root' ? '/root' : '/home/' + s.user);
    else if (w[0] === 'uname') L(s.os === 'macos' ? 'Darwin ' + s.name + ' 25.1.0 Darwin Kernel Version 25.1.0 arm64' : s.motd.indexOf('Linux') === 0 ? s.motd : 'Linux ' + s.name + ' ' + s.kernel + ' x86_64 GNU/Linux');
    else if (w[0] === 'uptime') L(' 15:02:11 up ' + s.up + ',  1 user,  load average: 0.42, 0.37, 0.31');
    else if (w[0] === 'df') { L('Filesystem      Size  Used Avail Use% Mounted on'); L((s.os === 'raspbian' ? '/dev/mmcblk0p2 ' : s.os === 'macos' ? '/dev/disk3s1s1 ' : '/dev/vda1      ') + ' ' + s.disk.join('  ') + ' /'); }
    else if (w[0] === 'free') { var g = function (m) { return (m / 1024).toFixed(1) + 'Gi'; }; L('               total        used        free'); L('Mem:          ' + g(s.mem[1]) + '       ' + g(s.mem[0]) + '       ' + g(s.mem[1] - s.mem[0])); }
    else if (w[0] === 'ls' || w[0] === 'll') L(s.files.filter(function (f) { return w.join(' ').indexOf('a') > 0 || f[1][0] !== '.'; }).map(function (f) { return f[0] === 'd' ? '<b class="pb">' + esc(f[1]) + '</b>' : esc(f[1]); }).join('  '), true);
    else if (w[0] === 'docker') {
      if (!s.containers.length) L(s.os === 'macos' ? fmt(T.zshnotfound, 'docker') : T.nodocker);
      else { L('NAMES     IMAGE                   STATUS'); s.containers.forEach(function (k) { L((k[0] + '          ').slice(0, 10) + (k[1] + '                        ').slice(0, 24) + k[2]); }); }
    }
    else if (w[0] === 'sudo') L(fmt(T.sudo, s.user));
    else if (w[0] === 'pihole' && s.os === 'raspbian') { L('  [✓] FTL is listening on port 53'); L('  [✓] Pi-hole blocking is enabled'); }
    else if (w[0] === 'pveversion' && s.os === 'proxmox') L('pve-manager/9.0.10/deb4ab62 (running kernel: ' + s.kernel + ')');
    else L(fmt(s.os === 'macos' ? T.zshnotfound : T.notfound, w[0]));
    return { html: lines.join('') };
  }

  // ---------- tabs ----------
  function tabFor(s) { return tabs.filter(function (t) { return t.s.name === s.name && !t.s.local; })[0]; }
  function newPane(tab) {
    var p = document.createElement('div'); p.className = 'w-term d-pane'; tab.panes.appendChild(p);
    p.addEventListener('mousedown', function (ev) { tab.pane = p; focusIn(); ev.preventDefault(); });
    return p;
  }
  function makeTab(s, existingTerm) {
    var tab = { id: 'd' + (++seq), s: s, files: false, split: '', ok: false, hop: '' };
    tab.body = document.createElement('div'); tab.body.className = 't-split full d-body';
    tab.panes = document.createElement('div'); tab.panes.className = 'd-panes'; tab.body.appendChild(tab.panes);
    if (existingTerm) { existingTerm.classList.add('d-pane'); tab.panes.appendChild(existingTerm); tab.pane = existingTerm;
      existingTerm.addEventListener('mousedown', function (ev) { tab.pane = existingTerm; focusIn(); ev.preventDefault(); }); }
    else tab.pane = newPane(tab);
    main.appendChild(tab.body); tabs.push(tab);
    return tab;
  }
  function addLine(tab, html, pane) { (pane || tab.pane).insertAdjacentHTML('beforeend', html); scroll(pane || tab.pane); }
  function scroll(p) { p.scrollTop = p.scrollHeight; }
  function newPrompt(tab, pane) {
    var p = pane || tab.pane, old = $(p, '.d-cur'); if (old) old.classList.remove('d-cur');
    addLine(tab, '<div class="tl d-cur">' + prompt(tab.s) + '<span class="d-typed"></span><i class="a-cur"></i></div>', p);
  }
  function connect(tab) {
    var s = tab.s, hops = s.via.concat([s.name]), t = 0, step = 520;
    tab.ok = false; tab.hop = hops[0]; render();
    addLine(tab, '<div class="tl dim">' + esc(fmt(T.connecting, s.name)) + '</div>');
    hops.forEach(function (h, i) {
      t += step;
      later(t, function () {
        var hs = S[h] || s; tab.hop = hops[i + 1] || h; if (cur === tab) renderStatus();
        if (hs.two) addLine(tab, '<div class="tl dim">' + esc(fmt(T.twofa, hs.user + '@' + h, h, D.cred[h] || 'ops-2fa')) + '</div>');
        else addLine(tab, '<div class="tl dim">' + esc(fmt(T.key, 'ops-ed25519', h)) + '</div>');
      });
    });
    later(t + 380, function () {
      tab.ok = true; tab.since = Date.now();
      if (s.motd && s.os !== 'macos') addLine(tab, '<div class="tl">' + esc(s.motd.replace('{h}', s.name)) + '</div>');
      addLine(tab, '<div class="tl">' + esc(fmt(T.lastlogin.replace('{t}', '{}').replace('{ip}', '{}'), '15:01:52', s.via.length ? '10.20.0.5' : '192.168.1.20')) + '</div>');
      addLine(tab, '<div class="tl">' + prompt(s) + 'fastfetch</div>' + fastfetch(s));
      newPrompt(tab); render();
      if (cur === tab) focusIn();
    });
  }
  function open(s) {
    var tab = tabFor(s);
    if (!tab) { tab = makeTab(s); if (s.local) { tab.ok = true; tab.since = Date.now(); addLine(tab, '<div class="tl">Last login: Wed Oct 28 14:58:03 on ttys002</div>'); newPrompt(tab); } else connect(tab); }
    select(tab);
  }
  function select(tab) { cur = tab; render(); focusIn(); }
  function close(tab) {
    var i = tabs.indexOf(tab); if (i < 0) return;
    tab.body.remove(); tabs.splice(i, 1);
    if (cur === tab) cur = tabs[Math.min(i, tabs.length - 1)] || null;
    render();
  }

  // ---------- drawing ----------
  function render() {
    bar.innerHTML = tabs.map(function (t) {
      return '<span class="w-tab' + (t === cur ? ' sel' : '') + '" data-tab="' + t.id + '">' + tabIcon(t) +
        '<span>' + esc(t.s.local ? T.local : t.s.name) + '</span>' + ms('close', 'x') + '</span>';
    }).join('') + '<span class="w-plus">' + ms('add') + '</span>';
    tabs.forEach(function (t) { t.body.style.display = t === cur ? '' : 'none'; t.panes.className = 'd-panes' + (t.split ? ' ' + t.split : ''); });
    main.classList.toggle('sftp', !!(cur && cur.files));
    main.classList.toggle('d-empty', !cur); main.dataset.empty = T.empty;
    renderStatus();
    // the tree: connected servers carry the green dot, the open tab's row is selected
    $$(tree, '.a-row[data-kind="server"]').forEach(function (r) {
      var t = tabs.filter(function (x) { return x.s.name === r.dataset.id && !x.s.local; })[0], dot = $(r, '.a-dot');
      if (t && t.ok) { if (!dot) r.insertAdjacentHTML('beforeend', '<i class="a-dot g"></i>'); else dot.classList.remove('js-on'); }
      else if (dot) dot.remove();
    });
    if (cur && !cur.s.local) selectRow(cur.s.name);
    $(app, '.w-title').textContent = cur ? (cur.s.local ? T.local : cur.s.name) : 'SSHKipper';
  }
  // a tab's icon: the server's own (its row's logo) with the status dot, as the app's tab bar draws it
  function tabIcon(t) {
    var r = t.s.local ? null : $(tree, '.a-row[data-id="' + t.s.name + '"] .a-ic');
    return '<span class="w-ti">' + (r ? r.outerHTML : ms(t.s.local ? 'laptop_mac' : 'terminal', 'a-ic t-teal f')) +
      '<i class="a-dot ' + (t.ok ? 'g' : 'o') + '"></i></span>';
  }
  function renderStatus() {
    status.style.visibility = cur ? '' : 'hidden';
    if (!cur) return;
    var s = cur.s, st = cur.ok ? '<i class="a-dot g"></i><b>' + esc(T.connected) + ' · ' + Math.max(1, Math.round((Date.now() - cur.since) / 60000)) + ' ' + esc(T.min) + '</b>'
      : '<i class="a-dot o"></i><b class="o">' + esc(fmt(T.connecting, cur.hop)) + '</b>';
    var chain = s.local ? '' : s.via.map(function (h) { return esc(h) + '<i>›</i>'; }).join('') + '<b>' + esc(s.user + '@' + s.name) + '</b>';
    status.innerHTML = '<span class="d-state">' + st + '</span><span class="chain">' + chain + '</span>' +
      '<span class="st-r"><span class="d-ai' + (aiOn ? ' ai-pill' : '') + '">' + ms('auto_awesome') + esc(aiOn ? T.ai_on : T.ai_off) + '</span>' +
      '<span class="d-files' + (cur.files ? ' pill-on' : '') + '">' + ms('folder') + esc(T.files) + '</span><i class="vs"></i>' +
      ms('key', 'kh') + '<span class="d-sr' + (cur.split === 'sr' ? ' on' : '') + '">' + ms('splitscreen_right') + '</span><span class="d-sb' + (cur.split === 'sb' ? ' on' : '') + '">' + ms('splitscreen_bottom') + '</span>' + ms('pending') + '</span>';
  }
  function filesPane(tab) {
    var s = tab.s, home = s.os === 'macos' ? ['Users', s.user] : s.user === 'root' ? ['root'] : ['home', s.user];
    var rows = s.files.map(function (f) {
      return '<div class="f-row"><span class="c-n">' + (f[0] === 'd' ? ms('folder', 'f-ic t-blue f') : ms('description', 'f-ic t-ink2')) + '<span class="fn">' + esc(f[1]) + '</span></span>' +
        '<span class="c-s">' + (f[2] || '—') + '</span><span class="c-d">28.10.26</span></div>';
    }).join('');
    return '<div class="f-pane side d-fp"><div class="f-bar">' + ms('arrow_back', 'dim') + ms('arrow_forward', 'dim') + ms('arrow_upward') + ms('home') + ms('refresh') + '</div>' +
      '<div class="f-crumb">' + esc(s.local ? T.local : s.name) + home.map(function (h) { return '<i>›</i>' + esc(h); }).join('') + '</div>' +
      '<div class="f-list">' + rows + '</div><div class="f-foot">' + s.files.length + ' ' + esc(T.files_hint) + '</div></div>';
  }
  function toggleFiles() {
    if (!cur) return; cur.files = !cur.files;
    var fp = $(cur.body, '.d-fp'); if (fp) fp.remove();
    if (cur.files) cur.body.insertAdjacentHTML('beforeend', filesPane(cur));
    render();
  }
  function split(kind) {
    if (!cur || !cur.ok) return;
    if (cur.split === kind) { cur.split = ''; var extra = $$(cur.panes, '.d-pane').slice(1); extra.forEach(function (p) { p.remove(); }); cur.pane = $(cur.panes, '.d-pane'); }
    else {
      var had = !!cur.split; cur.split = kind;
      if (!had) { var p = newPane(cur); cur.pane = p; addLine(cur, '<div class="tl">' + esc(fmt(T.lastlogin.replace('{t}', '{}').replace('{ip}', '{}'), '15:03:20', cur.s.via.length ? '10.20.0.5' : '192.168.1.20')) + '</div>', p); newPrompt(cur, p); }
    }
    render(); focusIn();
  }

  // ---------- the tree ----------
  function rowsUnder(id) { return $$(tree, '.a-row[data-parent="' + id + '"]'); }
  function setOpen(row, openIt) {
    row.classList.toggle('d-closed', !openIt);
    var ch = $(row, '.a-chev'); if (ch && ch.classList.contains('ms')) ch.textContent = openIt ? 'expand_more' : 'chevron_right';
    (function walk(id, show) { rowsUnder(id).forEach(function (r) { r.classList.toggle('d-hid', !show); if (r.dataset.kind === 'folder') walk(r.dataset.id, show && !r.classList.contains('d-closed')); }); })(row.dataset.id, openIt);
  }
  function selectRow(id) {
    $$(tree, '.a-row.sel').forEach(function (r) { r.classList.remove('sel'); });
    var r = $(tree, '.a-row[data-id="' + id + '"]'); if (!r) return;
    r.classList.add('sel');
    // a server opened from the palette shows up in the tree: its folders open, the row scrolls into the tree's view
    for (var x = r; x && x.dataset.parent; ) { x = $(tree, '.a-row[data-id="' + x.dataset.parent + '"]'); if (x && x.classList.contains('d-closed')) setOpen(x, true); }
    var top = r.offsetTop - tree.offsetTop;
    if (top < tree.scrollTop || top + r.offsetHeight > tree.scrollTop + tree.clientHeight) tree.scrollTop = top - tree.clientHeight / 2;
  }
  $$(tree, '.a-row[data-kind="folder"]').forEach(function (r) { if ($(r, '.a-chev') && $(r, '.a-chev').textContent === 'chevron_right') r.classList.add('d-closed'); });
  tree.addEventListener('click', function (ev) {
    var r = ev.target.closest('.a-row'); if (!r) return;
    var k = r.dataset.kind, id = r.dataset.id;
    if (k === 'folder') setOpen(r, r.classList.contains('d-closed'));
    else if (k === 'server' && S[id]) open(S[id]);
    else if (k === 'db') { selectRow(id); toast(T.db, T.dblink, '#databases'); }
    else if (k === 'cred') { selectRow(id); toast(fmt(T.cred, id)); }
  });

  // ---------- input: one hidden field types into the active prompt ----------
  var input = document.createElement('input');
  input.className = 'd-in'; input.tabIndex = -1; input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false');
  app.appendChild(input);
  function focusIn() { if (cur && cur.ok) { input.value = ''; input.focus({ preventScroll: true }); syncTyped(); } }
  function syncTyped() { var c = cur && $(cur.pane, '.d-cur .d-typed'); if (c) c.textContent = input.value; app.classList.toggle('d-typing', document.activeElement === input); }
  input.addEventListener('input', syncTyped);
  input.addEventListener('focus', syncTyped); input.addEventListener('blur', syncTyped);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { input.blur(); return; }
    if (ev.key !== 'Enter' || !cur || !cur.ok) return;
    ev.preventDefault();
    var tab = cur, pane = tab.pane, line = $(pane, '.d-cur'), r = run(tab.s, input.value);
    if (line) { var cu = $(line, '.a-cur'); if (cu) cu.remove(); line.classList.remove('d-cur'); }
    input.value = '';
    if (r.clear) pane.innerHTML = '';
    else if (r.html) addLine(tab, r.html, pane);
    if (r.exit) { later(500, function () { close(tab); }); return; }
    newPrompt(tab, pane);
  });

  // ---------- buttons ----------
  function toast(text, link, href) {
    var t = $(app, '.d-toast'); if (t) t.remove();
    app.insertAdjacentHTML('beforeend', '<div class="d-toast">' + ms('info') + '<span>' + esc(text) + '</span>' + (link ? '<a href="' + href + '">' + esc(link) + '</a>' : '') + '</div>');
    t = $(app, '.d-toast'); requestAnimationFrame(function () { t.classList.add('on'); });
    later(5200, function () { t.classList.remove('on'); later(400, function () { t.remove(); }); });
  }
  function lock() {
    if ($(app, '.d-lock')) return;
    input.blur();
    app.insertAdjacentHTML('beforeend', '<div class="d-lock"><img src="' + $(app, '.w-tree img').getAttribute('src') + '" alt=""><b>' + esc(T.locked) + '</b><span>Northwind.sshkipper</span>' +
      '<span class="d-unlock">' + ms('fingerprint') + esc(T.unlock) + '</span></div>');
    requestAnimationFrame(function () { $(app, '.d-lock').classList.add('on'); });
  }
  function palette() {
    var pal = $(app, '.w-pal'), box = $(app, '.d-pal');
    if (box) { box.remove(); return; }
    pal.insertAdjacentHTML('afterend', '<div class="d-pal"><input class="d-pal-in" placeholder="' + esc(T.pal) + '" autocomplete="off" spellcheck="false"><div class="d-pal-l"></div></div>');
    box = $(app, '.d-pal'); var inp = $(box, 'input'), list = $(box, '.d-pal-l');
    box.style.left = pal.offsetLeft + 'px'; box.style.width = pal.offsetWidth + 'px';
    var names = Object.keys(S);
    var fill = function () {
      var q = inp.value.trim().toLowerCase(), hit = names.filter(function (n) { return n.indexOf(q) >= 0; });
      list.innerHTML = hit.length ? hit.map(function (n, i) {
        var s = S[n]; return '<div class="d-pal-i' + (i === 0 ? ' on' : '') + '" data-n="' + n + '">' + ms('terminal', 't-teal') + '<b>' + esc(n) + '</b><span>' +
          esc(s.via.length ? s.via.join(' › ') + ' › ' + n : s.ip) + '</span></div>';
      }).join('') : '<div class="d-pal-x">' + esc(T.nomatch) + '</div>';
    };
    fill(); inp.focus({ preventScroll: true });
    inp.addEventListener('input', fill);
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { box.remove(); return; }
      if (ev.key === 'Enter') { var f = $(list, '.d-pal-i'); if (f) { box.remove(); open(S[f.dataset.n]); } }
    });
    list.addEventListener('mousedown', function (ev) { var i = ev.target.closest('.d-pal-i'); if (i) { ev.preventDefault(); box.remove(); open(S[i.dataset.n]); } });
    inp.addEventListener('blur', function () { later(150, function () { if (box.isConnected) box.remove(); }); });
  }
  function search() {
    var box = $(app, '.w-search'); if ($(box, 'input')) return;
    var label = box.lastChild; box.insertAdjacentHTML('beforeend', '<input class="d-srch" placeholder="' + esc(T.search) + '" autocomplete="off" spellcheck="false">');
    if (label && label.nodeType === 3) label.textContent = '';
    var inp = $(box, 'input'); inp.focus({ preventScroll: true });
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase(), rows = $$(tree, '.a-row');
      if (!q) { rows.forEach(function (r) { r.classList.remove('d-miss', 'd-hit'); }); return; }
      rows.forEach(function (r) { r.classList.add('d-miss'); r.classList.remove('d-hit'); });
      rows.forEach(function (r) {
        if ((r.dataset.id || '').indexOf(q) < 0 && $(r, '.a-nm').textContent.toLowerCase().indexOf(q) < 0) return;
        for (var x = r; x; x = x.dataset.parent ? $(tree, '.a-row[data-id="' + x.dataset.parent + '"]') : null) { x.classList.remove('d-miss'); x.classList.add('d-hit'); }
      });
    });
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { inp.value = ''; inp.dispatchEvent(new Event('input')); inp.blur(); } });
  }
  app.addEventListener('click', function (ev) {
    var t = ev.target;
    var tabEl = t.closest('.w-tab');
    if (tabEl) { var tb = tabs.filter(function (x) { return x.id === tabEl.dataset.tab; })[0]; if (t.closest('.x')) close(tb); else if (tb) select(tb); return; }
    if (t.closest('.w-plus') || t.closest('.w-tl .w2')) { open(local); return; }
    if (t.closest('.d-files') || t.closest('.a-grp') && t.textContent === 'folder') { toggleFiles(); return; }
    if (t.closest('.d-sr') || t.closest('.a-grp') && t.textContent === 'splitscreen_right') { split('sr'); return; }
    if (t.closest('.d-sb')) { split('sb'); return; }
    if (t.closest('.a-grp') && t.textContent === 'lock') { lock(); return; }
    if (t.closest('.d-unlock')) { var lk = $(app, '.d-lock'); lk.classList.add('ok'); later(650, function () { lk.remove(); focusIn(); }); return; }
    if (t.closest('.d-ai')) { aiOn = !aiOn; renderStatus(); return; }
    if (t.closest('.w-tl .a-rb:not(.w2)') || t.closest('.d-sbtn')) { app.classList.toggle('d-noside'); return; }
    if (t.closest('.w-bar .a-rb') && !t.closest('.a-grp')) { toast(T.ai_panel, T.agentlink, '#agent'); return; }
    if (t.closest('.w-pal')) { palette(); return; }
    if (t.closest('.w-search')) { search(); return; }
    if (t.closest('.d-toast a')) return;
    if (t.closest('.w-main') && !t.closest('.d-fp')) focusIn();
  });

  // ---------- the agent's card beside the window ----------
  var card = document.querySelector('.k-float .ai-card');
  if (card) {
    var keep = card.innerHTML;
    card.addEventListener('click', function (ev) {
      if (ev.target.closest('.d-again')) { card.innerHTML = keep; card.className = card.className.replace(/ d-\w+/g, ''); return; }
      var b = ev.target.closest('.c-b > span'); if (!b) return;
      var body = function (cls, html) { card.querySelector('.c-n').outerHTML = '<div class="c-n d-res ' + cls + '">' + html + '</div>'; var cb = card.querySelector('.c-b'); cb.innerHTML = '<span class="d-again">' + esc(T.again) + '</span>'; };
      if (b.classList.contains('r')) { card.classList.add('d-run'); body('', esc(T.running)); later(1200, function () { card.classList.remove('d-run'); card.classList.add('d-done'); var n = card.querySelector('.d-res'); if (n) n.textContent = T.done; }); }
      else { card.classList.add('d-off'); body('', esc(T.declined)); }
    });
  }

  // ---------- start: the hero's own tab becomes the first live tab ----------
  var first = $(main, '.w-term');
  app.classList.add('demo');
  $(app, '.w-bar').insertAdjacentHTML('afterbegin', '<span class="d-side-l">' + $(app, '.a-lights').outerHTML + '</span><span class="a-rb d-sbtn">' + ms('view_sidebar') + '</span>');
  var t0 = makeTab(S['web-01'], first);
  t0.ok = true; t0.since = Date.now() - 60000;
  function finishIntro() {
    if (app.classList.contains('done') && !app.classList.contains('play')) return;
    $$(first, '.tl').forEach(function (l) { l.classList.add('in'); });
    app.classList.add('done'); app.classList.remove('play');
  }
  // the static last prompt of the hero turns into a live one
  var last = $$(first, '.tl').pop(); if (last) { last.classList.add('d-cur'); var cu = $(last, '.a-cur'); if (cu) cu.insertAdjacentHTML('beforebegin', '<span class="d-typed"></span>'); }
  cur = t0;
  app.addEventListener('mousedown', function () { finishIntro(); if (!cur || cur !== t0 || $(app, '.w-tabs .w-tab[data-tab]')) return; render(); }, true);
  // draw our own tab bar and status once the hero's intro has played (or at the first click)
  var wait = setInterval(function () { if (app.classList.contains('done')) { clearInterval(wait); render(); app.classList.remove('play'); } }, 300);
  setInterval(function () { if (cur && cur.ok) renderStatus(); }, 30000);
  }
})();
