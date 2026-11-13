/* Core: preview toggle, motion, nav, hero, wipes, scroll effects */
(function () {
  'use strict';
  var html = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var KP = window.KP = {
    motionOK: function () { return !mqReduce.matches && !html.classList.contains('motion-off'); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    onMotionChange: [],
    say: function (el, msg) { if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 60); },
    /* Ignore iOS toolbar show/hide: those fire resize / ResizeObserver with no width change. */
    onWidthChange: function (fn) {
      var w = window.innerWidth;
      return function () {
        var nw = window.innerWidth;
        if (nw === w) return;
        w = nw;
        fn.apply(this, arguments);
      };
    },
    onWidthChangeRO: function (fn) {
      var prev = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
      return function (entries) {
        var changed = !prev;
        if (prev && entries && entries.length) {
          entries.forEach(function (en) {
            var nw = Math.round(en.contentRect.width);
            if (prev.get(en.target) !== nw) { prev.set(en.target, nw); changed = true; }
          });
        }
        if (changed) fn.apply(this, arguments);
      };
    }
  };
  mqReduce.addEventListener && mqReduce.addEventListener('change', function () { KP.onMotionChange.forEach(function (f) { f(); }); });

  /* ---------- Preview promo switch ---------- */
  var sw = document.getElementById('promo-switch');
  function setPromo(on) {
    html.classList.toggle('promo-off', !on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    sw.querySelector('.preview-switch__state').textContent = on ? 'ON' : 'OFF';
    try { localStorage.setItem('kp-promo', on ? 'on' : 'off'); } catch (e) {}
  }
  setPromo(!html.classList.contains('promo-off'));
  sw.addEventListener('click', function () { setPromo(sw.getAttribute('aria-checked') !== 'true'); });

  /* ---------- Motion toggle ---------- */
  var mBtn = document.querySelector('[data-motion-toggle]');
  function syncMotionBtn() {
    var off = html.classList.contains('motion-off');
    mBtn.setAttribute('aria-pressed', off ? 'true' : 'false');
    mBtn.textContent = off ? 'Motion paused: resume' : 'Pause motion';
  }
  mBtn.addEventListener('click', function () {
    html.classList.toggle('motion-off');
    try { localStorage.setItem('kp-motion', html.classList.contains('motion-off') ? 'off' : 'on'); } catch (e) {}
    syncMotionBtn();
    KP.onMotionChange.forEach(function (f) { f(); });
  });
  syncMotionBtn();

  /* ---------- Mascot nav ---------- */
  var nav = document.querySelector('.mnav');
  var toggle = nav.querySelector('.mnav__toggle');
  var face = nav.querySelector('[data-mnav-face]');
  var cur = nav.querySelector('[data-mnav-current]');
  var faces = { hero: 'm-ninja', combat: 'f-ninja', enter: 'm-gi', soba: 'm-robe', hustle: 'm-jacket', fighters: 'm-ninja', lineup: 'm-ninja', closer: 'm-ninja', app: 'm-ninja' };
  var labels = { hero: 'Karaage', combat: 'Combat', enter: 'Enter', soba: 'Soba', hustle: 'Hustle', fighters: 'Fighters', lineup: 'The lineup', closer: 'Appetizer', app: 'Appetizer' };
  function setOpen(o) { nav.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
  nav.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus({ preventScroll: true }); } });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  var current = null;
  function setChapter(id) {
    if (id === current) return; current = id;
    nav.querySelectorAll('a').forEach(function (a) { if (a.dataset.chapter === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    cur.textContent = labels[id] || 'Karaage';
    face.classList.add('is-swap');
    setTimeout(function () { face.src = 'assets/' + (faces[id] || 'm-ninja') + '.webp'; face.classList.remove('is-swap'); }, 180);
  }
  var chapters = document.querySelectorAll('.kp section[data-chapter]');
  var visible = {};
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { visible[en.target.dataset.chapter] = en.intersectionRatio; });
    var best = null, bv = 0;
    Object.keys(visible).forEach(function (k) { if (visible[k] > bv) { bv = visible[k]; best = k; } });
    if (best) setChapter(best);
  }, { threshold: [0, .15, .3, .5, .7, .9] });
  chapters.forEach(function (c) { io.observe(c); });

  /* Wipes and giant kanji are static. A previous scroll listener wrote --p / --gx
     on every frame (and on resize, which iOS fires when the toolbar moves). */

  /* slam-in comic panels + soba entrance */
  var slamIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add(en.target.classList.contains('soba') ? 'is-in' : 'is-slammed'); slamIO.unobserve(en.target); }
    });
  }, { threshold: .18 });
  document.querySelectorAll('[data-slam], .soba').forEach(function (el) { slamIO.observe(el); });

  /* ---------- Hero video + embers ---------- */
  var video = document.querySelector('[data-hero-video]');
  var pauseBtn = document.querySelector('[data-hero-pause]');
  var pauseLbl = document.querySelector('[data-hero-pause-label]');
  var heroPaused = false, hasVideo = false;
  var src = video.querySelector('source');
  function tryVideo() {
    /* Image-only hero. Video slot stays dormant until a real file is provided. */
    return;
  }
  if (pauseBtn) pauseBtn.hidden = true;
  function syncPause() {
    pauseBtn.setAttribute('aria-pressed', heroPaused ? 'true' : 'false');
    pauseLbl.textContent = (heroPaused ? 'Play ' : 'Pause ') + (hasVideo ? 'video' : 'motion');
    document.querySelector('.hero__poster img').style.animationPlayState = heroPaused ? 'paused' : '';
  }
  pauseBtn.addEventListener('click', function () {
    heroPaused = !heroPaused;
    if (hasVideo) { if (heroPaused) video.pause(); else video.play().catch(function () {}); }
    syncPause();
  });
  KP.onMotionChange.push(function () { if (!KP.motionOK() && hasVideo) video.pause(); else if (hasVideo && !heroPaused) video.play().catch(function () {}); tryVideo(); });
  tryVideo(); syncPause();

  var cv = document.querySelector('[data-embers]');
  var ctx = cv.getContext('2d');
  var parts = [], heroOn = true, dpr = Math.min(2, window.devicePixelRatio || 1);
  function sizeCv() { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; }
  sizeCv(); window.addEventListener('resize', KP.onWidthChange(sizeCv));
  for (var i = 0; i < 70; i++) parts.push(newP(true));
  function newP(init) {
    return { x: KP.rand(0.35, 1), y: init ? Math.random() : 1.05, r: KP.rand(1, 3.2), vy: KP.rand(0.0006, 0.0018), vx: KP.rand(-0.0004, 0.0004), a: KP.rand(.3, .9), hue: KP.rand(22, 45), ph: Math.random() * 6 };
  }
  new IntersectionObserver(function (e) { heroOn = e[0].isIntersecting; }).observe(document.querySelector('.hero'));
  var heroEl = document.querySelector('.hero');
  heroEl.addEventListener('pointermove', function (e) {
    if (!KP.motionOK() || heroPaused || Math.random() < .55) return;
    var r = cv.getBoundingClientRect();
    var np = newP(false); np.x = (e.clientX - r.left) / r.width; np.y = (e.clientY - r.top) / r.height; np.vy *= 2.2; np.r *= 1.3; np.a = 1;
    parts.push(np); if (parts.length > 160) parts.splice(0, parts.length - 160);
  });
  function drawEmbers(t) {
    requestAnimationFrame(drawEmbers);
    if (!heroOn || heroPaused || !KP.motionOK()) return;
    var w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    parts.forEach(function (p, idx) {
      p.y -= p.vy; p.x += p.vx + Math.sin(t / 900 + p.ph) * 0.0003;
      if (p.y < -0.05) parts[idx] = newP(false);
      var x = p.x * w, y = p.y * h, r = p.r * dpr;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, 'hsla(' + p.hue + ',100%,70%,' + p.a + ')');
      g.addColorStop(1, 'hsla(' + p.hue + ',100%,50%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.283); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(drawEmbers);

  /* "Choose your style" focuses the selector region */
  document.querySelector('.hero__choose').addEventListener('click', function () { setTimeout(function () { document.getElementById('styles').focus({ preventScroll: true }); }, 0); });

  document.querySelectorAll('[data-rc]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      card.classList.remove('is-pick'); void card.offsetWidth; card.classList.add('is-pick');
    });
  });

  /* In-page hash links: never jump to the top for a missing id, never let a
     bare #order reload the page start, and use instant scrolling on iOS/mobile
     so smooth-scroll does not fight the toolbar. replaceState avoids a second
     jump from the browser's own hash navigation. */
  function preferInstantScroll() {
    try {
      if (window.CSS && CSS.supports && CSS.supports('-webkit-touch-callout', 'none')) return true;
      return window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
    } catch (e) { return true; }
  }
  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button) return;
    var hash = a.getAttribute('href');
    if (!hash || hash === '#') { e.preventDefault(); return; }
    var id = hash.slice(1);
    if (!id) { e.preventDefault(); return; }
    var target = document.getElementById(id);
    /* Placeholder Order links: the closer button IS #order — do not jump. */
    if (!target) { e.preventDefault(); return; }
    if (a === target || a.contains(target)) { e.preventDefault(); return; }
    if (preferInstantScroll()) {
      e.preventDefault();
      scrollToId(id);
      if (history.replaceState) {
        try { history.replaceState(null, '', hash); } catch (err) {}
      }
    }
  });

})();
