/* Core: preview toggle, motion, nav, hero, wipes, scroll effects, appetizer */
(function () {
  'use strict';
  var html = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var KP = window.KP = {
    motionOK: function () { return !mqReduce.matches && !html.classList.contains('motion-off'); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    onMotionChange: [],
    say: function (el, msg) { if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 60); }
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
  var faces = { hero: 'm-ninja', combat: 'f-ninja', enter: 'm-gi', soba: 'm-robe', hustle: 'm-jacket', fighters: 'm-ninja', app: 'm-ninja' };
  var labels = { hero: 'Karaage', combat: 'Combat', enter: 'Enter', soba: 'Soba', hustle: 'Hustle', fighters: 'Fighters', app: 'Appetizer' };
  function setOpen(o) { nav.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
  nav.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
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

  /* ---------- Scroll-tied effects ---------- */
  var wipes = [].slice.call(document.querySelectorAll('.wipe'));
  var giants = [].slice.call(document.querySelectorAll('.enter__giant'));
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = window.innerHeight;
      var mo = KP.motionOK();
      wipes.forEach(function (w) {
        var r = w.getBoundingClientRect();
        var p = mo ? Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.6))) : 1;
        w.style.setProperty('--p', p.toFixed(3));
      });
      giants.forEach(function (g, i) {
        if (!mo) { g.style.setProperty('--gx', '0px'); return; }
        var r = g.getBoundingClientRect();
        var c = (r.top + r.height / 2 - vh / 2) / vh;
        g.style.setProperty('--gx', ((i ? 1 : -1) * c * 80).toFixed(1) + 'px');
      });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  KP.onMotionChange.push(onScroll);
  onScroll();

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
  sizeCv(); window.addEventListener('resize', sizeCv);
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

  /* ---------- Appetizer dip (4 official pieces) ---------- */
  var play = document.querySelector('[data-app-play]');
  var pieces = document.querySelectorAll('[data-piece]');
  var cup = document.querySelector('.app__cup');
  var word = document.querySelector('[data-crunch-word]');
  var countEl = document.querySelector('[data-crunch-n]');
  var dipBtn = document.querySelector('[data-dip-next]');
  var dipped = [false, false, false, false];
  var words = ['Crunch!', 'Crack!', 'Crispy!', 'Krnch!', 'So juicy!'];
  var drag = null;

  function dippedCount() { return dipped.filter(Boolean).length; }
  function announceDip() {
    var n = dippedCount();
    if (countEl) countEl.textContent = n >= 4 ? 'All four dipped. Add them to any bowl.' : ('Dipped ' + n + ' of 4');
    if (word) word.textContent = n >= 4 ? 'Add to any bowl!' : words[(n - 1 + words.length) % words.length];
    if (word && KP.motionOK()) { word.classList.remove('is-on'); void word.offsetWidth; word.classList.add('is-on'); }
  }
  function dunkPiece(el) {
    if (!el) return;
    var i = parseInt(el.getAttribute('data-piece'), 10);
    if (dipped[i]) return;
    dipped[i] = true;
    el.classList.add('is-dunked');
    el.disabled = true;
    if (cup) { cup.classList.remove('is-dip'); void cup.offsetWidth; cup.classList.add('is-dip'); }
    announceDip();
    if (dipBtn && dippedCount() >= 4) dipBtn.disabled = true;
  }
  function nextUndipped() {
    for (var i = 0; i < pieces.length; i++) if (!dipped[i]) return pieces[i];
    return null;
  }
  function overCup(x, y) {
    if (!cup) return false;
    var r = cup.getBoundingClientRect();
    var pad = 28;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  pieces.forEach(function (el) {
    el.addEventListener('pointerdown', function (e) {
      if (el.disabled) return;
      if (e.button && e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, el: el };
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId || drag.el !== el) return;
      if (e.cancelable) e.preventDefault();
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    });
    function endPtr(e) {
      if (!drag || drag.el !== el) return;
      var moved = drag.moved;
      var x = e.clientX, y = e.clientY;
      drag = null;
      if (el.disabled) return;
      if (!moved || overCup(x, y)) dunkPiece(el);
    }
    el.addEventListener('pointerup', endPtr);
    el.addEventListener('pointercancel', function () { drag = null; });
    el.addEventListener('click', function (e) {
      /* keyboard / fallback: pointer path already dunks on tap */
      if (el.disabled) return;
      if (e.detail === 0) dunkPiece(el);
    });
  });
  if (play) {
    play.addEventListener('touchmove', function (e) {
      if (drag) e.preventDefault();
    }, { passive: false });
  }
  if (dipBtn) dipBtn.addEventListener('click', function () { dunkPiece(nextUndipped()); });
})();
