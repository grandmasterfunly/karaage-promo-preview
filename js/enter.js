/* Enter the Karaage Bowl: five-board skill challenge, belt by performance, then a fortune */
(function () {
  'use strict';
  var KP = window.KP, D = window.KP_DATA;
  var sec = document.getElementById('k-enter');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var rig = $('[data-rig]'), board = $('[data-board]'), cL = $('[data-half-l]'), cR = $('[data-half-r]'), svg = $('[data-cracks]');
  var btn = $('[data-chop]'), meter = $('[data-chi]'), fill = $('[data-chi-fill]'), gi = $('[data-gi]');
  var live = $('[data-enter-live]'), word = $('[data-chop-word]'), spl = $('[data-splinters]');
  var fortune = $('[data-fortune]'), ftext = $('[data-fortune-text]'), after = $('[data-after]');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var boards = 0, damage = 0, zig = [], broken = false, seed = 1;
  var TOTAL = 5, round = 0, score = 0, period = 1300, zone = { lo: 72, hi: 92 }, challengeOver = false;
  var deck = D.fortunes.slice().sort(function () { return Math.random() - .5; }), fi = 0;

  /* belts */
  var beltsEl = $('[data-belts]');
  D.belts.forEach(function (b) { var d = document.createElement('span'); d.className = 'belt'; d.style.setProperty('--c', b.color); beltsEl.appendChild(d); });
  function beltFromScore(s) {
    var i = 0;
    if (s >= 13) i = 7;
    else if (s >= 11) i = 6;
    else if (s >= 9) i = 5;
    else if (s >= 7) i = 4;
    else if (s >= 5) i = 3;
    else if (s >= 3) i = 2;
    else if (s >= 2) i = 1;
    return D.belts[i];
  }
  function renderBelts(final) {
    var b = beltFromScore(score);
    var idx = D.belts.indexOf(b);
    if (!final) idx = -1; // pips stay dim until the run is scored
    if (final) {
      beltsEl.querySelectorAll('.belt').forEach(function (el, i) { el.classList.toggle('is-earned', i <= idx); el.classList.toggle('is-current', i === idx); });
      $('[data-rank-name]').textContent = b.name;
    } else {
      beltsEl.querySelectorAll('.belt').forEach(function (el) { el.classList.remove('is-earned', 'is-current'); });
      $('[data-rank-name]').textContent = 'White belt';
    }
    $('[data-rank-count]').textContent = final
      ? (score + ' of 15 points')
      : ('Board ' + (round + 1) + ' of ' + TOTAL);
    var rl = $('[data-round]'); if (rl) rl.textContent = String(Math.min(round + 1, TOTAL));
    return b.name;
  }
  function setupRound() {
    var table = [
      { period: 1300, lo: 72, hi: 92, left: '72%', w: '20%' },
      { period: 1150, lo: 74, hi: 90, left: '74%', w: '16%' },
      { period: 1000, lo: 76, hi: 90, left: '76%', w: '14%' },
      { period: 900, lo: 78, hi: 90, left: '78%', w: '12%' },
      { period: 800, lo: 80, hi: 90, left: '80%', w: '10%' }
    ];
    if (!KP.motionOK()) {
      table = table.map(function (r) {
        return { period: r.period + 800, lo: Math.max(68, r.lo - 4), hi: Math.min(96, r.hi + 2), left: r.left, w: (parseFloat(r.w) + 4) + '%' };
      });
    }
    var r = table[Math.min(round, TOTAL - 1)];
    period = r.period; zone = r;
    meter.style.setProperty('--sweet-left', r.left);
    meter.style.setProperty('--sweet-w', r.w);
    var rl = $('[data-round]'); if (rl) rl.textContent = String(round + 1);
  }
  function paintHits() {
    var ol = $('[data-hits]'); if (!ol) return;
    ol.innerHTML = '';
    for (var i = 0; i < TOTAL; i++) {
      var li = document.createElement('li');
      li.textContent = 'Board ' + (i + 1);
      if (i < hits.length) li.className = 'is-' + (hits[i] === 'perfect' ? 'perfect' : hits[i] === 'good' ? 'good' : 'miss');
      ol.appendChild(li);
    }
  }
  var hits = [];
  setupRound();
  renderBelts(false);
  paintHits();

  /* seeded random */
  function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* ---------- wood ---------- */
  function makeZig() {
    zig = []; var n = 9;
    for (var i = 0; i <= n; i++) zig.push([300 + (i === 0 || i === n ? 0 : (rng() - .5) * 70) + (rng() - .5) * 20, i / n * 260]);
  }
  function drawWood() {
    var W = Math.round(board.clientWidth * dpr), H = Math.round(board.clientHeight * dpr);
    if (!W || !H) return;
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var g = off.getContext('2d');
    var base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#e2b475'); base.addColorStop(.5, '#d39d5c'); base.addColorStop(1, '#bf8546');
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // tone bands
    for (var b = 0; b < 7; b++) { g.fillStyle = 'rgba(' + (rng() < .5 ? '120,62,22' : '245,205,150') + ',' + (rng() * .12) + ')'; var y = rng() * H; g.fillRect(0, y, W, rng() * H * .25); }
    var knots = [];
    var nk = 1 + Math.floor(rng() * 2);
    for (var k = 0; k < nk; k++) knots.push({ x: W * (.15 + rng() * .7), y: H * (.25 + rng() * .5), r: H * (.08 + rng() * .06) });
    var lines = 70, f1 = .002 + rng() * .002, ph = rng() * 6;
    for (var i = 0; i < lines; i++) {
      var y0 = i / lines * H * 1.1 - H * .05;
      g.beginPath();
      for (var x = 0; x <= W; x += 6) {
        var yy = y0 + Math.sin(x * f1 / dpr + ph + i * .07) * H * .05 + Math.sin(x * .011 / dpr + i) * 1.6 * dpr;
        knots.forEach(function (kn) {
          var dx = x - kn.x, dy = yy - kn.y, d2 = (dx * dx) / (kn.r * kn.r * 9) + (dy * dy) / (kn.r * kn.r * 2.2);
          yy += (dy >= 0 ? 1 : -1) * kn.r * 1.6 * Math.exp(-d2);
        });
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.strokeStyle = 'rgba(' + (95 + rng() * 40 | 0) + ',' + (48 + rng() * 20 | 0) + ',18,' + (.18 + rng() * .35) + ')';
      g.lineWidth = (rng() < .15 ? 2.6 : .7 + rng() * 1.3) * dpr;
      g.stroke();
    }
    knots.forEach(function (kn) {
      for (var r = 4; r > 0; r--) {
        g.beginPath(); g.ellipse(kn.x, kn.y, kn.r * r * .45, kn.r * r * .22, 0, 0, 6.283);
        g.strokeStyle = 'rgba(90,45,15,' + (.25 + .1 * (4 - r)) + ')'; g.lineWidth = 1.4 * dpr; g.stroke();
      }
      var kg = g.createRadialGradient(kn.x, kn.y, 0, kn.x, kn.y, kn.r * .5);
      kg.addColorStop(0, '#5a2c0e'); kg.addColorStop(1, 'rgba(90,44,14,0)');
      g.fillStyle = kg; g.beginPath(); g.ellipse(kn.x, kn.y, kn.r * .6, kn.r * .32, 0, 0, 6.283); g.fill();
    });
    // fine fibers
    for (var f = 0; f < 900; f++) { g.fillStyle = 'rgba(80,40,10,' + rng() * .12 + ')'; g.fillRect(rng() * W, rng() * H, rng() * 30 * dpr, dpr * .8); }
    // bevel
    var top = g.createLinearGradient(0, 0, 0, H * .12); top.addColorStop(0, 'rgba(255,240,210,.55)'); top.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = top; g.fillRect(0, 0, W, H * .12);
    var bot = g.createLinearGradient(0, H * .82, 0, H); bot.addColorStop(0, 'rgba(70,32,8,0)'); bot.addColorStop(1, 'rgba(70,32,8,.6)');
    g.fillStyle = bot; g.fillRect(0, H * .82, W, H * .18);
    var sideL = g.createLinearGradient(0, 0, W * .03, 0); sideL.addColorStop(0, 'rgba(70,32,8,.55)'); sideL.addColorStop(1, 'rgba(70,32,8,0)');
    g.fillStyle = sideL; g.fillRect(0, 0, W * .03, H);
    var sideR = g.createLinearGradient(W, 0, W * .97, 0); sideR.addColorStop(0, 'rgba(70,32,8,.55)'); sideR.addColorStop(1, 'rgba(70,32,8,0)');
    g.fillStyle = sideR; g.fillRect(W * .97, 0, W * .03, H);
    [cL, cR].forEach(function (c, side) {
      c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.save(); x.beginPath();
      var pts = zig.map(function (p) { return [p[0] / 600 * W, p[1] / 260 * H]; });
      if (side === 0) { x.moveTo(0, 0); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(0, H); }
      else { x.moveTo(W, 0); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(W, H); }
      x.closePath(); x.clip(); x.drawImage(off, 0, 0); x.restore();
    });
  }

  /* ---------- cracks ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function addPath(d, light) {
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d);
    if (light) p.setAttribute('class', 'light');
    svg.appendChild(p);
    var len = 900; try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) {}
    p.style.setProperty('--len', len);
    if (!KP.motionOK()) p.style.animation = 'none', p.style.strokeDashoffset = 0;
  }
  function growCracks(prev, now) {
    // main crack along the zig from top, proportional to damage
    var n = zig.length - 1, a = Math.floor(prev / 100 * n), b = Math.min(n, Math.ceil(now / 100 * n) + 1);
    if (b > a) {
      var d = 'M' + zig.slice(a, b + 1).map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
      addPath(d, true); addPath(d);
    }
    // branches
    var nb = 1 + Math.floor(now / 35);
    for (var i = 0; i < nb; i++) {
      var s = zig[Math.min(n, Math.floor(rng() * (b + 1)))];
      var dir = rng() < .5 ? -1 : 1, x = s[0], y = s[1], dd = 'M' + x.toFixed(1) + ' ' + y.toFixed(1);
      var steps = 2 + Math.floor(rng() * 3);
      for (var j = 0; j < steps; j++) { x += dir * (14 + rng() * 34); y += (rng() - .4) * 34; dd += ' L' + x.toFixed(1) + ' ' + Math.max(4, Math.min(256, y)).toFixed(1); }
      addPath(dd);
    }
  }

  /* ---------- charge ---------- */
  var charging = false, t0 = 0, val = 0, raf = null, lastSession = 0;
  function startCharge() {
    if (broken || charging || challengeOver) return;
    charging = true; t0 = performance.now(); btn.classList.add('is-holding'); if (gi) gi.classList.add('is-ready');
    btn.textContent = 'Release to chop';
    raf = requestAnimationFrame(tick);
  }
  function tick(t) {
    if (!charging) return;
    var e = (t - t0) / period, ping = e % 2; val = (ping < 1 ? ping : 2 - ping) * 100;
    fill.style.width = val + '%'; meter.setAttribute('aria-valuenow', Math.round(val));
    raf = requestAnimationFrame(tick);
  }
  function release() {
    if (!charging) return;
    charging = false; cancelAnimationFrame(raf); lastSession = performance.now();
    btn.classList.remove('is-holding'); if (gi) gi.classList.remove('is-ready');
    var held = performance.now() - t0;
    var strength = held < 160 ? 55 : val;
    chop(strength);
  }
  function grade(strength) {
    if (strength >= zone.lo && strength <= zone.hi) {
      var mid = (zone.lo + zone.hi) / 2, half = (zone.hi - zone.lo) / 2;
      if (Math.abs(strength - mid) <= half * 0.4) return 'perfect';
      return 'good';
    }
    return strength < zone.lo ? 'early' : 'late';
  }
  function chop(strength) {
    if (broken || challengeOver) return;
    var g = grade(strength);
    var pts = g === 'perfect' ? 3 : g === 'good' ? 2 : 0;
    score += pts;
    hits.push(g === 'early' || g === 'late' ? 'miss' : g);
    paintHits();
    btn.textContent = 'Hold to chop';
    fill.style.width = '0%'; meter.setAttribute('aria-valuenow', 0);
    if (gi) { gi.classList.remove('is-chop'); void gi.offsetWidth; gi.classList.add('is-chop'); setTimeout(function () { gi.classList.remove('is-chop'); }, 260); }
    if (KP.motionOK()) { board.classList.remove('is-hit'); void board.offsetWidth; board.classList.add('is-hit'); }
    if (g === 'perfect' || g === 'good') {
      flashWord(g === 'perfect' ? 'Perfect!' : 'Hi-yah!');
      growCracks(0, 100); rig.classList.add('has-cracks');
      burst(g === 'perfect' ? 8 : 5, false);
      split(g === 'perfect');
    } else {
      flashWord(g === 'early' ? 'Early!' : 'Late!');
      growCracks(0, 28); rig.classList.add('has-cracks');
      burst(2, false);
      KP.say(live, 'Miss. The strike was ' + g + '. Board ' + (round + 1) + ' of ' + TOTAL + '.');
      broken = true; btn.disabled = true;
      setTimeout(advance, KP.motionOK() ? 700 : 200);
    }
  }
  function flashWord(t) { word.textContent = t; if (!KP.motionOK()) return; word.classList.remove('is-on'); void word.offsetWidth; word.classList.add('is-on'); }

  /* ---------- splinters & split physics ---------- */
  function burst(n, big) {
    if (!KP.motionOK()) return;
    var r = rig.getBoundingClientRect(), b = board.getBoundingClientRect();
    var cx = b.left - r.left + b.width / 2, cy = b.top - r.top + b.height * .3;
    var bits = [];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'); s.className = 'splinter';
      s.style.setProperty('--w', (big ? 14 + Math.random() * 30 : 8 + Math.random() * 14) + 'px');
      spl.appendChild(s);
      bits.push({ el: s, x: cx + KP.rand(-20, 20), y: cy, vx: KP.rand(-9, 9) * (big ? 1.4 : 1), vy: KP.rand(-14, -5), r: KP.rand(0, 360), vr: KP.rand(-20, 20) });
    }
    var start = performance.now();
    (function step(t) {
      var done = t - start > 1300;
      bits.forEach(function (p) { p.vy += .7; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) rotate(' + p.r + 'deg)'; p.el.style.opacity = Math.max(0, 1 - (t - start) / 1300); });
      if (!done) requestAnimationFrame(step); else bits.forEach(function (p) { p.el.remove(); });
    })(start);
  }
  function split(perfect) {
    broken = true; btn.disabled = true;
    boards++;
    rig.classList.add('is-split');
    burst(22, true);
    var halves = [{ el: cL, vx: -7, vy: -9, vr: -5 }, { el: cR, vx: 7, vy: -10, vr: 6 }];
    if (KP.motionOK()) {
      var st = performance.now();
      halves.forEach(function (h) { h.x = 0; h.y = 0; h.r = 0; });
      (function step(t) {
        var e = t - st;
        halves.forEach(function (h) { h.vy += .55; h.x += h.vx; h.y += h.vy; h.r += h.vr; h.vr *= .98; h.el.style.transform = 'translate(' + h.x + 'px,' + h.y + 'px) rotate(' + h.r + 'deg)'; h.el.style.opacity = Math.max(0, 1 - Math.max(0, e - 500) / 500); });
        if (e < 1000) requestAnimationFrame(step);
      })(st);
    } else {
      halves.forEach(function (h) { h.el.style.opacity = 0; });
    }
    svg.style.opacity = 0;
    if (gi) { gi.classList.remove('is-cheer'); void gi.offsetWidth; if (KP.motionOK()) gi.classList.add('is-cheer'); }
    setTimeout(advance, KP.motionOK() ? 750 : 200);
  }
  function advance() {
    round++;
    if (round >= TOTAL) finish();
    else {
      newBoard(true);
      setupRound();
      renderBelts(false);
    }
  }
  function finish() {
    challengeOver = true;
    broken = true;
    btn.disabled = true;
    var belt = beltFromScore(score);
    renderBelts(true);
    var text = deck[fi++ % deck.length];
    var fb = $('[data-final-belt]'); if (fb) fb.textContent = belt.name;
    fortune.hidden = false;
    typeOut(text);
    after.hidden = false;
    var nb = $('[data-next-board]'); if (nb) nb.focus({ preventScroll: true });
    var perfects = hits.filter(function (h) { return h === 'perfect'; }).length;
    KP.say(live, 'Challenge complete. ' + perfects + ' perfect strikes. You earned a ' + belt.name + '. Your fortune: ' + text);
  }
  var typeT;
  function typeOut(text) {
    clearInterval(typeT);
    if (!KP.motionOK()) { ftext.textContent = text; return; }
    ftext.textContent = ''; ftext.classList.add('is-typing');
    var i = 0;
    typeT = setInterval(function () {
      ftext.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(typeT); ftext.classList.remove('is-typing'); }
    }, 28);
  }
  function newBoard(focus) {
    broken = false; damage = 0; btn.disabled = false;
    fortune.hidden = true; after.hidden = true; ftext.textContent = '';
    var fb = $('[data-final-belt]'); if (fb) fb.textContent = '';
    rig.classList.remove('is-split', 'has-cracks');
    svg.innerHTML = ''; svg.style.opacity = 1;
    [cL, cR].forEach(function (c) { c.style.transform = ''; c.style.opacity = 1; });
    seed = Math.floor(Math.random() * 1e6) + 1;
    makeZig(); drawWood();
    if (KP.motionOK()) { board.classList.remove('is-drop'); void board.offsetWidth; board.classList.add('is-drop'); }
    if (focus) { btn.focus(); KP.say(live, 'Board ' + (round + 1) + ' of ' + TOTAL + ' is ready. Hold to chop, then release in the red zone.'); }
  }
  function resetChallenge() {
    challengeOver = false; round = 0; score = 0; hits = []; boards = 0;
    paintHits(); setupRound(); newBoard(true); renderBelts(false);
  }

  /* ---------- input ---------- */
  btn.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) {} startCharge(); });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) startCharge(); } });
  btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
  btn.addEventListener('click', function () { if (performance.now() - lastSession > 350 && !charging && !KP.motionOK()) chop((zone.lo + zone.hi) / 2); });
  board.addEventListener('click', function () { btn.focus(); });
  $('[data-next-board]').addEventListener('click', function () { resetChallenge(); });
  var rT; window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { if (!broken) { var s0 = seed; drawWood(); seed = s0; } }, 200); });

  seed = 4242; makeZig();
  if (document.readyState === 'complete') drawWood(); else window.addEventListener('load', drawWood);
  new ResizeObserver(function () { if (!broken && board.clientWidth) { var s0 = seed; seed = 4242 + boards; drawWood(); seed = s0; } }).observe(board);

  window.KP_enter = { chop: chop, newBoard: newBoard, reset: resetChallenge, finish: finish, setupRound: setupRound };
})();
