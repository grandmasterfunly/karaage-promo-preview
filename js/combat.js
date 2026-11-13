/* Karaage Combat Bowl: 16-bit fighting game */
(function () {
  'use strict';
  var KP = window.KP, D = window.KP_DATA;
  var IN_BOWL = {};
  (D.fighters || []).forEach(function (f) { IN_BOWL[f.id] = 1; });
  var sec = document.getElementById('k-combat');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var screens = {}; sec.querySelectorAll('[data-screen]').forEach(function (s) { screens[s.dataset.screen] = s; });
  var live = $('[data-combat-live]');
  var state = 'idle', chosen = D.fighters[0];
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  var floor = $('[data-floor]'), hud = $('[data-floor-hud]'), pad = $('[data-floor-pad]'), koBox = $('[data-floor-ko]');
  var prompt = $('[data-floor-prompt]'), pick = $('[data-screen="select"]');
  var f1 = $('[data-f1]'), f2 = $('[data-f2]'), fx = $('[data-fx]'), arena = $('[data-arena]');

  function setState(s) {
    state = s; sec.dataset.state = s;
    var wait = (s === 'idle' || s === 'select');
    if (hud) hud.hidden = (s !== 'fight');
    if (pad) pad.hidden = (s !== 'fight');
    if (koBox) koBox.hidden = (s !== 'ko');
    if (pick) pick.hidden = !wait;
    if (prompt) prompt.hidden = !wait;
    var keys = sec.querySelector('.cfloor__keys');
    if (keys) keys.hidden = true;
    requestAnimationFrame(function () { requestAnimationFrame(drawLines); });
  }

  var crt = $('[data-crt]');
  if (crt) crt.addEventListener('click', function () {
    var on = crt.getAttribute('aria-pressed') !== 'true';
    crt.setAttribute('aria-pressed', on ? 'true' : 'false');
    sec.classList.toggle('crt-off', !on);
  });

  /* ---------- Roster ---------- */
  var grid = $('[data-roster]');
  D.fighters.forEach(function (f, i) {
    var lab = document.createElement('label');
    lab.className = 'rcell'; lab.dataset.id = f.id;
    var st = Object.keys(f.stats).map(function (k) { return k + ' ' + f.stats[k] + ' of 5'; }).join(', ');
    lab.innerHTML = '<input type="radio" name="fighter" value="' + f.id + '"' + (i === 0 ? ' checked' : '') +
      ' aria-label="' + f.name + ', in the bowl. ' + f.bio + ' Special move: ' + f.special + '.">' +
      '<span class="rcell__box" aria-hidden="true"><span class="rcell__p1">P1</span><img src="assets/f-' + f.id + '.webp" alt="" loading="lazy"></span>';
    grid.appendChild(lab);
    lab.addEventListener('mouseenter', function () { if (state === 'select' || state === 'idle') { showP1(f, true); pinFighter(f.id); } });
    lab.addEventListener('focusin', function () { if (state === 'select' || state === 'idle') { showP1(f); pinFighter(f.id); } });
  });
  grid.addEventListener('mouseleave', function () {
    var c = grid.querySelector('input:checked');
    var f = c && D.fighters.find(function (x) { return x.id === c.value; });
    if (f) showP1(f);
    if (document.activeElement && grid.contains(document.activeElement) && document.activeElement.value) pinFighter(document.activeElement.value);
    else if (grid.dataset.touched && f) pinFighter(f.id);
    else clearPin();
  });
  grid.addEventListener('change', function (e) {
    var f = D.fighters.find(function (x) { return x.id === e.target.value; });
    if (f) { grid.dataset.touched = '1'; showP1(f); pinFighter(f.id); }
  });

  function showP1(f, preview) {
    if (!preview) chosen = f;
    var n = $('[data-p1-name]'); if (n) n.textContent = f.name;
    var inb = $('[data-p1-in]'); if (inb) inb.textContent = 'In the bowl';
    var bio = $('[data-p1-bio]'); if (bio) bio.textContent = f.bio || '';
    var sp = $('[data-p1-special]'); if (sp) sp.textContent = f.special || '';
    var img = $('[data-f1-img]');
    if (img) { img.src = 'assets/f-' + f.id + '.webp'; img.alt = f.name; }
    if (state === 'idle' || state === 'select') {
      if (f1 && /is-out/.test(f1.className)) f1.className = 'fighter fighter--p1 is-idle is-preview';
    }
    if (!preview) KP.say(live, f.name + ', in the bowl. ' + f.bio + ' Special move: ' + f.special + '.');
  }
  showP1(chosen);

  /* ---------- Floor stage (ninja always waiting) ---------- */
  var startBtn = $('[data-press-start]');
  function focusFloor() {
    setState('select');
    if (floor) floor.scrollIntoView({ behavior: KP.motionOK() ? 'smooth' : 'auto', block: 'nearest' });
    KP.say(live, 'Ninja Karaage is waiting on the dojo floor. Choose your fighter, then press Fight.');
    var c = grid.querySelector('input:checked'); if (c) c.focus({ preventScroll: true });
  }
  if (startBtn) startBtn.addEventListener('click', function () { focusFloor(); });
  function resetToWait() {
    clearTimers(); fighting = false; clearTimeout(cpuT); clearTimeout(narrT);
    if (f1) f1.className = 'fighter fighter--p1 is-idle is-preview';
    if (f2) f2.className = 'fighter fighter--p2 is-idle is-wait';
    setState('idle');
    if (prompt) prompt.textContent = 'Ninja Karaage is waiting. Choose your fighter.';
  }

  /* ---------- Bowl roster callouts ---------- */
  var cb = $('[data-cbowl]'), stage = $('[data-cbowl-stage]'), svg = $('[data-cbowl-lines]'), tog = $('[data-cbowl-toggle]');
  var tags = [].slice.call(sec.querySelectorAll('.ctag'));
  var pinId = null;
  function stickyOn() { return tog && tog.getAttribute('aria-pressed') === 'true'; }
  function updateTags() {
    var all = cb && cb.classList.contains('is-roster');
    if (cb) cb.classList.toggle('is-pin', !all && !!pinId);
    tags.forEach(function (t) {
      t.classList.toggle('is-on', !!(all || (pinId && t.dataset.k === pinId)));
    });
  }
  function pinFighter(id) {
    if (stickyOn()) return;
    pinId = id || null;
    if (cb) cb.classList.remove('is-roster');
    updateTags();
    drawLines();
  }
  function clearPin() {
    if (stickyOn()) return;
    pinId = null;
    if (cb) { cb.classList.remove('is-roster'); cb.classList.remove('is-pin'); }
    updateTags();
    drawLines();
  }
  function drawLines() {
    if (!svg) return;
    var host = svg.parentElement;
    if (!host || !stage) return;
    if (getComputedStyle(svg).display === 'none') { svg.innerHTML = ''; return; }
    var hr = host.getBoundingClientRect();
    if (hr.width < 2) { svg.innerHTML = ''; return; }
    var imgEl = stage.querySelector('.cbowl__img') || stage.querySelector('img');
    var img = imgEl.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + Math.round(hr.width) + ' ' + Math.round(hr.height));
    var all = cb && cb.classList.contains('is-roster');
    var out = '';
    function dot(x, y, i) {
      return '<rect x="' + (x - 4).toFixed(0) + '" y="' + (y - 4).toFixed(0) + '" width="8" height="8" style="--i:' + i + '"/>';
    }
    function line(x, y, tx, ty, i, cls) {
      var d = 'M' + x.toFixed(0) + ' ' + y.toFixed(0) + ' L' + tx.toFixed(0) + ' ' + ty.toFixed(0);
      return '<path class="' + (cls || '') + '" d="' + d + '" pathLength="100" style="--i:' + i + '"/>' + dot(x, y, i);
    }
    function spot(t) {
      var map = (D.bowlSpots || {})[t.dataset.k];
      if (!map || map.x == null || map.y == null) return null;
      return {
        x: img.left - hr.left + img.width * Number(map.x) / 100,
        y: img.top - hr.top + img.height * Number(map.y) / 100
      };
    }
    if (all) {
      tags.forEach(function (t, i) {
        var tr = t.getBoundingClientRect();
        if (tr.width < 2) return;
        var s = spot(t);
        if (!s) return;
        var left = t.classList.contains('ctag--l');
        var tx = (left ? tr.right : tr.left) - hr.left;
        var ty = tr.top - hr.top + tr.height / 2;
        var ex = left ? tx + 14 : tx - 14;
        var d = 'M' + s.x.toFixed(0) + ' ' + s.y.toFixed(0) + ' L' + ex.toFixed(0) + ' ' + ty.toFixed(0) + ' L' + tx.toFixed(0) + ' ' + ty.toFixed(0);
        out += '<path d="' + d + '" pathLength="100" style="--i:' + i + '"/>' + dot(s.x, s.y, i);
      });
    } else if (pinId) {
      var t = tags.filter(function (x) { return x.dataset.k === pinId; })[0];
      var cell = grid && grid.querySelector('.rcell[data-id="' + pinId + '"]');
      if (t) {
        var s = spot(t);
        if (!s) { svg.innerHTML = ''; return; }
        var ox, oy;
        if (cell && cell.getBoundingClientRect().width > 2) {
          var cr = cell.getBoundingClientRect();
          ox = cr.left + cr.width / 2 - hr.left;
          oy = cr.top - hr.top;
        } else {
          var tr = t.getBoundingClientRect();
          var left = t.classList.contains('ctag--l');
          ox = (left ? tr.right : tr.left) - hr.left;
          oy = tr.top - hr.top + tr.height / 2;
        }
        out += line(s.x, s.y, ox, oy, 0, 'is-pin');
      }
    }
    svg.innerHTML = out;
  }
  function setRoster(on, sticky) {
    if (cb) cb.classList.toggle('is-roster', on);
    if (on) pinId = null;
    if (sticky !== undefined && tog) {
      tog.setAttribute('aria-pressed', sticky ? 'true' : 'false');
      tog.textContent = sticky ? 'Hide the roster' : 'Show the roster';
    }
    updateTags();
    drawLines();
  }
  if (cb) {
    function scheduleLines() { clearTimeout(cb._r); cb._r = setTimeout(drawLines, 40); }
    drawLines();
    window.addEventListener('resize', scheduleLines);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(scheduleLines);
      ro.observe(stage);
      var bowlImg = stage.querySelector('img');
      if (bowlImg) ro.observe(bowlImg);
      if (floor) ro.observe(floor);
    }
    stage.querySelector('img').addEventListener('load', scheduleLines);
    if (document.fonts) document.fonts.ready.then(scheduleLines);
    tog.addEventListener('click', function () {
      var on = tog.getAttribute('aria-pressed') !== 'true';
      setRoster(on, on);
    });
    /* No auto-reveal on hover of the bowl or timed peek — toggle only for all 12. */
    var seen = false;
    new IntersectionObserver(function (en, ob) {
      if (en[0].isIntersecting && !seen) {
        seen = true; ob.disconnect(); sec.classList.add('is-seen');
      }
    }, { threshold: .45 }).observe(stage);
  }

  /* ---------- Select -> VS -> Fight ---------- */
  screens.select.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = grid.querySelector('input:checked');
    var f = c && D.fighters.find(function (x) { return x.id === c.value; });
    if (f) chosen = f;
    enterAndFight();
  });
  function enterAndFight() {
    setState('entrance');
    if (prompt) prompt.hidden = true;
    $('[data-f1-img]').src = 'assets/f-' + chosen.id + '.webp';
    $('[data-f1-img]').alt = chosen.name;
    f1.className = 'fighter fighter--p1 is-enter is-enter--' + chosen.id;
    f2.className = 'fighter fighter--p2 is-idle';
    showCall('Here comes ' + chosen.name + '!');
    KP.say(live, chosen.name + ' enters the ring to fight Ninja Karaage.');
    later(startFight, KP.motionOK() ? 900 : 200);
  }

  /* ---------- Fight ---------- */
  var hpEl1 = $('[data-hp-p1]'), hpEl2 = $('[data-hp-p2]'), spEl = $('[data-sp]'), spBtn = sec.querySelector('[data-move="special"]');
  var comboEl = $('[data-combo]'), comboN = $('[data-combo-n]'), call = $('[data-call]');
  var score = 0, hp1, hp2, sp, combo, lastHit, cd, winding, cpuT, narr, narrT, fighting = false, visible = false;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: .3 }).observe(sec);

  function startFight() {
    clearTimers();
    setState('fight');
    score = 0; hp1 = 100; hp2 = 100; sp = 0; combo = 0; lastHit = 0; cd = 0; winding = false; fighting = true;
    $('[data-f1-img]').src = 'assets/f-' + chosen.id + '.webp';
    $('[data-hud-p1-name]').textContent = chosen.name;
    f1.className = 'fighter fighter--p1 is-idle'; f2.className = 'fighter fighter--p2 is-idle';
    render();
    showCall('Fight!');
    KP.say(live, 'Fight! Press J to punch, K to kick. Fill the meter, then press L for ' + chosen.special + '.');
    sec.querySelector('[data-move="punch"]').focus({ preventScroll: true });
    scheduleCpu(1800);
  }
  function showCall(t) { call.textContent = t; call.classList.remove('is-on'); void call.offsetWidth; call.classList.add('is-on'); }
  function render() {
    hpEl1.style.width = hp1 + '%'; hpEl2.style.width = Math.max(0, hp2) + '%';
    spEl.style.width = Math.min(100, sp) + '%';
    var ready = sp >= 100;
    spBtn.disabled = !ready; spBtn.classList.toggle('is-ready', ready);
    $('[data-sp-label]').textContent = ready ? 'Special ready' : 'Special meter ' + Math.floor(Math.min(100, sp)) + ' percent';
  }
  function narrate(msg, now) {
    narr = msg;
    if (now) { clearTimeout(narrT); narrT = null; KP.say(live, msg); return; }
    if (!narrT) narrT = setTimeout(function () { narrT = null; KP.say(live, narr); }, 1400);
  }
  function center(el) {
    var a = arena.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - a.left + r.width * .45, y: r.top - a.top + r.height * .4 };
  }
  function spark(x, y, cls) {
    if (!KP.motionOK()) return;
    var s = document.createElement('span'); s.className = 'spark ' + (cls || '');
    s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s);
    setTimeout(function () { s.remove(); }, 400);
  }
  function dmgText(x, y, t) {
    var s = document.createElement('span'); s.className = 'dmg'; s.textContent = t; s.setAttribute('aria-hidden', 'true');
    s.style.left = x + 'px'; s.style.top = (y - 40) + 'px'; fx.appendChild(s);
    setTimeout(function () { s.remove(); }, 800);
  }
  function anim(el, cls, ms) { el.classList.remove('is-idle'); el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); if (fighting) el.classList.add('is-idle'); }, ms); }
  var MOVES = { punch: { dmg: 7, cd: 240, label: 'Punch' }, kick: { dmg: 11, cd: 420, label: 'Kick' }, special: { dmg: 30, cd: 700, label: 'Special' } };

  function move(kind) {
    if (state !== 'fight' || !fighting) return;
    var now = performance.now();
    if (now < cd) return;
    var m = MOVES[kind];
    if (kind === 'special') { if (sp < 100) return; sp = 0; }
    cd = now + m.cd;
    var btn = sec.querySelector('[data-move="' + kind + '"]');
    btn.classList.add('is-press'); setTimeout(function () { btn.classList.remove('is-press'); }, 120);
    if (kind === 'special') f1.classList.add('is-special--' + chosen.id);
    anim(f1, 'is-' + kind, kind === 'special' ? 560 : 160);
    var dmg = m.dmg + Math.round(KP.rand(-1, 2));
    var countered = winding;
    if (countered) { dmg += 4; winding = false; f2.classList.remove('is-wind'); clearTimeout(cpuT); scheduleCpu(1600); }
    combo = (now - lastHit < 1200) ? combo + 1 : 1; lastHit = now;
    if (combo >= 3) dmg += 2;
    hp2 -= dmg; score += dmg * 100 * Math.max(1, combo);
    if (kind !== 'special') sp += dmg * 1.9;
    setTimeout(function () {
      var c = center(f2);
      f2.style.setProperty('--kb', (kind === 'special' ? 40 : 14) + 'px');
      f2.style.setProperty('--kr', (kind === 'kick' ? 6 : 3) + 'deg');
      anim(f2, 'is-hurt', 140);
      spark(c.x + KP.rand(-30, 30), c.y + KP.rand(-40, 30), kind === 'special' ? 'spark--r' : (kind === 'kick' ? 'spark--y' : ''));
      if (kind === 'special') { spark(c.x - 40, c.y - 30, 'spark--y'); spark(c.x + 30, c.y + 20, 'spark--r'); }
      dmgText(c.x, c.y, countered ? 'COUNTER!' : (kind === 'special' ? chosen.special.toUpperCase() + '!' : '-' + dmg));
      if ((kind !== 'punch') && KP.motionOK()) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
    }, 70);
    if (combo >= 2) { comboN.textContent = combo; comboEl.classList.add('is-on'); clearTimeout(comboEl._t); comboEl._t = setTimeout(function () { comboEl.classList.remove('is-on'); }, 1200); }
    render();
    if (hp2 <= 0) return ko();
    var msg = (kind === 'special' ? chosen.special + '! ' : m.label + (countered ? ', counter hit! ' : '. ')) + (combo >= 2 ? combo + ' hit combo. ' : '') + 'Ninja Karaage at ' + Math.max(0, Math.round(hp2)) + ' percent.' + (sp >= 100 ? ' Special ready, press L.' : '');
    narrate(msg, kind === 'special');
  }

  function scheduleCpu(ms) {
    clearTimeout(cpuT);
    cpuT = setTimeout(cpuTurn, ms || KP.rand(1500, 2500));
  }
  function cpuTurn() {
    if (state !== 'fight' || !fighting) return;
    if (!visible || document.hidden) return scheduleCpu(800);
    winding = true; f2.classList.add('is-wind');
    cpuT = setTimeout(function () {
      if (!winding || !fighting) return;
      winding = false; f2.classList.remove('is-wind');
      anim(f2, 'is-attack', 180);
      if (hp1 > 15) {
        hp1 = Math.max(15, hp1 - 8);
        setTimeout(function () {
          var c = center(f1);
          f1.style.setProperty('--kb', '-14px'); f1.style.setProperty('--kr', '-4deg');
          anim(f1, 'is-hurt', 140); spark(c.x, c.y, 'spark--r'); dmgText(c.x, c.y, '-8');
        }, 90);
        combo = 0; render();
        narrate('Ninja Karaage hits you. Your health ' + hp1 + ' percent. Strike while it winds up to counter.');
      } else {
        dmgText(center(f2).x, center(f2).y, 'TOO SLOW!');
      }
      scheduleCpu();
    }, 620);
  }

  function ko() {
    fighting = false; clearTimeout(cpuT); clearTimeout(narrT); winding = false;
    f2.className = 'fighter fighter--p2 is-ko';
    f1.className = 'fighter fighter--p1' + (KP.motionOK() ? ' is-hop-in' : ' is-out');
    showCall('K.O.!');
    KP.say(live, 'K.O.! ' + chosen.name + ' wins and jumps back into the bowl. Every fighter is in your bowl.');
    later(function () {
      f1.className = 'fighter fighter--p1 is-out';
      f2.className = 'fighter fighter--p2 is-idle is-wait';
      setState('ko');
      $('[data-ko-win]').textContent = chosen.name + ' wins!';
      $('[data-ko-score]').textContent = 'Score ' + String(score).padStart(6, '0');
      var w = $('[data-ko-win]'); if (w) { w.setAttribute('tabindex', '-1'); w.focus({ preventScroll: true }); }
    }, KP.motionOK() ? 900 : 200);
  }

  sec.querySelectorAll('[data-move]').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.preventDefault(); move(b.dataset.move); b._tap = true; } });
    b.addEventListener('click', function () { if (b._tap) { b._tap = false; return; } move(b.dataset.move); });
  });
  sec.addEventListener('keydown', function (e) {
    if (state !== 'fight' || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    var map = { j: 'punch', k: 'kick', l: 'special' };
    if (map[k]) { e.preventDefault(); if (!e.repeat) move(map[k]); }
  });
  $('[data-rematch]').addEventListener('click', enterAndFight);
  $('[data-reselect]').addEventListener('click', function () {
    resetToWait();
    var c = grid.querySelector('input:checked'); if (c) c.focus();
    KP.say(live, 'Ninja Karaage is waiting. Choose your fighter.');
  });
  var pauseBtn = $('[data-fight-pause]');
  if (pauseBtn) pauseBtn.addEventListener('click', function () {
    var paused = pauseBtn.getAttribute('aria-pressed') === 'true';
    pauseBtn.setAttribute('aria-pressed', paused ? 'false' : 'true');
    pauseBtn.textContent = paused ? 'Pause fight' : 'Resume fight';
    if (paused) { fighting = true; scheduleCpu(800); KP.say(live, 'Fight resumed.'); }
    else { fighting = false; clearTimeout(cpuT); KP.say(live, 'Fight paused.'); }
  });


  setState('idle');

  /* test hook for screenshots */
  window.KP_combat = {
    roster: function (on) { setRoster(!!on, !!on); },
    hover: function (id) {
      var f = D.fighters.find(function (x) { return x.id === id; }) || D.fighters[0];
      setRoster(false, false);
      if (f) { showP1(f, true); pinFighter(f.id); }
    },
    clearPin: clearPin,
    open: function () { focusFloor(); },
    setState: setState, startFight: startFight, enter: enterAndFight, reset: resetToWait, move: move,
    ko: function () { hp2 = 0; ko(); },
    hit: function (n) { for (var i = 0; i < n; i++) { cd = 0; move(i % 2 ? 'kick' : 'punch'); } }
  };
})();
