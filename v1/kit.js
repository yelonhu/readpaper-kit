/* readpaper-kit v1 · renders a readpaper card from the page's JSON and lays out deep notes.
   Contract: the page holds <script type="application/json" id="rp-data">{…}</script>,
   and, for deep notes, <main class="rp-note">…</main>. Change DEFAULT_THEME to restyle every page. */
(function () {
  'use strict';
  var DEFAULT_THEME = 'a';
  var MATHJAX = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js';
  var doc = document, root = doc.documentElement;
  window.RP = { version: '1.0.0' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pdfHref(d, page) {
    var pdf = d.links && d.links.pdf;
    return pdf && page ? pdf + '#page=' + page : '';
  }
  function srcTag(src, d) {
    if (!src) return '';
    var label = esc(src.label || ('p' + src.page));
    var href = src.href || pdfHref(d, src.page);
    return href ? ' <a class="src" href="' + esc(href) + '" title="打开原文对应页">' + label + '</a>'
                : ' <span class="src">' + label + '</span>';
  }
  /* a text field is a string, or {text, src:{label,page}, infer:true} */
  function field(v, d) {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return esc(v);
    var s = esc(v.text);
    if (v.src) s += srcTag(v.src, d);
    if (v.infer) s += ' <span class="tag infer">推断</span>';
    return s;
  }
  function arxivAbs(id) { return 'https://arxiv.org/abs/' + id; }

  function renderCard(d) {
    var card = doc.createElement('article');
    card.className = 'rp-card';
    var h = [];
    var topics = (d.topic || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var meta = [d.institute, d.venue, d.date && d.date.replace('-', '.'),
                d.id && d.id.arxiv ? 'arXiv ' + d.id.arxiv : ''].filter(Boolean).map(esc);
    h.push('<header class="rp-head"><div class="rp-kw">' + esc(d.keywords) + '</div>' +
           (meta.length ? '<div class="rp-meta" title="' + meta.join(' · ') + '">' + meta.join('<span class="rp-sep">·</span>') + '</div>' : '') +
           (topics ? '<div class="rp-topics">' + topics + '</div>' : '') + '</header>');
    if (d.headline) h.push('<p class="rp-headline">' + esc(d.headline) + '</p>');
    if (d.thesis) h.push('<p class="rp-thesis" lang="en">' + esc(d.thesis) + '</p>');

    var r = d.result, stat = '';
    if (r) {
      stat += '<div class="rp-stat">';
      if (r.value != null) stat += '<div class="rp-n">' + esc(r.value) + '</div>';
      if (r.label) stat += '<div class="rp-cap">' + esc(r.label) + srcTag(r.src, d) + '</div>';
      if (r.bars && r.bars.length) {
        var max = r.scale || Math.max.apply(null, r.bars.map(function (b) { return +b.value || 0; })) || 1;
        stat += '<div class="rp-bars">';
        r.bars.forEach(function (b) {
          var w = Math.max(0, Math.min(100, (+b.value || 0) / max * 100));
          stat += '<span class="nm" title="' + esc(b.name) + '">' + esc(b.name) + '</span>' +
                  '<span class="tr"><i class="' + (b.hi ? 'hi' : '') + '" style="width:' + w.toFixed(1) + '%"></i></span>' +
                  '<span class="v">' + esc(b.display != null ? b.display : b.value) + '</span>';
        });
        stat += '</div>';
      }
      stat += '</div>';
    }
    var rows = '';
    function row(label, v) {
      if (!v) return '';
      var infer = typeof v === 'object' && v.infer;
      var body = typeof v === 'object' ? field({ text: v.text, src: v.src }, d) : field(v, d);
      return '<dt>' + label + (infer ? '<span class="tag infer">推断</span>' : '') + '</dt><dd>' + body + '</dd>';
    }
    rows += row('贡献', d.contribution);
    rows += row('证据边界', d.boundary);
    if (stat || rows) h.push('<section class="rp-body">' + stat + '<dl class="rp-rows">' + rows + '</dl></section>');

    var f = d.figure;
    if (f && f.src) {
      h.push('<figure class="rp-fig"><img src="' + esc(f.src) + '" alt="' + esc(f.label || 'figure') + '" loading="lazy">' +
             '<figcaption>' + (f.label ? '<b>' + esc(f.label) + '</b>' : '') + esc(f.caption || '') +
             (f.page ? srcTag({ label: 'p' + f.page, page: f.page }, d) : '') + '</figcaption></figure>');
    }
    var foot = '';
    if (d.builds_on && d.builds_on.length) {
      foot += '<div><b>Builds on</b>' + d.builds_on.map(function (p) {
        return p.arxiv ? '<a href="' + arxivAbs(p.arxiv) + '">' + esc(p.title) + '</a>' : esc(p.title);
      }).join('<span class="rp-sep">·</span>') + '</div>';
    }
    var L = d.links || {}, links = [];
    if (L.abs) links.push('<a href="' + esc(L.abs) + '">arXiv ↗</a>');
    if (L.pdf) links.push('<a href="' + esc(L.pdf) + '">PDF ↗</a>');
    if (L.project) links.push('<a href="' + esc(L.project) + '">Project ↗</a>');
    if (L.code) links.push('<a href="' + esc(L.code) + '">Code ↗</a>');
    if (links.length) foot += '<div class="rp-links">' + links.join('') + '</div>';
    if (foot) h.push('<footer class="rp-foot">' + foot + '</footer>');
    card.innerHTML = h.join('');
    return card;
  }

  function layoutNote(note, card, d) {
    var heads = [].slice.call(note.querySelectorAll('h2[id]'));
    var layout = doc.createElement('div');
    layout.className = 'rp-layout';
    note.parentNode.insertBefore(layout, note);
    var rail = doc.createElement('nav');
    rail.className = 'rp-rail';
    rail.setAttribute('aria-label', '目录');
    var chips = doc.createElement('nav');
    chips.className = 'rp-chips';
    var railHtml = '<div class="name">' + esc(d.keywords) + '</div>', chipHtml = '';
    heads.forEach(function (h) {
      var t = esc(h.getAttribute('data-short') || h.textContent);
      railHtml += '<a href="#' + h.id + '" target="_self">' + t + '</a>';
      chipHtml += '<a href="#' + h.id + '" target="_self">' + t + '</a>';
    });
    rail.innerHTML = railHtml;
    chips.innerHTML = chipHtml;
    layout.appendChild(rail);
    layout.appendChild(note);
    note.insertBefore(card, note.firstChild);
    note.insertBefore(chips, card);
    [].forEach.call(note.querySelectorAll('a[href^="#"]'), function (a) { a.target = '_self'; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { chips.classList.toggle('show', !e.isIntersecting); });
      }).observe(card);
      var links = {};
      [].forEach.call(rail.querySelectorAll('a'), function (a) { links[a.hash] = [a]; });
      [].forEach.call(chips.querySelectorAll('a'), function (a) { (links[a.hash] = links[a.hash] || []).push(a); });
      var current = null;
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) current = '#' + e.target.id; });
        Object.keys(links).forEach(function (k) {
          links[k].forEach(function (a) { a.classList.toggle('on', k === current); });
        });
        var on = chips.querySelector('a.on');
        if (on && on.scrollIntoView) chips.scrollLeft = on.offsetLeft - 24;
      }, { rootMargin: '0px 0px -70% 0px' });
      heads.forEach(function (h) { spy.observe(h); });
    }
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
    root.setAttribute('data-theme', d.theme || DEFAULT_THEME);
    var embedded = false;
    try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded) root.classList.add('rp-embed');
    var card = renderCard(d);
    var note = doc.querySelector('main.rp-note');
    if (note) {
      layoutNote(note, card, d);
      maybeMath(note);
    } else {
      (doc.getElementById('rp-root') || doc.body).appendChild(card);
    }
    if (!doc.title && d.keywords) doc.title = d.keywords;
    root.classList.add('rp-ready');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
