/* readpaper-kit v1 · lays out a readpaper page from its JSON.
   Contract: the page holds <script type="application/json" id="rp-data">{…}</script> and,
   for deep notes, <main class="rp-note">…</main> whose <h2 id data-short> become the contents. */
(function () {
  'use strict';
  var MATHJAX = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js';
  var doc = document, root = doc.documentElement;
  window.RP = { version: '1.3.0' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function textOf(v) { return typeof v === 'string' ? v : (v && v.text) || ''; }
  function srcTag(src, d) {
    if (!src) return '';
    var label = esc(src.label || ('p' + src.page));
    var pdf = d.links && d.links.pdf;
    var href = src.href || (pdf && src.page ? pdf + '#page=' + src.page : '');
    return href ? '<a class="src" href="' + esc(href) + '" title="打开原文 PDF 对应页">' + label + '</a>'
                : '<span class="src">' + label + '</span>';
  }
  /* a text field is a string, or {text, src:{label,page}, infer:true} */
  function field(v, d, wrap) {
    var t = textOf(v);
    if (!t) return '';
    var s = wrap ? wrap(esc(t)) : esc(t);
    if (v && typeof v === 'object') {
      if (v.src) s += srcTag(v.src, d);
      if (v.infer) s += '<span class="tag infer">推断</span>';
    }
    return s;
  }
  /* result used to be {value,label,src,bars}; read it as one sentence either way */
  function resultOf(r) {
    if (!r || typeof r === 'string' || r.text) return r;
    return { text: [r.label, r.value].filter(Boolean).join(' '), src: r.src };
  }
  /* the no-break space glues each dot to the item before it, so no line starts with a dot */
  var SEP = '\u00a0<span class="sep">·</span> ';

  function renderCard(d, solo) {
    var card = doc.createElement('header');
    card.className = 'rp-card';
    card.id = 'glance';
    var h = [];
    if (d.mode === 'research') return renderResearchHead(d, card);
    var title = d.keywords && d.headline ? d.keywords + '：' + d.headline : (d.headline || d.keywords || d.title || '');
    h.push('<h1 class="rp-title">' + esc(title) + '</h1>');

    var who = d.authors ? esc(d.authors) + (d.institute ? '（' + esc(d.institute) + '）' : '') : esc(d.institute || '');
    var id = d.id || {}, L = d.links || {};
    var meta = [id.arxiv ? 'arXiv ' + esc(id.arxiv + (id.version || '')) : '', esc(d.date || ''), esc(d.venue || '')];
    if (L.abs) meta.push('<a href="' + esc(L.abs) + '">abs</a>');
    if (L.pdf) meta.push('<a href="' + esc(L.pdf) + '">PDF</a>');
    if (L.project) meta.push('<a href="' + esc(L.project) + '">project</a>');
    if (L.code) meta.push('<a href="' + esc(L.code) + '">code</a>');
    meta = meta.filter(Boolean).map(function (m) { return '<span class="m">' + m + '</span>'; });
    if (who) meta.unshift(who);
    if (meta.length) h.push('<p class="rp-kicker">' + meta.join(SEP) + '</p>');

    var rows = '';
    function row(label, v, wrap) {
      var body = field(v, d, wrap);
      if (body) rows += '<dt>' + label + '</dt><dd>' + body + '</dd>';
    }
    row('贡献', d.contribution);
    row('Thesis', d.thesis, function (t) { return '<span class="thesis" lang="en">' + t + '</span>'; });
    row('关键结果', resultOf(d.result));
    row('证据边界', d.boundary);
    if (rows) h.push('<section class="glance"><dl>' + rows + '</dl></section>');

    if (solo) {
      var f = d.figure;
      if (f && f.src) {
        h.push('<figure class="rp-fig"><img src="' + esc(f.src) + '" alt="' + esc(f.label || 'figure') + '" loading="lazy">' +
               '<figcaption>' + (f.label ? '<b>' + esc(f.label) + '</b>' : '') + esc(f.caption || '') +
               (f.page ? srcTag({ label: 'p' + f.page, page: f.page }, d) : '') + '</figcaption></figure>');
      }
      if (d.builds_on && d.builds_on.length) {
        h.push('<p class="rp-builds"><b>先修</b>' + d.builds_on.map(function (p) {
          return p.arxiv ? '<a href="https://arxiv.org/abs/' + esc(p.arxiv) + '">' + esc(p.title) + '</a>' : esc(p.title);
        }).join(SEP) + '</p>');
      }
    }
    card.innerHTML = h.join('');
    return card;
  }

  /* a research page: one question, dated, mapped across many papers; kept apart from paper notes */
  function renderResearchHead(d, card) {
    var lens = d.lens || {}, h = [];
    var name = d.name || ((d.keywords || '') + (lens.name ? ' · ' + lens.name : ''));
    h.push('<h1 class="rp-title">' + esc(name) + '</h1>');
    var c = d.coverage || {}, seed = d.seed || {};
    var meta = [d.asof ? '截至 ' + esc(d.asof) : '', d.prev ? '上次 ' + esc(d.prev) : '',
                c.screened ? '筛选 ' + esc(c.screened) + ' 篇' : '', c.read ? '全文 ' + esc(c.read) + ' 篇' : '',
                seed.keywords ? '起点 ' + esc(seed.keywords) : ''];
    meta = meta.filter(Boolean).map(function (m) { return '<span class="m">' + m + '</span>'; });
    if (meta.length) h.push('<p class="rp-kicker">' + meta.join(SEP) + '</p>');
    var rows = '';
    [['问题', d.question || lens.question], ['结论', d.verdict], ['空白', d.gap]].forEach(function (r) {
      var body = field(r[1], d);
      if (body) rows += '<dt>' + r[0] + '</dt><dd>' + body + '</dd>';
    });
    if (rows) h.push('<section class="glance"><dl>' + rows + '</dl></section>');
    card.innerHTML = h.join('');
    return card;
  }

  function layout(d, note) {
    var solo = !note;
    var wrap = doc.createElement('div');
    wrap.className = 'rp-layout' + (solo ? ' solo' : '');
    if (solo) {
      note = doc.createElement('main');
      note.className = 'rp-note rp-solo';
      (doc.getElementById('rp-root') || doc.body).appendChild(wrap);
    } else {
      note.parentNode.insertBefore(wrap, note);
    }
    var card = renderCard(d, solo);
    note.insertBefore(card, note.firstChild);
    if (solo) { wrap.appendChild(note); return; }

    var heads = [].slice.call(note.querySelectorAll('h2[id]'));
    var items = [{ id: 'glance', full: '一屏读懂', short: '一屏读懂' }].concat(heads.map(function (h) {
      return { id: h.id, full: h.textContent, short: h.getAttribute('data-short') || h.textContent };
    }));
    function linksOf(key) {
      return items.map(function (it) { return '<a href="#' + esc(it.id) + '" target="_self">' + esc(it[key]) + '</a>'; }).join('');
    }
    var rail = doc.createElement('nav');
    rail.className = 'rp-rail';
    rail.setAttribute('aria-label', '目录');
    var id = d.id || {};
    var research = d.mode === 'research';
    var where = research ? (d.asof ? '截至 ' + esc(d.asof) : '')
              : [id.arxiv ? 'arXiv ' + esc(id.arxiv + (id.version || '')) : '', esc(d.venue || '')].filter(Boolean).join(SEP);
    rail.innerHTML = '<div class="name">' + esc(research ? (d.name || d.keywords || '') : (d.keywords || '')) + '</div>' + linksOf('full') +
                     '<div class="note">' + (where ? where + '<br>' : '') + (research ? '外部来源带日期与链接' : '标签可跳到原文 PDF 对应页') + '</div>';
    var chips = doc.createElement('nav');
    chips.className = 'rp-chips';
    chips.setAttribute('aria-label', '章节');
    chips.innerHTML = linksOf('short');
    wrap.appendChild(chips);
    wrap.appendChild(rail);
    wrap.appendChild(note);
    [].forEach.call(note.querySelectorAll('a[href^="#"]'), function (a) { a.target = '_self'; });

    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { chips.classList.toggle('show', !e.isIntersecting); });
    }).observe(card.querySelector('.glance') || card);
    var byHash = {};
    [].forEach.call(wrap.querySelectorAll('.rp-rail a, .rp-chips a'), function (a) { (byHash[a.hash] = byHash[a.hash] || []).push(a); });
    /* the current section is the last heading above 30% of the window */
    var targets = [card].concat(heads), current = null, ticking = false;
    function spy() {
      ticking = false;
      var line = window.innerHeight * 0.3, cur = targets[0];
      targets.forEach(function (t) { if (t.getBoundingClientRect().top <= line) cur = t; });
      var hash = '#' + cur.id;
      if (hash === current) return;
      current = hash;
      Object.keys(byHash).forEach(function (k) {
        byHash[k].forEach(function (a) { a.classList.toggle('on', k === current); });
      });
      var on = chips.querySelector('a.on');
      if (on) chips.scrollLeft = on.offsetLeft - 26;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  function maybeMath(scope) {
    var t = scope.textContent;
    if (t.indexOf('\\(') < 0 && t.indexOf('$$') < 0) return;
    window.MathJax = { tex: { inlineMath: [['\\(', '\\)']], displayMath: [['$$', '$$']] }, chtml: { scale: 0.95 } };
    var s = doc.createElement('script');
    s.src = MATHJAX; s.async = true;
    doc.head.appendChild(s);
  }

  function init() {
    var node = doc.getElementById('rp-data');
    if (!node) return;
    var d;
    try { d = JSON.parse(node.textContent); } catch (e) { console.error('rp-data is not valid JSON', e); return; }
    if (d.theme === 'light' || d.theme === 'dark') root.setAttribute('data-theme', d.theme);
    var embedded = false;
    try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded) root.classList.add('rp-embed');
    var note = doc.querySelector('main.rp-note');
    layout(d, note);
    if (note) maybeMath(note);
    if (!doc.title && d.keywords) doc.title = d.keywords;
    root.classList.add('rp-ready');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
