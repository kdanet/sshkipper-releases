/* SSHKipper landing: ASCII helm, sticky contents, the interactive app window and chapter illustrations.
   Plain script, no dependencies. All page text lives in the HTML; this only draws the moving parts. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var RU = (root.lang || 'ru').indexOf('ru') === 0;
  var L = function (r, e) { return RU ? r : e; };
  var A = new URL('.', document.currentScript.src).href; // assets/ folder
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (x, d) { var s = (+x).toFixed(d || 0); return RU ? s.replace('.', ',') : s; };
  var ms = function (name, style, cls) { return '<span class="ms' + (cls ? ' ' + cls : '') + '" aria-hidden="true"' + (style ? ' style="' + style + '"' : '') + '>' + name + '</span>'; };

  // Minimal DOM morph: keeps elements (focus, CSS transitions) and only touches what changed.
  function morphChildren(a, b) {
    var bc = Array.prototype.slice.call(b.childNodes);
    for (var i = 0; i < bc.length; i++) {
      var x = a.childNodes[i], y = bc[i];
      if (!x) { a.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
      if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      if (x.nodeType !== 1) continue;
      var at = x.attributes;
      for (var j = at.length - 1; j >= 0; j--) if (!y.hasAttribute(at[j].name)) x.removeAttribute(at[j].name);
      var bt = y.attributes;
      for (var k = 0; k < bt.length; k++) if (x.getAttribute(bt[k].name) !== bt[k].value) x.setAttribute(bt[k].name, bt[k].value);
      morphChildren(x, y);
    }
    while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
  }
  function patch(el, html) { var t = document.createElement('div'); t.innerHTML = html; morphChildren(el, t); }

  // Runs fn on a timer only while el is on screen.
  function ticker(el, ms_, fn) {
    var visible = false, id = 0;
    var start = function () { if (!id && !REDUCE) id = setInterval(fn, ms_); };
    var stop = function () { clearInterval(id); id = 0; };
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.05 }).observe(el);
  }

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
    ticker(box, 80, draw);
  })();

  /* ---------- Sticky contents: highlight the chapter in view ---------- */
  (function toc() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    var secs = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });
    var bar = document.querySelector('.toc ol');
    if (!links.length || !bar) return;
    var cur = -1, raf = 0;
    function update() {
      raf = 0;
      var idx = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < 160) idx = i; });
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

  /* ---------- Interactive app window ---------- */
  var C = { red: '#ff453a', orange: '#ff9f0a', green: '#30d158', dim: '#98989f', ink: '#e5e5ea', blue: '#0a84ff', purple: '#bf5af2', indigo: '#5e5ce6', teal: '#40c8e0', cyan: '#64d2ff' };

  (function demo() {
    var host = document.getElementById('demo-app');
    if (!host) return;
    var ICONS = {
      brand: { img: A + 'mark-white.svg' }, folder: { ms: 'folder', c: C.blue }, terminal: { ms: 'terminal', c: C.teal },
      docker: { ms: 'deployed_code', c: C.blue }, nginx: { ms: 'language', c: C.green }, cron: { ms: 'schedule', c: C.indigo },
      supervisor: { ms: 'settings', c: C.cyan }, db: { ms: 'database', c: C.orange }, pg: { ms: 'database', c: C.cyan },
      shield: { ms: 'shield', c: C.red }, storage: { ms: 'inventory_2', c: C.indigo }, cloud: { ms: 'cloud', c: C.indigo },
      auto: { ms: 'account_tree', c: C.purple }, dash: { ms: 'speed', c: C.blue }
    };
    var tree = [
      { id: 'doc', name: 'SSHKipper', depth: 0, icon: 'brand', bold: true, parent: null, expandable: true },
      { id: 'testbed', name: 'Production', depth: 1, icon: 'folder', parent: 'doc', expandable: true },
      { id: 'bastion1', name: 'bastion1', sub: '203.0.113.10', depth: 2, icon: 'terminal', parent: 'testbed', view: 'term' },
      { id: 'bastion2', name: 'bastion2', depth: 2, icon: 'terminal', parent: 'testbed', view: 'term' },
      { id: 'target', name: 'target', depth: 2, icon: 'terminal', parent: 'testbed', view: 'term', dot: true, expandable: true },
      { id: 'docker', name: 'Docker', depth: 3, icon: 'docker', parent: 'target', view: 'docker' },
      { id: 'nginx', name: 'Nginx', depth: 3, icon: 'nginx', parent: 'target', view: 'nginx' },
      { id: 'cron', name: 'Cron', depth: 3, icon: 'cron', parent: 'target', view: 'cron' },
      { id: 'supervisor', name: 'Supervisor', depth: 3, icon: 'supervisor', parent: 'target', view: 'supervisor' },
      { id: 'firewall', name: 'Firewall', depth: 3, icon: 'shield', parent: 'target', view: 'firewall' },
      { id: 'shop', name: 'shop', sub: 'MySQL', depth: 3, icon: 'db', parent: 'target', view: 'mysql' },
      { id: 'dbs', name: L('Базы данных', 'Databases'), depth: 1, icon: 'folder', parent: 'doc', expandable: true },
      { id: 'cache', name: 'cache', sub: 'Redis', depth: 2, icon: 'db', parent: 'dbs', view: 'redis' },
      { id: 'events', name: 'events', sub: 'ClickHouse', depth: 2, icon: 'db', parent: 'dbs', view: 'clickhouse' },
      { id: 'billing', name: 'billing', sub: 'PostgreSQL', depth: 2, icon: 'pg', parent: 'dbs', view: 'postgres' },
      { id: 'storages', name: L('Хранилища', 'Storages'), depth: 1, icon: 'folder', parent: 'doc', expandable: true },
      { id: 'scratch', name: L('Бэкапы', 'Backups'), sub: 'S3', depth: 2, icon: 'storage', parent: 'storages', view: 'files' },
      { id: 'nextcloud', name: 'nextcloud', sub: 'WebDAV', depth: 2, icon: 'cloud', parent: 'storages', view: 'files' },
      { id: 'auto', name: L('Бэкап shop', 'shop backup'), depth: 1, icon: 'auto', parent: 'doc', view: 'auto' }
    ];
    var byId = {}; tree.forEach(function (x) { byId[x.id] = x; });
    var tour = [['target', []], ['target', ['target']], ['nginx', []], ['cron', []], ['supervisor', []], ['firewall', []], ['docker', []], ['shop', []],
      ['cache', ['dbs']], ['events', []], ['billing', []], ['scratch', ['storages']], ['auto', []]];
    var services = ['docker', 'nginx', 'cron', 'supervisor', 'firewall'];
    var chips = ['target', 'docker', 'nginx', 'cron', 'supervisor', 'firewall', 'shop', 'cache', 'events', 'billing', 'scratch', 'auto'];
    var termLines = [
      { t: L('Подключение к target…', 'Connecting to target…'), k: 'dim' },
      { t: L('✓ Код 2FA для ops@bastion2 подставлен автоматически из «ops»', '✓ 2FA code for ops@bastion2 filled in automatically from “ops”'), k: 'dim' },
      { t: L('✓ Код 2FA для deploy@target подставлен автоматически из «deploy»', '✓ 2FA code for deploy@target filled in automatically from “deploy”'), k: 'dim' },
      { t: 'Linux target 6.8.0-45-generic #45-Ubuntu SMP aarch64', k: 'out' },
      { t: 'Last login: Thu Oct 22 00:45:26 2026 from 10.0.12.5', k: 'out' },
      { t: 'deploy@target:~$', k: 'prompt' }
    ];
    var TC = { dim: '#a3a3aa', out: '#e6e6e6', prompt: '#4ad66d' };

    var st = { tick: 0, sel: 'target', exp: { doc: 1, testbed: 1 }, tabs: ['target'], auto: !REDUCE, tour: 0, enter: 0, w: 1180, cw: 940 };
    var visible = true;

    function addTab(tabs, id) { if (tabs.indexOf(id) >= 0) return tabs; return tabs.concat([id]).slice(-4); }
    function pick(id, keepAuto) {
      var node = byId[id]; if (!node) return;
      var p = node.parent; while (p) { st.exp[p] = 1; p = byId[p].parent; }
      if (!keepAuto) st.auto = false;
      if (node.view) {
        if (node.expandable) st.exp[id] = st.sel === id ? (st.exp[id] ? 0 : 1) : 1;
        if (st.sel !== id) st.enter = st.tick;
        st.sel = id; st.tabs = addTab(st.tabs, id);
      } else if (node.expandable) st.exp[id] = st.exp[id] ? 0 : 1;
      render();
    }
    function tourStep() {
      var i = (st.tour + 1) % tour.length, sel = tour[i][0];
      if (i === 0) { st.exp = { doc: 1, testbed: 1 }; st.tabs = ['target']; }
      tour[i][1].forEach(function (e) { st.exp[e] = 1; });
      st.tabs = i === 0 ? ['target'] : addTab(st.tabs, sel);
      if (sel !== st.sel) st.enter = st.tick;
      st.tour = i; st.sel = sel;
    }

    function build(tick, since) {
      var cell = function (t, color, mono) { return { t: String(t), color: color || C.ink, mono: !!mono }; };
      var w = function (b, amp, k) { return Math.round(b + Math.sin(tick * 0.9 + k) * amp); };
      var sec = 59 - (Math.floor(tick * 0.7) % 60);
      var apiR = w(66, 6, 1), shopR = w(122, 9, 2), total = apiR + shopR + 9;
      var banned = 5 + (Math.floor(tick / 6) % 3);
      var views = {
        nginx: { title: 'Nginx · target', meta: 'nginx 1.26 · ' + L('4 сайта', '4 sites') + ' · ' + total + ' ' + L('запр/мин', 'req/min'), logo: 'nginx', action: L('Управление nginx', 'Manage nginx'),
          stats: [[total, L('запросов/мин', 'requests/min')], [num(5.3, 1) + ' %', L('ошибки 5xx', '5xx errors'), C.red], [num(2.8, 1) + ' %', L('ответы 4xx', '4xx responses')],
            [num(1.2, 1) + L(' с', ' s'), L('p95 ответа', 'p95 response'), C.orange], ['1', L('соединения', 'connections')], ['250', L('error.log, час', 'error.log, hour'), C.red], [L('22 ч 20 мин', '22 h 20 min'), L('время работы', 'uptime')]],
          cols: [L('Сайт', 'Site'), L('Адреса', 'Listen'), L('Куда', 'Upstream'), L('Запр/мин', 'Req/min'), '5xx', 'p95'], fr: [1.1, 1.3, 2, .8, .7, .7], keep: [0, 3, 4],
          rows: [
            [cell('api.test'), cell('80'), cell('proxy_pass http://127.0.0.1:8081'), cell(apiR), cell(num(3.3, 1) + ' %', C.orange), cell(L('602 мс', '602 ms'))],
            [cell('status.local'), cell('127.0.0.1:8080'), cell(''), cell(num(8.8, 1), C.dim), cell('0 %', C.dim), cell('')],
            [cell(L('по умолчанию :80', 'default :80')), cell('80 default'), cell('try_files $uri $uri/ =404'), cell(num(8.8, 1), C.dim), cell('0 %', C.dim), cell('')],
            [cell('shop.test'), cell('80'), cell('proxy_pass http://shop_backend'), cell(shopR), cell(num(15.1, 1) + ' %', C.red), cell(num(1.2, 1) + L(' с', ' s'), C.orange)]
          ] },
        cron: { title: 'Cron · target', meta: L('5 задач · часовой пояс Europe/Moscow', '5 jobs · time zone Europe/Moscow'), ms: 'schedule', msc: C.indigo, action: L('Журнал cron', 'Cron log'),
          cols: [L('Задача', 'Job'), L('Расписание', 'Schedule'), L('Следующий запуск', 'Next run'), L('Пользователь', 'User'), L('Источник', 'Source')], fr: [1.6, 1.4, 1.2, .8, 1.2], keep: [0, 2],
          rows: [
            [cell('backup-shop.sh', 0, 1), cell(L('каждый день в 03:00', 'every day at 03:00')), cell(L('через 6 ч 12 мин', 'in 6 h 12 min')), cell('root'), cell('/etc/cron.d/backup', C.dim, 1)],
            [cell('certbot renew', 0, 1), cell(L('дважды в день', 'twice a day')), cell(L('через 2 ч 41 мин', 'in 2 h 41 min')), cell('root'), cell('/etc/cron.d/certbot', C.dim, 1)],
            [cell('php artisan schedule:run', 0, 1), cell(L('каждую минуту', 'every minute')), cell(L('через ' + sec + ' с', 'in ' + sec + ' s'), C.green), cell('deploy'), cell('crontab deploy', C.dim, 1)],
            [cell('logrotate', 0, 1), cell(L('ежедневно', 'daily')), cell(L('через anacron', 'via anacron'), C.dim), cell('root'), cell('/etc/cron.daily', C.dim, 1)],
            [cell('cleanup-tmp', 0, 1), cell(L('по воскресеньям в 04:30', 'Sundays at 04:30')), cell(L('через 3 д 11 ч', 'in 3 d 11 h')), cell('root'), cell('crontab root', C.dim, 1)]
          ] },
        supervisor: { title: 'Supervisor · target', meta: L('5 программ · 4 работают', '5 programs · 4 running'), ms: 'settings', msc: C.cyan, action: L('Применить (update)…', 'Apply (update)…'),
          cols: [L('Программа', 'Program'), L('Состояние', 'State'), 'PID', L('Работает', 'Uptime'), L('Описание', 'Description')], fr: [1.3, 1, .6, .9, 2], keep: [0, 1, 3],
          rows: [
            [cell('shop-worker:00', 0, 1), cell(L('работает', 'running'), C.green), cell('2141'), cell(L('9 д 8 ч', '9 d 8 h')), cell('pid 2141, uptime 9 days, 8:02:11', C.dim)],
            [cell('shop-worker:01', 0, 1), cell(L('работает', 'running'), C.green), cell('2142'), cell(L('9 д 8 ч', '9 d 8 h')), cell('pid 2142, uptime 9 days, 8:02:10', C.dim)],
            [cell('queue-scheduler', 0, 1), cell(L('работает', 'running'), C.green), cell('3310'), cell(L('2 ч 14 мин', '2 h 14 min')), cell('pid 3310, uptime 2:14:37', C.dim)],
            [cell('horizon', 0, 1), cell(L('работает', 'running'), C.green), cell('4471'), cell(Math.floor(tick * 0.7) + L(' с', ' s')), cell('pid 4471, uptime 0:00:' + String(Math.floor(tick * 0.7) % 60).padStart(2, '0'), C.dim)],
            [cell('mailer', 0, 1), cell(L('не запускается', 'fatal'), C.red), cell('—', C.dim), cell('—', C.dim), cell('Exited too quickly (process log may have details)', C.red)]
          ] },
        firewall: { title: 'Firewall · target', meta: 'ufw · fail2ban: ' + L('3 правила · ' + banned + ' адресов заблокировано', '3 jails · ' + banned + ' addresses banned'), ms: 'shield', msc: C.red, action: L('Разбанить…', 'Unban…'),
          cols: ['Jail', L('Правило', 'Rule'), L('Забанены', 'Banned'), L('Всего', 'Total'), L('Последний', 'Last')], fr: [1.2, 1.6, .9, .7, 1.6], keep: [0, 2, 3],
          rows: [
            [cell('sshd', 0, 1), cell(L('5 ошибок входа за 10 мин', '5 failed logins in 10 min'), C.dim), cell(String(banned), C.red), cell('142'), cell('203.0.113.91 · ' + L(sec + ' с назад', sec + ' s ago'), C.dim, 1)],
            [cell('nginx-limit-req', 0, 1), cell(L('лимит запросов nginx', 'nginx request limit'), C.dim), cell('2', C.orange), cell('37'), cell('198.51.100.12 · ' + L('4 мин назад', '4 min ago'), C.dim, 1)],
            [cell('recidive', 0, 1), cell(L('повторные баны, на неделю', 'repeat bans, for a week'), C.dim), cell('0', C.dim), cell('6'), cell(L('вчера 22:14', 'yesterday 22:14'), C.dim)]
          ] },
        docker: { title: 'Docker · target', meta: L('Compose: shop · 4 контейнера, все работают', 'Compose: shop · 4 containers, all running'), logo: 'docker', action: 'Compose',
          cols: [L('Контейнер', 'Container'), L('Образ', 'Image'), L('Состояние', 'State'), 'CPU', L('Память', 'Memory'), L('Порты', 'Ports')], fr: [1.1, 1.9, 1, .7, .8, 1], keep: [0, 2, 3],
          rows: [
            [cell('shop_backend', 0, 1), cell('shop/backend:1.8.2', C.dim, 1), cell(L('работает 9 д', 'up 9 d'), C.green), cell(num(12 + Math.sin(tick) * 3, 1) + ' %'), cell(L('312 МБ', '312 MB')), cell('8081→80', C.dim, 1)],
            [cell('dbmysql', 0, 1), cell('percona/percona-server:8.0', C.dim, 1), cell(L('работает 9 д', 'up 9 d'), C.green), cell(num(3 + Math.sin(tick + 1) * 1.2, 1) + ' %'), cell(L('1,1 ГБ', '1.1 GB')), cell('3306', C.dim, 1)],
            [cell('redis', 0, 1), cell('redis:7.4-alpine', C.dim, 1), cell(L('работает 9 д', 'up 9 d'), C.green), cell(num(0.4 + Math.abs(Math.sin(tick + 2)) * 0.3, 1) + ' %'), cell(L('24 МБ', '24 MB')), cell('6379', C.dim, 1)],
            [cell('clickhouse', 0, 1), cell('clickhouse/clickhouse-server:24.8', C.dim, 1), cell(L('работает 2 д', 'up 2 d'), C.green), cell(num(5.8 + Math.sin(tick + 3) * 2, 1) + ' %'), cell(L('880 МБ', '880 MB')), cell('8123, 9000', C.dim, 1)]
          ] },
        mysql: { title: 'shop · MySQL', meta: L('Percona Server 8.0 · через target · 14 таблиц', 'Percona Server 8.0 · via target · 14 tables'), logo: 'mysql', action: L('Новый запрос', 'New query'),
          query: "SELECT id, customer, total, status, created_at FROM orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 50;",
          queryMeta: L('50 строк · 0,018 с', '50 rows · 0.018 s'), ai: L('AI-фильтр: «оплаченные за сегодня»', 'AI filter: “paid today”'),
          cols: ['id', 'customer', 'total', 'status', 'created_at'], fr: [.6, 1.6, .9, .8, 1.4], keep: [0, 1, 2],
          rows: [['10482', 'anna@shop.test', '4 290.00', '2026-10-22 00:41:12'], ['10481', 'mark.v@shop.test', '1 150.00', '2026-10-22 00:38:57'],
            ['10479', 'olga@shop.test', '12 700.00', '2026-10-22 00:22:04'], ['10476', 'dev@acme.test', '890.00', '2026-10-21 23:58:31'],
            ['10473', 'kim@shop.test', '3 345.50', '2026-10-21 23:40:10'], ['10470', 'ivan@shop.test', '560.00', '2026-10-21 23:12:45']]
            .map(function (r) { return [cell(r[0], C.dim, 1), cell(r[1], 0, 1), cell(r[2], 0, 1), cell('paid', C.green, 1), cell(r[3], C.dim, 1)]; }) },
        redis: { title: 'cache · Redis', meta: L('Redis 7.4 · db0 · 12 418 ключей · через target', 'Redis 7.4 · db0 · 12,418 keys · via target'), logo: 'redis', action: L('Консоль', 'Console'),
          query: 'SCAN 0 MATCH session:* COUNT 100', queryMeta: L('5 ключей показано', '5 keys shown'),
          cols: [L('Ключ', 'Key'), L('Тип', 'Type'), 'TTL', L('Размер', 'Size')], fr: [2, .8, 1, .8], keep: [0, 1, 2],
          rows: [
            [cell('session:9f2c1a7e', 0, 1), cell('hash', C.purple), cell(L('23 мин', '23 min')), cell(L('1,2 КБ', '1.2 KB'))],
            [cell('session:77ab03d4', 0, 1), cell('hash', C.purple), cell(L('58 мин', '58 min')), cell(L('0,9 КБ', '0.9 KB'))],
            [cell('queue:mail', 0, 1), cell('list', C.blue), cell('—', C.dim), cell(L('37 эл.', '37 items'))],
            [cell('rate:api:203.0.113.7', 0, 1), cell('string', C.green), cell(sec + L(' с', ' s'), C.orange), cell('8 B')],
            [cell('cart:10482', 0, 1), cell('hash', C.purple), cell(L('2 д', '2 d')), cell(L('2,4 КБ', '2.4 KB'))]
          ] },
        postgres: { title: 'billing · PostgreSQL', meta: L('PostgreSQL 17 · схема public · через target', 'PostgreSQL 17 · schema public · via target'), ms: 'database', msc: C.cyan, action: L('Новый запрос', 'New query'),
          query: "SELECT plan, count(*) AS subs, sum(amount) AS mrr FROM subscriptions WHERE status = 'active' GROUP BY plan ORDER BY mrr DESC;",
          queryMeta: L('4 строки · 0,011 с', '4 rows · 0.011 s'), ai: L('Режим: Production', 'Mode: Production'),
          cols: ['plan', 'subs', 'mrr'], fr: [1.4, 1, 1], keep: [0, 1, 2],
          rows: [['business', '312', '936 000.00'], ['team', '1 208', '724 800.00'], ['pro', '2 941', '411 740.00'], ['starter', '5 377', '161 310.00']]
            .map(function (r) { return [cell(r[0], 0, 1), cell(r[1], 0, 1), cell(r[2], 0, 1)]; }) },
        clickhouse: { title: 'events · ClickHouse', meta: L('ClickHouse 24.8 · через target', 'ClickHouse 24.8 · via target'), logo: 'clickhouse', action: L('Новый запрос', 'New query'),
          query: 'SELECT toStartOfHour(ts) AS hour, count() AS hits, uniq(user_id) AS users FROM events WHERE ts > now() - INTERVAL 6 HOUR GROUP BY hour ORDER BY hour',
          queryMeta: L('6 строк · 0,042 с · прочитано 18,4 млн строк', '6 rows · 0.042 s · 18.4M rows read'), ai: L('AI: «сколько пользователей за 6 часов»', 'AI: “users over the last 6 hours”'),
          cols: ['hour', 'hits', 'users'], fr: [1.4, 1, 1], keep: [0, 1, 2],
          rows: [['2026-10-21 19:00', '3 104 220', '48 113'], ['2026-10-21 20:00', '3 412 905', '51 870'], ['2026-10-21 21:00', '3 288 017', '50 244'],
            ['2026-10-21 22:00', '2 940 551', '44 092'], ['2026-10-21 23:00', '2 471 336', '37 518'], ['2026-10-22 00:00', '1 198 004', '19 265']]
            .map(function (r) { return [cell(r[0], C.dim, 1), cell(r[1], 0, 1), cell(r[2], 0, 1)]; }) }
      };
      var prog = Math.min(100, Math.max(0, (since - 2) * 7));
      var files = {
        prog: prog, color: prog >= 100 ? C.green : C.blue,
        text: prog >= 100 ? L('Готово · 412 МБ', 'Done · 412 MB') : Math.round(prog * 4.12) + ' / 412 ' + L('МБ', 'MB') + ' · ' + L('48 МБ/с', '48 MB/s')
      };
      var run = Math.floor(Math.max(0, since - 1) / 2) % 10;
      return { views: views, files: files, run: run };
    }

    function treeHTML() {
      var vi = 0, selIdx = -1, rows = '';
      var vis = function (x) { var p = x.parent; while (p) { if (!st.exp[p]) return false; p = byId[p].parent; } return true; };
      tree.forEach(function (x) {
        var v = vis(x), ic = ICONS[x.icon], sel = x.id === st.sel;
        if (v) { if (sel) selIdx = vi; vi++; }
        var sib = tree.filter(function (y) { return y.parent === x.parent; }).indexOf(x);
        var style = 'height:' + (v ? 28 : 0) + 'px;opacity:' + (v ? 1 : 0) + ';transform:translateX(' + (v ? 0 : -10) + 'px);transition-delay:0s,' + (v ? sib * 45 : 0) + 'ms,' + (v ? sib * 45 : 0) + 'ms';
        var attrs = ' data-pick="' + x.id + '"' + (v ? '' : ' tabindex="-1" aria-hidden="true"') +
          (x.expandable ? ' aria-expanded="' + (st.exp[x.id] ? 'true' : 'false') + '"' : '') + (x.view ? ' aria-pressed="' + sel + '"' : '');
        rows += '<li><button type="button" class="tr" style="' + style + '"' + attrs + '><span style="padding-left:' + (10 + x.depth * 16) + 'px">' +
          ms('chevron_right', 'visibility:' + (x.expandable ? 'visible' : 'hidden') + ';transform:rotate(' + (st.exp[x.id] ? 90 : 0) + 'deg)', 'chev') +
          (ic.img ? '<img src="' + ic.img + '" alt="">' : ms(ic.ms, 'color:' + ic.c, 'f ico')) +
          '<span class="nm" style="font-weight:' + (x.bold || sel ? 600 : 400) + '">' + esc(x.name) + '</span>' +
          (x.sub ? '<span class="sb">' + esc(x.sub) + '</span>' : '') + (x.dot ? '<span class="on" title="' + L('подключено', 'connected') + '"></span>' : '') +
          '</span></button></li>';
      });
      return '<ul class="tree"><li aria-hidden="true" class="selbar" style="top:' + Math.max(0, selIdx) * 28 + 'px;opacity:' + (selIdx < 0 ? 0 : 1) + '"></li>' + rows + '</ul>';
    }

    function gridView(v, act, narrow) {
      var idx = narrow ? v.keep : v.cols.map(function (_, i) { return i; });
      var grid = 'grid-template-columns:' + idx.map(function (i) { return v.fr[i] + 'fr'; }).join(' ');
      var h = '<div class="vh">' + (v.logo ? '<img src="' + A + 'icons/' + v.logo + '.svg" alt="">' : ms(v.ms, 'color:' + v.msc, 'f')) +
        '<b>' + esc(v.title) + '</b><span class="m">' + esc(v.meta) + '</span><span class="act">' + esc(v.action) + '</span></div>';
      if (v.stats) {
        h += '<div class="stats">' + v.stats.slice(0, narrow ? 4 : 7).map(function (s) { return '<div><b style="color:' + (s[2] || C.ink) + '">' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>';
      }
      if (v.query) {
        h += '<div class="query"><code>' + esc(v.query) + '</code><div class="qm"><span>' + esc(v.queryMeta) + '</span>' + (v.ai ? '<span class="aipill">✦ ' + esc(v.ai) + '</span>' : '') + '</div></div>';
      }
      h += '<div class="row hd" style="' + grid + '">' + idx.map(function (i) { return '<span>' + esc(v.cols[i]) + '</span>'; }).join('') + '</div>';
      v.rows.forEach(function (r, ri) {
        h += '<div class="row" style="' + grid + ';background:' + (ri % 2 ? 'rgba(255,255,255,.025)' : 'transparent') + ';opacity:' + (act ? 1 : 0) + ';transform:' + (act ? 'none' : 'translateY(8px)') + ';transition-delay:' + (act ? 120 + ri * 55 : 0) + 'ms">' +
          idx.map(function (i) { var c = r[i]; return '<span' + (c.mono ? ' class="mn"' : '') + ' style="color:' + c.color + '">' + esc(c.t) + '</span>'; }).join('') + '</div>';
      });
      return h;
    }

    function filesView(f, narrow) {
      var leftRows = [['folder', 'mydumper', '—', L('сегодня 03:00', 'today 03:00')], ['draft', 'shop-2026-10-22_03-00.sql.zst', L('412 МБ', '412 MB'), L('сегодня 03:04', 'today 03:04')],
        ['draft', 'shop-2026-10-21_03-00.sql.zst', L('408 МБ', '408 MB'), L('вчера 03:04', 'yesterday 03:04')], ['draft', 'shop-2026-10-20_03-00.sql.zst', L('405 МБ', '405 MB'), '20.10.2026'],
        ['draft', 'shop-2026-10-19_03-00.sql.zst', L('401 МБ', '401 MB'), '19.10.2026']].slice(0, narrow ? 3 : 5);
      var rightRows = [['shop-2026-10-21_03-00.sql.zst', L('408 МБ', '408 MB')], ['shop-2026-10-20_03-00.sql.zst', L('405 МБ', '405 MB')], ['shop-2026-10-19_03-00.sql.zst', L('401 МБ', '401 MB')]].slice(0, narrow ? 2 : 3);
      var dest = st.sel === 'nextcloud' ? { proto: 'WebDAV', title: 'nextcloud', path: '/Backups/shop/' } : { proto: 'S3', title: L('Бэкапы', 'Backups'), path: 'backups/shop/' };
      var lcol = narrow ? '18px minmax(0,1fr) 70px' : '18px minmax(0,1fr) 70px 110px';
      var h = '<div class="panes"><div class="pane"><div class="ph"><span class="proto" style="background:rgba(64,200,224,.2);color:#40c8e0">SFTP</span><b>target</b><span class="p">/var/backups/shop</span></div>' +
        leftRows.map(function (r, i) {
          return '<div class="fr" style="grid-template-columns:' + lcol + ';background:' + (i === 1 ? 'rgba(10,132,255,.32)' : 'transparent') + '">' + ms(r[0], 'color:' + (r[0] === 'folder' ? C.blue : C.dim), 'f') +
            '<span>' + r[1] + '</span><span class="r">' + r[2] + '</span>' + (narrow ? '' : '<span style="color:#98989f">' + r[3] + '</span>') + '</div>';
        }).join('') + '</div>' +
        '<div class="pane"><div class="ph"><span class="proto" style="background:rgba(94,92,230,.28);color:#a5a4ff">' + dest.proto + '</span><b>' + esc(dest.title) + '</b><span class="p">' + dest.path + '</span></div>' +
        '<div class="fr" style="grid-template-columns:18px minmax(0,1fr) 90px;height:34px;background:rgba(10,132,255,.1)">' + ms('download', 'color:' + f.color) + '<span>shop-2026-10-22_03-00.sql.zst</span><div class="bar5"><i style="width:' + f.prog + '%;background:' + f.color + '"></i></div></div>' +
        rightRows.map(function (r) { return '<div class="fr" style="grid-template-columns:18px minmax(0,1fr) 70px">' + ms('draft', 'color:' + C.dim) + '<span>' + r[0] + '</span><span class="r">' + r[1] + '</span></div>'; }).join('') +
        '</div></div><div class="ffoot">' + ms('swap_horiz', 'color:#0a84ff;font-size:17px') + '<span class="l">' +
        (dest.proto === 'S3' ? L('Сервер → S3 напрямую, без загрузки на Mac', 'Server → S3 directly, nothing passes through the Mac') : L('Копирование target → WebDAV через очередь передач', 'Copying target → WebDAV through the transfer queue')) +
        '</span><span class="v" style="color:' + f.color + '">' + f.text + '</span></div>';
      return h;
    }

    function autoView(run, narrow) {
      var N = [[L('Расписание', 'Schedule'), L('каждый день в 03:00', 'daily at 03:00'), 'schedule', C.indigo], [L('Подключение', 'Connection'), 'shop · MySQL', 'database', C.orange],
        [L('Дамп MySQL', 'MySQL dump'), L('готовый модуль', 'ready-made module'), 'terminal', C.blue], [L('Сжать', 'Compress'), 'zstd', 'compress', C.orange],
        [L('В хранилище', 'To storage'), L('Бэкапы · S3', 'Backups · S3'), 'cloud_upload', C.teal], [L('Ротация', 'Rotation'), L('последние 14', 'keep 14'), 'autorenew', C.teal],
        [L('Итог', 'Summary'), L('сообщить при проблемах', 'notify on problems'), 'flag', C.green]];
      var pos = [[36, 70], [256, 70], [476, 70], [696, 70], [696, 260], [476, 260], [256, 260]];
      var nodes = N.map(function (n, i) {
        var s = i < run ? 'done' : i === run ? 'run' : 'idle';
        var style = (narrow ? '' : 'left:' + pos[i][0] + 'px;top:' + pos[i][1] + 'px;') + 'border-color:' + (s === 'run' ? C.blue : s === 'done' ? 'rgba(48,209,88,.6)' : 'rgba(255,255,255,.12)') + ';box-shadow:' + (s === 'run' ? '0 0 0 4px rgba(10,132,255,.25)' : 'none');
        return '<div class="node" style="' + style + '"><span class="tile" style="background:' + n[3] + '33;color:' + n[3] + '">' + ms(n[2], '', 'f') + '</span><span class="tx"><b>' + esc(n[0]) + '</b><span>' + esc(n[1]) + '</span></span>' +
          ms(s === 'done' ? 'check_circle' : s === 'run' ? 'progress_activity' : 'radio_button_unchecked', 'color:' + (s === 'done' ? C.green : s === 'run' ? C.blue : 'rgba(255,255,255,.25)'), 'f mk' + (s === 'run' ? ' spin' : '')) + '</div>';
      }).join('');
      var status = run >= 7 ? L('Последний запуск: успешно · 412 МБ · 1 мин 48 с', 'Last run: success · 412 MB · 1 min 48 s') : run === 0 ? L('Ожидание запуска…', 'Waiting to start…') : L('Выполняется: шаг ' + run + ' из 7', 'Running: step ' + run + ' of 7');
      var stat = '<div class="astat" style="color:' + (run >= 7 ? C.green : '#4d9dff') + '">' + status + '</div>';
      if (narrow) return '<div class="alist">' + nodes + '</div>' + stat;
      var links = '';
      for (var i = 0; i < 6; i++) {
        var a = pos[i], b = pos[i + 1], col = i < run ? C.green : i === run ? C.blue : 'rgba(255,255,255,.18)';
        if (a[1] === b[1]) { var x1 = Math.min(a[0], b[0]) + 188, x2 = Math.max(a[0], b[0]); links += '<div class="link" style="left:' + x1 + 'px;top:' + (a[1] + 34) + 'px;width:' + (x2 - x1) + 'px;height:2px;background:' + col + '"></div>'; }
        else links += '<div class="link" style="left:' + (a[0] + 94) + 'px;top:' + (a[1] + 70) + 'px;width:2px;height:' + (b[1] - a[1] - 70) + 'px;background:' + col + '"></div>';
      }
      var sc = Math.min(1, st.cw / 940);
      return '<div class="canvas" style="transform:scale(' + sc.toFixed(3) + ')">' + links + nodes + '</div>' + stat;
    }

    function render() {
      var narrow = st.w <= 640;
      var node = byId[st.sel], cur = node.view, since = st.tick - st.enter;
      var B = build(st.tick, since);
      var titleOf = function (id) { var x = byId[id]; if (x.view === 'term') return x.name; if (B.views[x.view]) return B.views[x.view].title; if (x.view === 'auto') return x.name; return x.name + (x.sub ? ' · ' + x.sub : ''); };
      var cls = function (id) { return 'view ' + (cur === id ? 'cur' : 'off'); };
      var hidden = function (id) { return cur === id ? '' : ' aria-hidden="true"'; };
      var isSvc = services.indexOf(cur) >= 0, isAuto = cur === 'auto';

      // terminal
      var lines;
      if (st.sel === 'target') lines = termLines.map(function (l) { return { t: l.t, c: TC[l.k] }; });
      else lines = [{ t: L('Подключение к ', 'Connecting to ') + st.sel + '…', c: TC.dim }, { t: 'Linux ' + st.sel + ' 6.8.0-45-generic #45-Ubuntu SMP aarch64', c: TC.out }, { t: 'ops@' + st.sel + ':~$', c: TC.prompt }];
      var tn = REDUCE ? lines.length : Math.min(lines.length, since + 1);
      // An outgoing terminal keeps its old text while it fades out.
      var term = cur !== 'term' && st.termHTML != null ? st.termHTML : lines.slice(0, tn).map(function (l, i) { return '<div style="color:' + l.c + '">' + esc(l.t) + (i === tn - 1 && tn === lines.length ? '<span class="cursor" style="opacity:' + (st.tick % 2 ? 1 : 0) + '"></span>' : '') + '</div>'; }).join('');

      st.termHTML = term;

      // status bar
      var status = '';
      if (isSvc) {
        status = [{ id: null, label: L('Дашборд', 'Dashboard'), icon: 'dash' }].concat(services.map(function (id) { return { id: id, label: byId[id].name, icon: byId[id].icon }; })).map(function (b) {
          var a = b.id === cur, ic = ICONS[b.icon];
          return '<button type="button" class="svcb" data-pick="' + (b.id || 'target') + '" aria-pressed="' + a + '" style="background:' + (a ? '#003176' : 'transparent') + ';color:' + (a ? '#4d9dff' : '#e5e5ea') + '">' + ms(ic.ms, 'font-size:15px;color:' + (a ? '#4d9dff' : ic.c), 'f') + esc(b.label) + '</button>';
        }).join('');
      } else if (isAuto) {
        status = '<span style="color:#98989f;padding-left:4px">' + L('Все автоматизации', 'All automations') + ' ›</span><b style="margin-right:6px">' + esc(node.name) + '</b>' +
          [L('Обзор', 'Overview'), L('Полотно', 'Canvas'), L('Шаги', 'Steps'), L('История', 'History')].map(function (x, i) { return '<span style="padding:3px 9px;border-radius:5px;background:' + (i === 1 ? 'rgba(255,255,255,.14)' : 'transparent') + '">' + x + '</span>'; }).join('') +
          '<span style="margin-left:auto;padding:3px 9px;border-radius:5px;background:rgba(255,255,255,.08);font-size:11.5px">' + L('Когда: каждый день в 03:00', 'When: daily at 03:00') + '</span><span style="padding:3px 10px;border-radius:5px;background:rgba(255,255,255,.12);color:#fff;font-size:11.5px;font-weight:600">▶ ' + L('Запустить', 'Run') + '</span>';
      } else {
        var pre = '', last = '';
        var pathMap = { target: ['bastion1 › bastion2 ›', 'deploy@target'], bastion1: ['', 'ops@bastion1'], bastion2: ['bastion1 ›', 'ops@bastion2'] };
        if (cur === 'term') { pre = pathMap[st.sel][0]; last = pathMap[st.sel][1]; }
        else if (cur === 'files') { pre = 'target ⇄'; last = node.sub + ' · ' + node.name; }
        else { pre = L('через', 'via') + ' bastion1 › bastion2 › target ›'; last = node.name; }
        status = '<span style="width:8px;height:8px;border-radius:50%;background:#30d158;margin:0 2px 0 4px;flex:none"></span><b>' + L('Подключено', 'Connected') + '</b><span class="path-pre">' + esc(pre) + '</span><b>' + esc(last) + '</b>' +
          '<span class="path-end"><span>✦ ' + L('AI выкл', 'AI off') + '</span><span>' + L('Файлы', 'Files') + '</span></span>';
      }

      var tabs = st.tabs.map(function (id) {
        var x = byId[id], ic = ICONS[x.icon], a = id === st.sel;
        return '<button type="button" class="tab" data-pick="' + id + '" aria-pressed="' + a + '" style="background:' + (a ? '#1e2c42' : 'transparent') + ';color:' + (a ? '#fff' : '#98989f') + ';font-weight:' + (a ? 600 : 400) + '">' +
          ms(ic.ms || 'sailing', 'font-size:14px;color:' + (ic.c || '#3D8BFF'), 'f') + '<span class="t">' + esc(titleOf(id)) + '</span><span aria-hidden="true" style="font-size:13px;color:#98989f;visibility:' + (a ? 'visible' : 'hidden') + '">×</span></button>';
      }).join('');

      var gridIds = ['nginx', 'cron', 'supervisor', 'firewall', 'docker', 'mysql', 'redis', 'clickhouse', 'postgres'];
      var views = '<div class="' + cls('term') + ' term"' + hidden('term') + '>' + term + '</div>' +
        gridIds.map(function (id) { return '<div class="' + cls(id) + ' grid"' + hidden(id) + '>' + gridView(B.views[id], cur === id, narrow) + '</div>'; }).join('') +
        '<div class="' + cls('files') + ' files"' + hidden('files') + '>' + filesView(B.files, narrow) + '</div>' +
        '<div class="' + cls('auto') + ' auto"' + hidden('auto') + '>' + autoView(B.run, narrow || st.cw < 620) + '</div>';

      var chipBar = '<div class="dchips" role="group" aria-label="' + L('Что показать', 'What to show') + '">' + chips.map(function (id) {
        var x = byId[id], ic = ICONS[x.icon];
        return '<button type="button" data-pick="' + id + '" aria-pressed="' + (st.sel === id) + '">' + ms(ic.ms, 'font-size:15px;color:' + ic.c, 'f') + esc(x.name) + '</button>';
      }).join('') + '</div>';

      var autoOn = st.auto;
      var html = chipBar +
        '<div class="dw">' +
        '<nav class="side" aria-label="' + L('Дерево подключений (демо)', 'Connection tree (demo)') + '"><div class="side-bar" aria-hidden="true"><span class="lights"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></span>' +
        '<span class="pillbtn" style="margin-left:14px">' + ms('view_sidebar', 'font-size:17px') + '</span><span class="pillbtn" style="width:44px;border-radius:15px">' + ms('add', 'font-size:18px') + '</span></div>' +
        '<div class="side-search" aria-hidden="true">' + ms('search', 'font-size:15px') + L('Поиск подключений', 'Search connections') + '</div>' + treeHTML() + '</nav>' +
        '<div class="main"><div class="titlebar"><span class="wtitle">' + esc(titleOf(st.sel)) + '</span>' +
        '<span class="palette" aria-hidden="true"><span>' + ms('search', 'font-size:16px') + '<span class="grow">' + L('Подключиться к серверу…', 'Connect to server…') + '</span><span class="k">⇧⌘O</span></span></span>' +
        '<span class="tools" aria-hidden="true"><span>' + ms('folder_open') + '</span><span>' + ms('splitscreen_right') + '</span><span>' + ms('lock') + '</span></span>' +
        '<span class="pillbtn aib" aria-hidden="true">' + ms('auto_awesome', 'font-size:16px') + '</span></div>' +
        '<div class="tabs">' + tabs + '<span class="plus" aria-hidden="true">+</span></div>' +
        '<div class="status">' + status + '</div><div class="body">' + views + '</div></div></div>' +
        '<div class="demo-foot"><button type="button" class="tour-btn" data-tour aria-pressed="' + autoOn + '"><i style="background:' + (autoOn ? '#30d158' : '#98989f') + '"></i>' +
        (autoOn ? L('Автотур идёт · пауза', 'Tour playing · pause') : L('Автотур на паузе · продолжить', 'Tour paused · resume')) + '</button></div>';
      patch(host, html);
      // Keep the chosen chip visible on phones (the tour moves the selection too).
      if (narrow && st.sel !== st.shown) {
        var sb = host.querySelector('.status'), sbt = sb && sb.querySelector('.svcb[aria-pressed="true"]');
        if (sb) sb.scrollLeft = sbt ? Math.max(0, sb.scrollLeft + sbt.getBoundingClientRect().left - sb.getBoundingClientRect().left - 12) : 0;
        var bar = host.querySelector('.dchips'), chip = bar && bar.querySelector('[aria-pressed="true"]');
        if (chip) bar.scrollTo({ left: Math.max(0, bar.scrollLeft + chip.getBoundingClientRect().left - bar.getBoundingClientRect().left - bar.clientWidth / 2 + chip.clientWidth / 2), behavior: REDUCE ? 'auto' : 'smooth' });
      }
      st.shown = st.sel;
    }

    host.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pick],[data-tour]');
      if (!t || !host.contains(t)) return;
      if (t.hasAttribute('data-tour')) { st.auto = !st.auto; st.enter = st.tick; render(); return; }
      pick(t.getAttribute('data-pick'));
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        var w = host.clientWidth, body = host.querySelector('.body');
        var cw = body ? body.clientWidth : w - 240;
        if (Math.abs(w - st.w) > 1 || Math.abs(cw - st.cw) > 1) { st.w = w; st.cw = cw; render(); }
      }).observe(host);
    }
    st.w = host.clientWidth || 1180;
    render();
    var body0 = host.querySelector('.body'); if (body0) { st.cw = body0.clientWidth; render(); }

    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.25 }).observe(host);
    if (!REDUCE) setInterval(function () {
      if (!visible || document.hidden) return;
      st.tick++;
      if (st.auto && st.tick - st.enter >= 6) tourStep();
      render();
    }, 700);
  })();

  /* ---------- Chapter illustrations ---------- */
  var KINDS = {
    terminal: { still: 0, f: function (t) {
      var ips = ['203.0.113.7', '198.51.100.24', '192.0.2.81', '203.0.113.52', '100.64.3.9'];
      var reqs = ['GET /api/orders HTTP/1.1', 'POST /api/cart HTTP/1.1', 'GET /static/app.js HTTP/2.0', 'GET /api/orders/10482 HTTP/1.1', 'GET /health HTTP/1.1', 'GET /login HTTP/1.1'];
      var sts = [200, 200, 304, 200, 201, 200, 404, 200, 502, 200, 200];
      var lines = '';
      for (var j = 0; j < 20; j++) {
        var n = t + j, s = sts[(n * 7) % sts.length];
        lines += '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#a3a3aa"><span style="color:#64d2ff">' + ips[(n * 3) % ips.length] + '</span> [00:4' + ((5 + Math.floor(n / 10)) % 10) + ':' + String((n * 7) % 60).padStart(2, '0') + '] <span style="color:#e6e6e6">"' + reqs[(n * 5) % reqs.length] + '"</span> <b style="color:' + (s >= 500 ? '#ff453a' : s >= 400 ? '#ff9f0a' : '#30d158') + '">' + s + '</b> 0.0' + (10 + (n * 13) % 80) + '</div>';
      }
      return '<div style="display:flex;flex-direction:column;background:#222224"><div style="height:32px;flex:none;display:flex;align-items:center;gap:8px;padding:0 12px;background:#2a2b30;border-bottom:1px solid #000"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span style="margin-left:8px;font-size:11.5px;color:#c7c7cc;font-weight:600">deploy@target</span><span class="mn" style="margin-left:auto;font-size:10.5px;color:#98989f">Ghostty · tmux</span></div>' +
        '<div class="mn" style="padding:6px 12px 0;font-size:11.5px;color:#4ad66d">deploy@target:~$ <span style="color:#e6e6e6">tail -f /var/log/nginx/access.log</span></div>' +
        '<div class="mn" style="flex:1;overflow:hidden;padding:4px 12px 10px;font-size:11.5px;line-height:1.62;display:flex;flex-direction:column;justify-content:flex-end">' + lines + '</div></div>';
    } },
    bastion: { still: 10, f: function (t) {
      var p = t % 14;
      var node = function (name, note, icon, on, code, codeOn, ok) {
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;min-width:0"><div class="ms f t" style="width:44px;height:44px;border-radius:12px;background:' + (on ? 'rgba(61,139,255,.16)' : '#24262e') + ';border:1.5px solid ' + (on ? '#3D8BFF' : 'rgba(255,255,255,.1)') + ';display:flex;align-items:center;justify-content:center;font-size:22px;color:' + (on ? '#6aa6ff' : '#6e6e73') + '" aria-hidden="true">' + icon + '</div>' +
          '<div class="mn" style="font-size:12px;font-weight:700">' + name + '</div><div class="hop-note" style="font-size:11px;color:#98989f">' + note + '</div>' +
          '<div class="mn t" style="height:24px;display:flex;align-items:center;gap:5px;padding:0 8px;border-radius:6px;white-space:nowrap;background:' + (ok ? 'rgba(48,209,88,.16)' : 'rgba(255,255,255,.08)') + ';font-size:11.5px;font-weight:700;color:' + (ok ? '#30d158' : '#e5e5ea') + ';opacity:' + (code && codeOn ? 1 : 0) + '">' + (code ? (ok ? '✓ ' + code : code) : '') + '</div></div>';
      };
      var status = p < 2 ? L('Подключение к bastion1…', 'Connecting to bastion1…') : p < 5 ? L('bastion2: код 2FA из «ops»…', 'bastion2: 2FA code from “ops”…') : p < 8 ? L('target: пароль и код 2FA из «deploy»…', 'target: password and 2FA code from “deploy”…') : L('✓ Подключено: deploy@target', '✓ Connected: deploy@target');
      return '<div style="display:flex;flex-direction:column;justify-content:center;padding:24px 18px;gap:26px"><div style="position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">' +
        '<div style="position:absolute;left:12.5%;right:12.5%;top:21px;height:2px;background:rgba(255,255,255,.1)"></div><div class="t" style="position:absolute;left:12.5%;top:21px;height:2px;width:' + (p >= 8 ? 75 : p >= 5 ? 50 : p >= 2 ? 25 : 0) + '%;background:#3D8BFF"></div>' +
        node('Mac', L('этот Mac', 'this Mac'), 'laptop_mac', true, '', false, false) + node('bastion1', L('ключ', 'key'), 'dns', p >= 2, '', false, false) +
        node('bastion2', L('ключ + 2FA', 'key + 2FA'), 'dns', p >= 5, '482 913', p >= 3, p >= 5) + node('target', L('пароль + 2FA', 'password + 2FA'), 'terminal', p >= 8, '730 266', p >= 6, p >= 8) +
        '</div><div class="mn" style="font-size:12px;padding:10px 12px;border-radius:8px;background:#222224;color:' + (p >= 8 ? '#30d158' : '#c7c7cc') + '">' + status + '</div></div>';
    } },
    services: { still: 3, f: function (t) {
      var req = Math.round(197 + Math.sin(t * 0.8) * 14), sec = 59 - (Math.floor(t * 0.65) % 60);
      var rows = [['Docker', 'deployed_code', '#0a84ff', L('4 контейнера', '4 containers'), '#98989f'], ['Nginx', 'language', '#30d158', req + ' ' + L('запр/мин', 'req/min'), '#98989f'],
        ['Cron', 'schedule', '#5e5ce6', L('следующая через ' + sec + ' с', 'next in ' + sec + ' s'), '#98989f'], ['Supervisor', 'settings', '#64d2ff', '4/5 · mailer: fatal', '#ff9f0a'],
        ['Firewall', 'shield', '#ff453a', L('7 адресов заблокировано', '7 addresses banned'), '#98989f']];
      var bars = '';
      for (var i = 0; i < 16; i++) { var v = 0.45 + 0.35 * Math.sin((t + i) * 0.7) + 0.15 * Math.sin((t + i) * 1.9); bars += '<div class="t" style="flex:1;height:' + Math.round(Math.max(0.12, v) * 100) + '%;background:' + (i === 15 ? '#3D8BFF' : 'rgba(61,139,255,.45)') + ';border-radius:2px 2px 0 0"></div>'; }
      return '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div style="background:#232837;padding:14px 8px;display:flex;flex-direction:column;gap:2px">' +
        '<div style="display:flex;align-items:center;gap:6px;height:30px;padding:0 8px;border-radius:7px;background:#333544">' + ms('chevron_right', 'font-size:15px;color:#98989f;transform:rotate(90deg)') + ms('terminal', 'font-size:17px;color:#40c8e0', 'f') + '<b style="font-weight:600">target</b><span style="margin-left:auto;width:7px;height:7px;border-radius:50%;background:#30d158"></span></div>' +
        rows.map(function (r) { return '<div style="display:flex;align-items:center;gap:6px;height:36px;padding:0 8px 0 30px;min-width:0">' + ms(r[1], 'font-size:17px;color:' + r[2], 'f') + '<span style="display:flex;flex-direction:column;min-width:0"><span>' + r[0] + '</span><span style="font-size:11px;color:' + r[4] + ';font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r[3] + '</span></span></div>'; }).join('') +
        '</div><div style="padding:16px;display:flex;flex-direction:column;gap:6px;min-width:0"><div style="display:flex;align-items:center;gap:8px"><img src="' + A + 'icons/nginx.svg" alt="" style="width:16px;height:16px"><b>Nginx</b><span style="font-size:11px;color:#98989f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + L('запросов в минуту', 'requests per minute') + '</span></div>' +
        '<div style="font-size:30px;font-weight:600;font-variant-numeric:tabular-nums">' + req + '</div><div style="flex:1;display:flex;align-items:flex-end;gap:3px;min-height:60px">' + bars + '</div></div></div>';
    } },
    files: { still: 7, f: function (t) {
      var cyc = Math.floor(t / 9) % 3, q = t % 9, prog = Math.min(100, Math.round(q / 6 * 100));
      var dests = [L('Бэкапы · S3', 'Backups · S3'), 'nextcloud · WebDAV', 'bastion2 · SFTP'];
      var row = function (f) { return '<div style="display:flex;align-items:center;gap:6px;height:24px;font-size:12px;white-space:nowrap;overflow:hidden">' + ms('draft', 'font-size:15px;color:#98989f') + f + '</div>'; };
      var pc = prog >= 100 ? '#30d158' : '#0a84ff';
      var done = [L('Готово · напрямую, без Mac', 'Done · direct, no Mac in between'), L('Готово · 412 МБ', 'Done · 412 MB'), L('Готово · напрямую с сервера на бастион', 'Done · straight from server to bastion')][cyc];
      return '<div style="display:flex;flex-direction:column"><div style="display:flex;gap:6px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07)">' +
        ['S3', 'WebDAV', 'SFTP'].map(function (x, i) { return '<span class="t" style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:' + (i === cyc ? '#0a84ff' : 'rgba(255,255,255,.08)') + ';color:' + (i === cyc ? '#fff' : '#c7c7cc') + '">' + x + '</span>'; }).join('') +
        '</div><div style="position:relative;flex:1;display:grid;grid-template-columns:1fr 1fr"><div style="border-right:1px solid rgba(255,255,255,.07);padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0"><div style="font-weight:700;margin-bottom:4px;white-space:nowrap">target <span class="mn" style="font-size:10.5px;color:#98989f;font-weight:400">/var/backups</span></div>' +
        ['shop-10-22.sql.zst', 'shop-10-21.sql.zst', 'shop-10-20.sql.zst'].map(row).join('') + '</div><div style="padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0"><div style="font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + dests[cyc] + '</div>' +
        ['shop-10-21.sql.zst', 'shop-10-20.sql.zst'].map(row).join('') + '</div>' +
        '<div style="position:absolute;top:' + (34 + Math.min(1, q / 6) * 50) + 'px;left:' + (6 + Math.min(1, q / 6) * 46) + '%;display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;background:#0a84ff;color:#fff;font-size:11.5px;font-weight:600;box-shadow:0 8px 24px rgba(10,132,255,.45);transition:left .55s linear,top .55s linear,opacity .3s;opacity:' + (q >= 7 ? 0 : 1) + ';white-space:nowrap">' + ms('draft', 'font-size:14px') + 'shop-10-22.sql.zst</div></div>' +
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.07);font-size:11.5px"><div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden"><div style="height:100%;width:' + prog + '%;background:' + pc + ';transition:width .55s linear"></div></div><span style="color:' + pc + ';font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">' + (prog >= 100 ? done : Math.round(prog * 4.12) + ' / 412 ' + L('МБ', 'MB')) + '</span></div></div>';
    } },
    db: { still: 9, f: function (t) {
      var e = Math.floor(t / 11) % 4, q = t % 11;
      var E = [
        { t: 'MySQL', logo: 'mysql', tunnel: 'bastion1 › bastion2 › target › 127.0.0.1:3306', query: "SELECT id, total, status FROM orders WHERE status = 'paid' LIMIT 3;", cols: ['id', 'total', 'status'], rows: [['10482', '4 290.00', 'paid'], ['10481', '1 150.00', 'paid'], ['10479', '12 700.00', 'paid']], meta: L('3 строки · 0,018 с', '3 rows · 0.018 s') },
        { t: 'Redis', logo: 'redis', tunnel: 'bastion1 › target › 127.0.0.1:6379', query: 'HGETALL session:9f2c1a7e', cols: ['field', 'value', 'type'], rows: [['user_id', '10482', 'string'], ['cart', '3 items', 'json'], ['ttl', L('23 мин', '23 min'), 'int']], meta: L('3 поля · 0,002 с', '3 fields · 0.002 s') },
        { t: 'PostgreSQL', logo: '', tunnel: 'bastion1 › bastion2 › target › 127.0.0.1:5432', query: "SELECT plan, count(*), sum(amount) FROM subscriptions WHERE status = 'active' GROUP BY plan;", cols: ['plan', 'count', 'sum'], rows: [['business', '312', '936 000.00'], ['team', '1 208', '724 800.00'], ['pro', '2 941', '411 740.00']], meta: L('3 строки · 0,011 с · Production', '3 rows · 0.011 s · Production') },
        { t: 'ClickHouse', logo: 'clickhouse', tunnel: 'bastion1 › target › 127.0.0.1:8123', query: 'SELECT toStartOfHour(ts) h, count(), uniq(user_id) FROM events GROUP BY h ORDER BY h DESC LIMIT 3', cols: ['h', 'count()', 'uniq(user_id)'], rows: [['00:00', '1 198 004', '19 265'], ['23:00', '2 471 336', '37 518'], ['22:00', '2 940 551', '44 092']], meta: L('3 строки · 0,042 с · прочитано 18,4 млн строк', '3 rows · 0.042 s · 18.4M rows read') }
      ][e];
      var typed = Math.min(E.query.length, Math.ceil(E.query.length * q / 4));
      var tabs = [['MySQL', 'mysql'], ['Redis', 'redis'], ['PostgreSQL', ''], ['ClickHouse', 'clickhouse']].map(function (x, i) {
        return '<span class="t" style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:7px;background:' + (i === e ? 'rgba(255,255,255,.1)' : 'transparent') + ';font-weight:600;font-size:12px;opacity:' + (i === e ? 1 : 0.5) + ';white-space:nowrap">' + (x[1] ? '<img src="' + A + 'icons/' + x[1] + '.svg" alt="" style="width:15px;height:15px">' : ms('database', 'font-size:15px;color:#64d2ff', 'f')) + x[0] + '</span>';
      }).join('');
      var grid = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;';
      return '<div style="display:flex;flex-direction:column"><div style="display:flex;gap:4px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07);overflow:hidden">' + tabs + '</div>' +
        '<div class="mn" style="padding:12px 14px 6px;font-size:11px;color:#98989f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + L('туннель: ', 'tunnel: ') + E.tunnel + '</div>' +
        '<div class="mn" style="margin:0 14px;min-height:56px;font-size:12px;line-height:1.55;background:#222224;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 11px;word-break:break-word">' + esc(E.query.slice(0, typed)) + '<span style="display:inline-block;width:7px;height:14px;vertical-align:-2px;background:#3D8BFF;margin-left:1px;opacity:' + (typed < E.query.length || t % 2 ? 1 : 0) + '"></span></div>' +
        '<div style="' + grid + 'padding:12px 14px 6px;font-size:11px;font-weight:600;color:#98989f">' + E.cols.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' +
        E.rows.map(function (r, i) { var on = q >= 5 + i; return '<div class="mn t" style="' + grid + 'height:26px;align-items:center;padding:0 14px;font-size:11.5px;opacity:' + (on ? 1 : 0) + ';transform:' + (on ? 'none' : 'translateY(6px)') + '">' + r.map(function (c) { return '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + c + '</span>'; }).join('') + '</div>'; }).join('') +
        '<div class="t" style="margin-top:auto;padding:8px 14px;font-size:11px;color:#30d158;opacity:' + (q >= 7 ? 1 : 0) + '">' + E.meta + '</div></div>';
    } },
    auto: { still: 6, f: function (t) {
      var p = t % 8;
      var N = [['03:00', 'schedule', '#5e5ce6'], [L('Дамп', 'Dump'), 'terminal', '#0a84ff'], [L('Сжать', 'Compress'), 'compress', '#ff9f0a'], [L('В S3', 'To S3'), 'cloud_upload', '#40c8e0'], [L('Итог', 'Summary'), 'flag', '#30d158']];
      return '<div style="background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:16px 16px;display:flex;flex-direction:column;justify-content:center;padding:20px 14px;gap:22px"><div style="display:flex;align-items:center">' +
        N.map(function (n, i) {
          return '<div style="display:flex;align-items:center;flex:' + (i < N.length - 1 ? 1 : 'none') + ';min-width:0"><div style="flex:none;width:56px;display:flex;flex-direction:column;align-items:center;gap:7px"><div class="t" style="width:46px;height:46px;border-radius:12px;background:#2a2d37;border:1.5px solid ' + (i < p ? 'rgba(48,209,88,.65)' : i === p ? '#0a84ff' : 'rgba(255,255,255,.12)') + ';box-shadow:' + (i === p ? '0 0 0 4px rgba(10,132,255,.25)' : 'none') + ';display:flex;align-items:center;justify-content:center;color:' + n[2] + '">' + ms(n[1], 'font-size:21px', 'f') + '</div><span style="font-size:10.5px;color:#c7c7cc;text-align:center;line-height:1.2;white-space:nowrap">' + n[0] + '</span></div>' +
            (i < N.length - 1 ? '<div class="t" style="flex:1;height:2px;margin:0 2px 22px;background:' + (i < p ? '#30d158' : 'rgba(255,255,255,.15)') + '"></div>' : '') + '</div>';
        }).join('') + '</div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;font-size:11.5px;padding:9px 12px;border-radius:8px;background:rgba(0,0,0,.35)"><span style="color:' + (p >= 5 ? '#30d158' : '#4d9dff') + ';font-weight:600">' +
        (p >= 5 ? L('✓ Бэкап готов · 412 МБ · 1 мин 48 с', '✓ Backup done · 412 MB · 1 min 48 s') : L('Выполняется шаг ' + (p + 1) + ' из 5', 'Running step ' + (p + 1) + ' of 5')) + '</span><span style="color:#98989f;white-space:nowrap">' + L('по расписанию · каждый день', 'scheduled · every day') + '</span></div></div>';
    } },
    ai: { still: 13, f: function (t) {
      var p = t % 16, M = [];
      var bub = function (txt, o) { o = o || {}; return '<div class="t" style="align-self:' + (o.right ? 'flex-end' : 'flex-start') + ';max-width:92%;padding:' + (o.pad || '7px 10px') + ';border-radius:10px;background:' + (o.bg || '#2c2c2e') + ';border:1px solid ' + (o.border || 'rgba(255,255,255,.08)') + ';font-size:12px;' + (o.mono ? 'font-family:var(--mono);' : '') + 'color:' + (o.c || '#c7c7cc') + '">' + esc(txt) + (o.btn ? '<span style="display:inline-block;margin-left:10px;padding:2px 9px;border-radius:6px;background:' + o.btnBg + ';color:#fff;font-family:-apple-system,sans-serif;font-weight:600;font-size:11px">' + o.btn + '</span>' : '') + '</div>'; };
      M.push(bub(L('Проверь место на диске и ошибки nginx', 'Check disk space and nginx errors'), { right: 1, bg: '#1f3a66', border: 'transparent', c: '#fff', pad: '8px 11px' }));
      if (p >= 2) M.push(bub('› df -h /   ✓', { mono: 1 }));
      if (p >= 4) M.push(bub(L('DB_PASSWORD=•••••••• — скрыто от агента', 'DB_PASSWORD=•••••••• — hidden from the agent'), { mono: 1, bg: 'rgba(191,90,242,.12)', border: 'rgba(191,90,242,.3)', c: '#d9a6f7' }));
      if (p >= 6) M.push(bub('sudo tail -n 20 /var/log/nginx/error.log', { mono: 1, bg: 'rgba(255,159,10,.1)', border: p >= 10 ? 'rgba(48,209,88,.5)' : '#ff9f0a', c: '#e5e5ea', pad: '8px 10px', btn: p >= 10 ? L('Разрешено', 'Allowed') : L('Разрешить ⌘↩', 'Allow ⌘↩'), btnBg: p >= 10 ? '#248a3d' : p >= 8 ? '#0a84ff' : '#48484a' }));
      if (p >= 12) M.push(bub(L('Диск заполнен на 82 %. В журнале 3 ошибки upstream timeout для shop.test.', 'Disk is 82% full. The log has 3 upstream timeout errors for shop.test.'), { bg: 'transparent', border: 'transparent', c: '#e5e5ea', pad: '2px 0' }));
      return '<div style="display:flex;flex-direction:column;background:#232323"><div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.07)"><b>Claude Code</b><span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(10,132,255,.2);color:#4d9dff;font-weight:600;white-space:nowrap">' + L('Безопасная запись', 'Safe write') + '</span><span style="margin-left:auto;font-size:11px;color:#98989f">target</span></div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:12px 14px;overflow:hidden">' + M.join('') + '</div></div>';
    } },
    sec: { still: 8, f: function (t) {
      var p = t % 11, scan = p >= 3 && p < 6, open = p >= 6;
      var deg = open ? 360 : scan ? Math.round((p - 2) / 3 * 360) : 0;
      var items = ['Argon2id', 'XChaCha20-Poly1305', L('секреты в защищённой памяти', 'secrets in protected memory'), L('ключи не пишутся на диск', 'keys never touch the disk')];
      return '<div class="sec-wrap" style="display:flex;align-items:center;justify-content:center;gap:28px;padding:20px"><div class="sec-ring t" style="width:132px;height:132px;flex:none;border-radius:50%;background:conic-gradient(' + (open ? '#30d158' : '#3D8BFF') + ' ' + deg + 'deg,rgba(255,255,255,.08) 0);display:flex;align-items:center;justify-content:center">' +
        '<div class="ms f t" aria-hidden="true" style="width:118px;height:118px;border-radius:50%;background:#18191d;display:flex;align-items:center;justify-content:center;font-size:52px;color:' + (open ? '#30d158' : scan ? '#3D8BFF' : '#c7c7cc') + '">' + (open ? 'lock_open' : scan ? 'fingerprint' : 'lock') + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div style="font-size:15px;font-weight:700;color:' + (open ? '#30d158' : '#e5e5ea') + '">' + (open ? L('Открыт · 24 подключения', 'Unlocked · 24 connections') : scan ? 'Touch ID…' : L('Документ заблокирован', 'Document locked')) + '</div>' +
        '<div style="font-size:11.5px;color:#98989f;margin-bottom:4px">' + L('Мои серверы.sshkipper', 'My servers.sshkipper') + '</div>' +
        items.map(function (s) { return '<div class="mn" style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:#c7c7cc;white-space:nowrap"><span style="width:6px;height:6px;transform:rotate(45deg);background:#3D8BFF;flex:none"></span>' + s + '</div>'; }).join('') + '</div></div>';
    } },
    canvas: { still: 7, f: function (t) {
      var p = t % 10, on = '#3D8BFF', off = 'rgba(255,255,255,.12)', ok = 'rgba(48,209,88,.55)', live = p >= 5, err = Math.floor(t / 10) % 2 === 1 && p >= 7;
      var box = function (name, sub, dot, border) { return '<div class="t" style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;background:#24262e;border:1px solid ' + border + '"><span style="width:7px;height:7px;border-radius:50%;background:' + dot + ';flex:none"></span><span style="display:flex;flex-direction:column;min-width:0"><span class="mn" style="font-size:11.5px;font-weight:700;white-space:nowrap">' + name + '</span><span style="font-size:10.5px;color:#98989f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sub + '</span></span></div>'; };
      var dotX = p < 2 ? 22 + p * 3 : p < 4 ? 46 + (p - 2) * 6 : 58;
      return '<div style="background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:18px 18px">' +
        '<div class="t" style="position:absolute;left:22%;right:72%;top:50%;height:2px;background:' + (p >= 2 ? on : off) + '"></div><div class="t" style="position:absolute;left:46%;right:42%;top:50%;height:2px;background:' + (p >= 4 ? on : off) + '"></div>' +
        '<div class="t" style="position:absolute;left:4%;top:50%;width:18%;transform:translateY(-50%);padding:10px 4px;border-radius:10px;background:#24262e;border:1.5px solid ' + on + ';text-align:center">' + ms('laptop_mac', 'font-size:20px;color:#c7c7cc') + '<div style="font-weight:700;font-size:12px">Mac</div></div>' +
        '<div class="t" style="position:absolute;left:28%;top:50%;width:18%;transform:translateY(-50%);padding:10px 4px;border-radius:10px;background:#24262e;border:1.5px solid ' + (p >= 2 ? on : off) + ';text-align:center">' + ms('dns', 'font-size:20px;color:#6aa6ff') + '<div style="font-weight:700;font-size:12px">bastion1</div><div style="font-size:10.5px;color:#30d158;min-height:14px">' + (p >= 2 ? L('ключ — сам', 'key — auto') : '') + '</div></div>' +
        '<div style="position:absolute;left:' + dotX + '%;top:50%;width:10px;height:10px;margin:-4px 0 0 -5px;border-radius:50%;background:#3D8BFF;box-shadow:0 0 12px #3D8BFF;opacity:' + (p < 5 ? 1 : 0) + ';transition:left .6s linear,opacity .3s"></div>' +
        '<div class="t" style="position:absolute;left:58%;right:4%;top:10%;bottom:10%;border-radius:14px;border:1.5px dashed ' + (p >= 4 ? on : off) + ';padding:10px;display:flex;flex-direction:column;gap:7px;min-width:0"><div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden">' + ms('terminal', 'font-size:16px;color:#40c8e0') + 'target<span style="margin-left:auto;font-size:10.5px;color:#98989f;font-weight:400">compose: shop</span></div>' +
        box('nginx', live ? Math.round(197 + Math.sin(t) * 12) + ' ' + L('запр/мин', 'req/min') : '…', live ? '#30d158' : '#48484a', live ? ok : off) +
        box('shop_backend', live ? 'Up 9 days (healthy)' : '…', live ? '#30d158' : '#48484a', live ? ok : off) +
        box('mailer', !live ? '…' : err ? 'Exited (1) · ' + L('2 мин назад', '2 min ago') : 'Up 3 hours', !live ? '#48484a' : err ? '#ff453a' : '#30d158', !live ? off : err ? 'rgba(255,69,58,.6)' : ok) + '</div>' +
        '<div style="position:absolute;left:4%;bottom:10px;font-size:11px;padding:4px 9px;border-radius:6px;background:rgba(0,0,0,.45);color:#c7c7cc">' + (p < 5 ? L('Шаг ' + Math.min(3, Math.floor(p / 2) + 1) + ' из 3 · маршрут', 'Step ' + Math.min(3, Math.floor(p / 2) + 1) + ' of 3 · route') : L('Живые узлы · обновлено только что', 'Live nodes · updated just now')) + '</div></div>';
    } },
    menubar: { still: 5, f: function (t) {
      var on2 = Math.floor(t / 5) % 2 === 1;
      var tn = function (name, addr, on) { return '<div style="display:flex;align-items:center;gap:8px"><span style="display:flex;flex-direction:column;flex:1;min-width:0"><span style="font-weight:600">' + name + '</span><span class="mn" style="font-size:10.5px;color:#c7c7cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + addr + '</span></span><span class="t" style="width:30px;height:18px;border-radius:9px;background:' + (on ? '#30d158' : 'rgba(255,255,255,.25)') + ';position:relative;flex:none"><span class="t" style="position:absolute;top:2px;left:' + (on ? 14 : 2) + 'px;width:14px;height:14px;border-radius:50%;background:#fff"></span></span></div>'; };
      var sep = '<div style="height:1px;background:rgba(255,255,255,.12)"></div>';
      return '<div style="background:linear-gradient(160deg,#1b2a4a,#0f1626)"><div style="height:26px;display:flex;align-items:center;justify-content:flex-end;gap:14px;padding:0 14px;background:rgba(0,0,0,.35);font-size:12px;font-weight:500"><span style="width:22px;height:20px;border-radius:5px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center"><img src="' + A + 'mark-white.svg" alt="" style="width:15px;height:15px"></span>' + ms('wifi', 'font-size:15px') + '<span>' + L('Чт 22 окт. 00:45', 'Thu Oct 22 00:45') + '</span></div>' +
        '<div style="position:absolute;right:12px;top:32px;width:min(300px,calc(100% - 24px));border-radius:12px;background:rgba(70,72,82,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 20px 50px rgba(0,0,0,.5);padding:10px;display:flex;flex-direction:column;gap:8px;font-size:12px">' +
        '<div style="display:flex;align-items:center;gap:8px"><img src="' + A + 'icon-512.png" alt="" style="width:28px;height:28px"><span style="display:flex;flex-direction:column"><b style="font-size:13px">SSHKipper</b><span style="color:#c7c7cc;font-size:11px">' + (on2 ? 2 : 1) + ' ' + L(on2 ? 'подключения' : 'подключение', on2 ? 'connections' : 'connection') + '</span></span></div>' + sep +
        '<b style="color:#d1d1d6">' + L('Туннели', 'Tunnels') + '</b>' + tn('shop · MySQL', '127.0.0.1:3306 → target', true) + tn('cache · Redis', '127.0.0.1:6379 → target', on2) + sep +
        '<div style="display:flex;justify-content:space-between"><b style="color:#d1d1d6">' + L('Автоматизации', 'Automations') + '</b><span style="color:#4d9dff">' + L('Все ›', 'All ›') + '</span></div><div style="color:#d1d1d6">' + L('Всё спокойно: 1 автоматизация, следующая в 03:00', 'All calm: 1 automation, next at 03:00') + '</div></div></div>';
    } }
  };

  Array.prototype.forEach.call(document.querySelectorAll('.ins[data-kind]'), function (el) {
    var k = KINDS[el.getAttribute('data-kind')];
    if (!k) return;
    var t = REDUCE ? k.still : 0;
    patch(el, k.f(t));
    ticker(el, 650, function () { if (document.hidden) return; t++; patch(el, k.f(t)); });
  });
})();
