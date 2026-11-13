/* Soba Noodle Hidden Karaage Bowl: ink wash, paint away the mist */
(function () {
  'use strict';
  var KP = window.KP;
  var sec = document.getElementById('k-soba');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var live = $('[data-soba-live]');

  /* ---------- seeded noise helpers ---------- */
  var seed = 9137;
  function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function ridge(n, rough) {
    var pts = [0, 0]; var len = 1;
    // midpoint displacement
    var arr = [rng(), rng()];
    var amp = rough;
    for (var it = 0; it < n; it++) {
      var next = [];
      for (var i = 0; i < arr.length - 1; i++) { next.push(arr[i]); next.push((arr[i] + arr[i + 1]) / 2 + (rng() - .5) * amp); }
      next.push(arr[arr.length - 1]); arr = next; amp *= .55;
    }
    return arr;
  }

  /* ---------- ink-wash landscape ---------- */
  var ink = $('[data-ink]'), egg = $('[data-egg]');
  function paintLandscape() {
    var W = ink.width = Math.round(sec.clientWidth * dpr), H = ink.height = Math.round(sec.clientHeight * dpr);
    var g = ink.getContext('2d');
    seed = 9137;
    g.fillStyle = '#f2e8d5'; g.fillRect(0, 0, W, H);
    // paper fibers
    for (var f = 0; f < 2600; f++) { g.fillStyle = 'rgba(120,96,60,' + (rng() * .06) + ')'; g.fillRect(rng() * W, rng() * H, rng() * 18 * dpr, .8 * dpr); }
    // sun
    var sx = W * .2, sy = H * .16, sr = Math.min(W, H) * .07;
    g.fillStyle = 'rgba(181,18,27,.82)'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.283); g.fill();
    var layers = [
      { base: .42, h: .26, a: .16, blur: 10 },
      { base: .52, h: .30, a: .26, blur: 6 },
      { base: .64, h: .28, a: .42, blur: 3 },
      { base: .80, h: .22, a: .66, blur: 1.5 }
    ];
    var peak = null, EGG_MIN = W < 800 * dpr ? .62 : .1, EGG_MAX = W < 800 * dpr ? .8 : .17;
    layers.forEach(function (L, li) {
      var r = ridge(8, .9), n = r.length;
      var min = Math.min.apply(null, r), max = Math.max.apply(null, r);
      g.save();
      g.filter = 'blur(' + (L.blur * dpr) + 'px)';
      var grad = g.createLinearGradient(0, H * (L.base - L.h), 0, H * (L.base + .12));
      grad.addColorStop(0, 'rgba(27,25,22,' + L.a + ')');
      grad.addColorStop(.55, 'rgba(27,25,22,' + (L.a * .55) + ')');
      grad.addColorStop(1, 'rgba(242,232,213,0)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, H);
      var best = { y: 1e9 };
      for (var i = 0; i < n; i++) {
        var x = i / (n - 1) * W, v = (r[i] - min) / (max - min || 1);
        var y = H * L.base - v * H * L.h;
        g.lineTo(x, y);
        if (li === 1 && x > W * EGG_MIN && x < W * EGG_MAX && y < best.y) best = { x: x, y: y };
      }
      if (li === 1) peak = best;
      g.lineTo(W, H); g.closePath(); g.fill();
      // ink texture strokes on ridge
      g.filter = 'none';
      g.strokeStyle = 'rgba(27,25,22,' + (L.a * .5) + ')';
      g.lineWidth = (li + 1) * .8 * dpr;
      g.beginPath();
      for (var j = 0; j < n; j++) { var xx = j / (n - 1) * W, vv = (r[j] - min) / (max - min || 1); var yy2 = H * L.base - vv * H * L.h; j ? g.lineTo(xx, yy2) : g.moveTo(xx, yy2); }
      g.stroke();
      g.restore();
      // mist band between layers
      var mg = g.createLinearGradient(0, H * (L.base - .04), 0, H * (L.base + .08));
      mg.addColorStop(0, 'rgba(242,232,213,0)'); mg.addColorStop(.5, 'rgba(242,232,213,.75)'); mg.addColorStop(1, 'rgba(242,232,213,0)');
      g.fillStyle = mg; g.fillRect(0, H * (L.base - .04), W, H * .12);
    });
    // birds
    g.strokeStyle = 'rgba(27,25,22,.6)'; g.lineWidth = 1.6 * dpr;
    for (var b = 0; b < 5; b++) {
      var bx = W * (.3 + rng() * .25), by = H * (.1 + rng() * .1), bs = (6 + rng() * 6) * dpr;
      g.beginPath(); g.moveTo(bx - bs, by - bs * .3); g.quadraticCurveTo(bx - bs * .4, by - bs * .6, bx, by); g.quadraticCurveTo(bx + bs * .4, by - bs * .6, bx + bs, by - bs * .3); g.stroke();
    }
    if (W < 800 * dpr) {
      var kj = sec.querySelector('.soba__kanji'), sr = sec.getBoundingClientRect(), kr = kj.getBoundingClientRect();
      egg.style.setProperty('--ex', (((kr.right - sr.left) + 30) / sr.width * 100).toFixed(2) + '%');
      egg.style.setProperty('--ey', (((kr.top - sr.top) + kr.height * .35) / sr.height * 100).toFixed(2) + '%');
    } else if (peak && peak.x) {
      egg.style.setProperty('--ex', ((peak.x / W) * 100 - 1.6).toFixed(2) + '%');
      egg.style.setProperty('--ey', ((peak.y / H) * 100 - 3.5).toFixed(2) + '%');
    }
  }

  /* ---------- bamboo ---------- */
  function bambooSVG(side) {
    seed = side === 'l' ? 311 : 733;
    var out = '<svg viewBox="0 0 200 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">';
    for (var s = 0; s < 3; s++) {
      var x = 30 + s * 55 + rng() * 20, top = 40 + rng() * 260, w = 9 + rng() * 6, op = (.55 + rng() * .4).toFixed(2);
      out += '<g class="stalk" style="transform-origin:' + x + 'px 1000px" fill="#1b1916" opacity="' + op + '">';
      var y = 1000;
      while (y > top) {
        var seg = 70 + rng() * 60, y2 = Math.max(top, y - seg);
        out += '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y2 + 3).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y - y2 - 6).toFixed(1) + '" rx="3"/>';
        out += '<rect x="' + (x - w / 2 - 2).toFixed(1) + '" y="' + (y2 - 1).toFixed(1) + '" width="' + (w + 4).toFixed(1) + '" height="4" rx="2"/>';
        if (rng() < .55 && y2 < 800) {
          var dir = rng() < .5 ? -1 : 1, lx = x + dir * w / 2, ly = y2;
          for (var l = 0; l < 3; l++) {
            var ang = dir * (25 + l * 22 + rng() * 10), len = 55 + rng() * 40;
            out += '<path transform="translate(' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ') rotate(' + (ang + (dir > 0 ? 0 : 180)).toFixed(1) + ')" d="M0 0 Q ' + (len * .45).toFixed(1) + ' -9 ' + len.toFixed(1) + ' 0 Q ' + (len * .45).toFixed(1) + ' 6 0 0Z"/>';
          }
        }
        y = y2;
      }
      out += '</g>';
    }
    return out + '</svg>';
  }
  sec.querySelectorAll('[data-bamboo]').forEach(function (el) { el.innerHTML = bambooSVG(el.dataset.bamboo); });
  ['1', '2'].forEach(function (n) { var m = document.createElement('div'); m.className = 'soba__mist-band soba__mist-band--' + n; m.setAttribute('aria-hidden', 'true'); sec.insertBefore(m, sec.querySelector('.soba__inner')); });

  /* ---------- mist painting ---------- */
  var mist = $('[data-mist]'), mctx = mist.getContext('2d'), hint = $('[data-mist-hint]');
  var revealed = false, painting = false, last = null, strokes = 0;
  var brushAng = 0, intent = null, down = null;
  function paintMist() {
    var W = mist.width = Math.round(mist.clientWidth * dpr), H = mist.height = Math.round(mist.clientHeight * dpr);
    if (!W) return;
    seed = 51;
    var cx = W / 2, cy = H / 2, R = W / 2;
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H);
    /* Light veil so the food still reads (~40% in the center, heavier at the rim). */
    var g = mctx.createRadialGradient(cx, cy, R * .15, cx, cy, R);
    g.addColorStop(0, 'rgba(238,229,210,.38)');
    g.addColorStop(.45, 'rgba(236,227,207,.48)');
    g.addColorStop(.75, 'rgba(232,222,200,.78)');
    g.addColorStop(1, 'rgba(228,218,196,.92)');
    mctx.fillStyle = g; mctx.fillRect(0, 0, W, H);
    mctx.filter = 'blur(' + Math.round(10 * dpr) + 'px)';
    for (var i = 0; i < 28; i++) {
      var a = rng() * 6.283, d = R * (.2 + rng() * .78), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      var rx = (30 + rng() * 80) * dpr, ry = rx * (.35 + rng() * .35);
      var edge = d / R;
      var a0 = (.08 + rng() * .12) * (0.6 + edge);
      mctx.fillStyle = rng() < .35 ? 'rgba(60,54,46,' + a0 + ')' : 'rgba(250,245,233,' + (.25 + rng() * .3) + ')';
      mctx.beginPath(); mctx.ellipse(x, y, rx, ry, a + 1.57, 0, 6.283); mctx.fill();
    }
    mctx.filter = 'none';
  }
  function stamp(x, y, r, ang) {
    mctx.globalCompositeOperation = 'destination-out';
    mctx.save();
    mctx.translate(x, y);
    mctx.rotate(ang || 0);
    /* Ink-brush shaped stamp: long soft oval plus a few bristle dabs. */
    var g = mctx.createRadialGradient(0, 0, r * .1, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,.92)');
    g.addColorStop(.55, 'rgba(0,0,0,.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath(); mctx.ellipse(0, 0, r * 1.15, r * .38, 0, 0, 6.283); mctx.fill();
    for (var i = 0; i < 3; i++) {
      mctx.beginPath();
      mctx.ellipse((i - 1) * r * .2, r * .15 * (i % 2 ? 1 : -1), r * .45, r * .18, 0.4 * i, 0, 6.283);
      mctx.fill();
    }
    mctx.restore();
    mctx.globalCompositeOperation = 'source-over';
  }
  function line(a, b, r) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), steps = Math.max(1, Math.ceil(d / (r * .22)));
    brushAng = Math.atan2(dy, dx);
    for (var i = 1; i <= steps; i++) stamp(a.x + dx * i / steps, a.y + dy * i / steps, r, brushAng);
  }
  function cleared() {
    var W = mist.width, H = mist.height, img;
    try { img = mctx.getImageData(0, 0, W, H).data; } catch (e) { return 0; }
    var tot = 0, clr = 0, cx = W / 2, cy = H / 2, R = W * .48, step = Math.max(4, Math.floor(W / 60));
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) {
      var dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (dd > R * R) continue;
      tot++; if (img[(y * W + x) * 4 + 3] < 90) clr++;
    }
    return tot ? clr / tot : 0;
  }
  function pos(e) { var r = mist.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; }
  function brushR() { return mist.width * .075; }
  function tapR() { return mist.width * .16; } /* generous single-tap clear */
  function setHintText() {
    if (!hint) return;
    var touch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0);
    hint.textContent = touch ? 'Tap or swipe to reveal' : 'Brush to reveal';
  }
  setHintText();
  mist.addEventListener('pointerdown', function (e) {
    if (revealed) return;
    if (!KP.motionOK()) return; /* reduced motion: use the Clear the mist button */
    if (e.cancelable) e.preventDefault();
    try { mist.setPointerCapture(e.pointerId); } catch (x) {}
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, stamped: true };
    intent = 'brush'; painting = true;
    last = pos(e);
    stamp(last.x, last.y, tapR(), 0);
    if (hint) hint.classList.add('is-gone');
    if (strokes === 0) KP.say(live, 'The mist begins to clear. Brush across the bowl.');
  });
  mist.addEventListener('pointermove', function (e) {
    if (revealed || !down || down.id !== e.pointerId) return;
    if (intent !== 'brush' || !painting) return;
    if (e.cancelable) e.preventDefault();
    var p = pos(e); line(last, p, brushR()); last = p;
  });
  function endStroke(e) {
    if (intent === 'brush' && painting) {
      painting = false; strokes++;
      var c = cleared();
      if (c > .5) reveal('paint');
      else if (strokes % 3 === 0) KP.say(live, Math.round(c * 100) + ' percent revealed. Keep brushing.');
    }
    down = null; intent = null; painting = false;
  }
  mist.addEventListener('pointerup', endStroke);
  mist.addEventListener('pointercancel', endStroke);
  mist.addEventListener('touchmove', function (e) {
    /* Only lock scrolling while the pointer is actually brushing. Preventing
       every touchmove over the mist was hijacking page scroll on iOS. */
    if (!revealed && painting) e.preventDefault();
  }, { passive: false });

  var revealBtns = sec.querySelectorAll('[data-reveal]'), seal = $('[data-seal]'), prompt = $('[data-soba-prompt]');
  function disableRevealBtns() {
    revealBtns.forEach(function (b) { b.disabled = true; b.textContent = 'Revealed'; });
  }
  function reveal() {
    if (revealed) return; revealed = true;
    hint.classList.add('is-gone');
    mist.classList.add('is-gone');
    setTimeout(function () { seal.classList.add('is-on'); }, KP.motionOK() ? 700 : 0);
    sec.classList.add('is-revealed');
    disableRevealBtns();
    prompt.textContent = 'The mist is gone. Chilled soba, crispy karaage, nothing left to hide.';
    KP.say(live, 'Revealed: the Soba Noodle Hidden Karaage Bowl. Chilled soba noodles topped with crispy karaage. A red Limited Time seal stamps the painting.');
  }
  revealBtns.forEach(function (revealBtn) {
    revealBtn.addEventListener('click', function () {
      if (revealed) return;
      if (!KP.motionOK()) return reveal();
      disableRevealBtns(); hint.classList.add('is-gone');
      var W = mist.width, H = mist.height, t0 = performance.now(), prev = null, r = brushR() * 1.2;
      (function step(t) {
        var e = Math.min(1, (t - t0) / 1600);
        var ang = e * 6.283 * 2.2, rad = W * (.05 + .38 * e);
        var p = { x: W / 2 + Math.cos(ang) * rad, y: H / 2 + Math.sin(ang) * rad };
        if (prev) line(prev, p, r); prev = p;
        if (e < 1) requestAnimationFrame(step); else reveal();
      })(t0);
    });
  });

  /* ---------- easter egg ---------- */
  var eggLine = $('[data-egg-line]');
  var eggLines = ['You found the hidden karaage. Most people only see the noodles.', 'Patience is a flavor too. You have it.', 'The seal was in the ink all along.'];
  var en = 0;
  egg.addEventListener('click', function () {
    egg.classList.add('is-found');
    eggLine.textContent = eggLines[en++ % eggLines.length];
    eggLine.classList.add('is-on');
    clearTimeout(egg._t); egg._t = setTimeout(function () { eggLine.classList.remove('is-on'); }, 5200);
  });

  var kp = sec.querySelector('[data-kanji]');
  if (kp) { try { var kl = Math.ceil(kp.getTotalLength()); kp.style.strokeDasharray = kl; kp.style.strokeDashoffset = kl; kp.style.setProperty('--kl', kl); } catch (e) {} }
  function sizeAll() { paintLandscape(); if (!revealed) paintMist(); }
  var rT; new ResizeObserver(KP.onWidthChangeRO(function () { clearTimeout(rT); rT = setTimeout(sizeAll, 120); })).observe(sec);
  sizeAll();
  window.KP_soba = { reveal: reveal, stroke: function (pts) { var r = brushR(); hint.classList.add('is-gone'); for (var i = 1; i < pts.length; i++) line({ x: pts[i - 1][0] * mist.width, y: pts[i - 1][1] * mist.height }, { x: pts[i][0] * mist.width, y: pts[i][1] * mist.height }, r); }, cleared: cleared };
})();
