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
    KP.say(live, 'Ninja Karaage is waiting on the dojo floor. Choose your ingredient, then press Fight.');
    var c = grid.querySelector('input:checked'); if (c) c.focus({ preventScroll: true });
  }
  if (startBtn) startBtn.addEventListener('click', function () { focusFloor(); });
  function resetToWait() {
    clearTimers(); fighting = false; clearTimeout(cpuT); clearTimeout(narrT);
    if (f1) f1.className = 'fighter fighter--p1 is-idle is-preview';
    if (f2) f2.className = 'fighter fighter--p2 is-idle is-wait';
    setState('idle');
    if (prompt) prompt.textContent = 'Ninja Karaage is waiting. Choose your ingredient.';
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
    var bowlImg2 = stage && stage.querySelector('img');
    if (bowlImg2) bowlImg2.addEventListener('load', scheduleLines);
    if (document.fonts) document.fonts.ready.then(scheduleLines);
    if (tog) tog.addEventListener('click', function () {
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
    cpuBlocking = false; playerBlocking = false; cpuKind = null;
    setPlayerBlock(false);
    if (f2) f2.classList.remove('is-block', 'is-wind');
    $('[data-f1-img]').src = 'assets/f-' + chosen.id + '.webp';
    $('[data-hud-p1-name]').textContent = chosen.name;
    f1.className = 'fighter fighter--p1 is-idle'; f2.className = 'fighter fighter--p2 is-idle';
    render();
    showCall('Fight!');
    KP.say(live, 'Fight! Press J to punch, K to kick, L for ' + chosen.special + ', B to block. Strike after Ninja Karaage attacks. Do not spam into its block.');
    sec.querySelector('[data-move="punch"]').focus({ preventScroll: true });
    scheduleCpu(easyMode ? 2600 : 1800);
  }
  function showCall(t) { call.textContent = t; call.classList.remove('is-on'); void call.offsetWidth; call.classList.add('is-on'); }
  function render() {
    hpEl1.style.width = Math.max(0, hp1) + '%'; hpEl2.style.width = Math.max(0, hp2) + '%';
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
  var CPU_MOVES = { punch: { dmg: 8, label: 'Punch' }, kick: { dmg: 12, label: 'Kick' }, special: { dmg: 18, label: 'Special' } };
  var playerBlocking = false, cpuBlocking = false, cpuKind = null, easyMode = false;

  function setPlayerBlock(on) {
    playerBlocking = !!on;
    var b = $('[data-block]');
    if (b) { b.setAttribute('aria-pressed', playerBlocking ? 'true' : 'false'); b.classList.toggle('is-on', playerBlocking); }
    if (f1) f1.classList.toggle('is-block', playerBlocking);
  }

  function move(kind) {
    if (state !== 'fight' || !fighting) return;
    var now = performance.now();
    if (now < cd) return;
    var m = MOVES[kind];
    if (kind === 'special') { if (sp < 100) return; sp = 0; }
    if (playerBlocking) setPlayerBlock(false);
    cd = now + m.cd;
    var btn = sec.querySelector('[data-move="' + kind + '"]');
    if (btn) { btn.classList.add('is-press'); setTimeout(function () { btn.classList.remove('is-press'); }, 120); }
    if (kind === 'special') f1.classList.add('is-special--' + chosen.id);
    anim(f1, 'is-' + kind, kind === 'special' ? 560 : 160);
    var dmg = m.dmg + Math.round(KP.rand(-1, 2));
    var countered = winding && !cpuBlocking;
    if (countered) { dmg += 4; winding = false; f2.classList.remove('is-wind'); clearTimeout(cpuT); scheduleCpu(easyMode ? 2000 : 1400); }
    var blocked = cpuBlocking && !countered;
    if (blocked) {
      dmg = (kind === 'special') ? 6 : 0; /* chip only on special */
    }
    combo = blocked ? 0 : ((now - lastHit < 1200) ? combo + 1 : 1);
    if (!blocked) lastHit = now;
    if (combo >= 3) dmg += 2;
    hp2 = Math.max(0, hp2 - dmg);
    if (!blocked) score += dmg * 100 * Math.max(1, combo);
    if (kind !== 'special') sp += Math.max(0, dmg) * 1.9;
    setTimeout(function () {
      var c = center(f2);
      if (blocked) {
        dmgText(c.x, c.y, dmg ? 'CHIP ' + dmg : 'BLOCKED!');
        if (dmg) { anim(f2, 'is-hurt', 100); }
      } else {
        f2.style.setProperty('--kb', (kind === 'special' ? 40 : 14) + 'px');
        f2.style.setProperty('--kr', (kind === 'kick' ? 6 : 3) + 'deg');
        anim(f2, 'is-hurt', 140);
        spark(c.x + KP.rand(-30, 30), c.y + KP.rand(-40, 30), kind === 'special' ? 'spark--r' : (kind === 'kick' ? 'spark--y' : ''));
        if (kind === 'special') { spark(c.x - 40, c.y - 30, 'spark--y'); spark(c.x + 30, c.y + 20, 'spark--r'); }
        dmgText(c.x, c.y, countered ? 'COUNTER!' : (kind === 'special' ? chosen.special.toUpperCase() + '!' : '-' + dmg));
        if ((kind !== 'punch') && KP.motionOK()) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
      }
    }, 70);
    if (combo >= 2) { comboN.textContent = combo; comboEl.classList.add('is-on'); clearTimeout(comboEl._t); comboEl._t = setTimeout(function () { comboEl.classList.remove('is-on'); }, 1200); }
    render();
    if (hp2 <= 0) return endFight(true);
    var msg = blocked
      ? (dmg ? 'Special chips the block for ' + dmg + '. ' : 'Ninja Karaage blocked your ' + m.label.toLowerCase() + '. ') + 'Wait for an opening after it attacks.'
      : ((kind === 'special' ? chosen.special + '! ' : m.label + (countered ? ', counter hit! ' : '. ')) + (combo >= 2 ? combo + ' hit combo. ' : '') + 'Ninja Karaage at ' + Math.max(0, Math.round(hp2)) + ' percent.' + (sp >= 100 ? ' Special ready, press L.' : ''));
    narrate(msg, kind === 'special' || blocked);
  }

  function scheduleCpu(ms) {
    clearTimeout(cpuT);
    var wait = ms || (easyMode ? KP.rand(2200, 3400) : KP.rand(1100, 2000));
    cpuT = setTimeout(cpuTurn, wait);
  }
  function cpuTurn() {
    if (state !== 'fight' || !fighting) return;
    if (!visible || document.hidden) return scheduleCpu(800);
    /* pick an action: block or a telegraphed attack */
    var roll = Math.random();
    if (easyMode) {
      cpuKind = roll < .2 ? 'block' : (roll < .7 ? 'punch' : (roll < .9 ? 'kick' : 'special'));
    } else {
      cpuKind = roll < .28 ? 'block' : (roll < .58 ? 'punch' : (roll < .84 ? 'kick' : 'special'));
    }
    if (cpuKind === 'block') {
      cpuBlocking = true;
      f2.classList.add('is-block');
      winding = false;
      narrate('Ninja Karaage takes a blocking stance.');
      cpuT = setTimeout(function () {
        cpuBlocking = false;
        if (f2) f2.classList.remove('is-block');
        scheduleCpu(easyMode ? 1600 : 900);
      }, easyMode ? 700 : 900);
      return;
    }
    winding = true; cpuBlocking = false;
    f2.classList.add('is-wind');
    f2.classList.remove('is-block');
    narrate('Ninja Karaage winds up a ' + cpuKind + '. Block or counter!');
    var wind = easyMode ? 900 : (cpuKind === 'special' ? 700 : 520);
    cpuT = setTimeout(function () {
      if (!winding || !fighting) return;
      winding = false; f2.classList.remove('is-wind');
      var kind = cpuKind;
      anim(f2, 'is-' + (kind === 'kick' ? 'kick' : 'attack'), kind === 'special' ? 400 : 180);
      var base = CPU_MOVES[kind].dmg;
      if (easyMode) base = Math.max(4, Math.round(base * 0.6));
      var blocked = playerBlocking;
      var dmg = blocked ? (kind === 'special' ? 5 : 0) : base;
      hp1 = Math.max(0, hp1 - dmg);
      setTimeout(function () {
        var c = center(f1);
        if (blocked) {
          dmgText(c.x, c.y, dmg ? 'CHIP ' + dmg : 'BLOCKED!');
        } else {
          f1.style.setProperty('--kb', '-14px'); f1.style.setProperty('--kr', '-4deg');
          anim(f1, 'is-hurt', 140); spark(c.x, c.y, 'spark--r'); dmgText(c.x, c.y, '-' + dmg);
        }
      }, 90);
      if (!blocked) combo = 0;
      render();
      if (hp1 <= 0) return endFight(false);
      narrate(blocked
        ? (dmg ? 'You blocked the special, but took chip damage. Your health ' + Math.round(hp1) + ' percent.'
               : 'You blocked the ' + kind + '. Strike now.')
        : ('Ninja Karaage hits you with a ' + kind + '. Your health ' + Math.round(hp1) + ' percent. Strike while it recovers.'));
      scheduleCpu(easyMode ? 2000 : 1200);
    }, wind);
  }

  function endFight(playerWon) {
    fighting = false; clearTimeout(cpuT); clearTimeout(narrT); winding = false; cpuBlocking = false;
    setPlayerBlock(false);
    if (playerWon) {
      f2.className = 'fighter fighter--p2 is-ko';
      f1.className = 'fighter fighter--p1' + (KP.motionOK() ? ' is-hop-in' : '');
    } else {
      f1.className = 'fighter fighter--p1 is-ko';
      f2.className = 'fighter fighter--p2' + (KP.motionOK() ? ' is-hop-in' : ' is-idle');
    }
    showCall('K.O.!');
    var name = playerWon ? chosen.name : 'Ninja Karaage';
    KP.say(live, 'K.O.! ' + name + ' wins.');
    later(function () {
      setState('ko');
      if (koBox) { koBox.classList.toggle('is-win', playerWon); koBox.classList.toggle('is-lose', !playerWon); }
      var img = $('[data-ko-victor]');
      if (img) {
        img.src = playerWon ? ('assets/f-' + chosen.id + '.webp') : 'assets/f-ninja.webp';
        img.alt = name;
      }
      var mark = $('[data-ko-mark]');
      if (mark) mark.textContent = playerWon ? 'YOU WIN' : 'YOU LOSE';
      var winLine = $('[data-ko-win]');
      if (winLine) {
        winLine.textContent = name + ' wins!';
        winLine.setAttribute('tabindex', '-1');
        winLine.focus({ preventScroll: true });
      }
      var sc = $('[data-ko-score]');
      if (sc) sc.textContent = 'Score ' + String(score).padStart(6, '0');
    }, KP.motionOK() ? 900 : 200);
  }
  function ko() { endFight(true); }

  sec.querySelectorAll('[data-move]').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.preventDefault(); move(b.dataset.move); b._tap = true; } });
    b.addEventListener('click', function () { if (b._tap) { b._tap = false; return; } move(b.dataset.move); });
  });
  var blockBtn = $('[data-block]');
  if (blockBtn) {
    blockBtn.addEventListener('pointerdown', function (e) { if (e.button && e.button !== 0) return; e.preventDefault(); try { blockBtn.setPointerCapture(e.pointerId); } catch (x) {} setPlayerBlock(true); });
    blockBtn.addEventListener('pointerup', function () { setPlayerBlock(false); });
    blockBtn.addEventListener('pointercancel', function () { setPlayerBlock(false); });
    blockBtn.addEventListener('lostpointercapture', function () { setPlayerBlock(false); });
  }
  sec.addEventListener('keydown', function (e) {
    if (state !== 'fight' || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    var map = { j: 'punch', k: 'kick', l: 'special' };
    if (map[k]) { e.preventDefault(); if (!e.repeat) move(map[k]); }
    if (k === 'b') { e.preventDefault(); if (!e.repeat) setPlayerBlock(true); }
  });
  sec.addEventListener('keyup', function (e) {
    if (e.key.toLowerCase() === 'b') setPlayerBlock(false);
  });
  $('[data-rematch]').addEventListener('click', enterAndFight);
  $('[data-reselect]').addEventListener('click', function () {
    resetToWait();
    var c = grid.querySelector('input:checked'); if (c) c.focus();
    KP.say(live, 'Ninja Karaage is waiting. Choose your ingredient.');
  });
  var pauseBtn = $('[data-fight-pause]');
  if (pauseBtn) pauseBtn.addEventListener('click', function () {
    var paused = pauseBtn.getAttribute('aria-pressed') === 'true';
    pauseBtn.setAttribute('aria-pressed', paused ? 'false' : 'true');
    pauseBtn.textContent = paused ? 'Pause fight' : 'Resume fight';
    if (paused) { fighting = true; scheduleCpu(800); KP.say(live, 'Fight resumed.'); }
    else { fighting = false; clearTimeout(cpuT); KP.say(live, 'Fight paused.'); }
  });
  var easyBtn = $('[data-fight-easy]');
  if (easyBtn) easyBtn.addEventListener('click', function () {
    easyMode = !easyMode;
    easyBtn.setAttribute('aria-pressed', easyMode ? 'true' : 'false');
    KP.say(live, easyMode ? 'Relaxed fight on. The Ninja is slower and less aggressive.' : 'Relaxed fight off.');
  });

  setState('idle');


  /* Arcade start menu: arrow keys + hover/focus move the cursor */
  var cmenu = document.querySelector('.cmenu');
  if (cmenu) {
    var cOpts = [].slice.call(cmenu.querySelectorAll('[data-cmenu]'));
    function cmenuSelect(i, moveFocus) {
      i = (i + cOpts.length) % cOpts.length;
      cOpts.forEach(function (o, n) { o.classList.toggle('is-on', n === i); });
      if (moveFocus) cOpts[i].focus();
    }
    function cmenuIndex() {
      var i = cOpts.findIndex(function (o) { return o === document.activeElement; });
      if (i < 0) i = cOpts.findIndex(function (o) { return o.classList.contains('is-on'); });
      return i < 0 ? 0 : i;
    }
    cOpts.forEach(function (o, i) {
      o.addEventListener('mouseenter', function () { cmenuSelect(i, false); });
      o.addEventListener('focus', function () { cmenuSelect(i, false); });
    });
    cmenu.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); cmenuSelect(cmenuIndex() + 1, true); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); cmenuSelect(cmenuIndex() - 1, true); }
    });
    var infoBtn = cmenu.querySelector('[data-cmenu-info]');
    var desc = cmenu.querySelector('#cmenu-desc');
    if (infoBtn && desc) {
      infoBtn.addEventListener('click', function () {
        var open = desc.hasAttribute('hidden');
        if (open) desc.removeAttribute('hidden'); else desc.setAttribute('hidden', '');
        infoBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (typeof setRoster === 'function') setRoster(open, open);
      });
    }
  }

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
    ko: function () { hp2 = 0; endFight(true); },
    win: function () { hp2 = 0; endFight(true); },
    lose: function () { hp1 = 0; endFight(false); },
    block: function (on) { setPlayerBlock(!!on); },
    hit: function (n) { for (var i = 0; i < n; i++) { cd = 0; move(i % 2 ? 'kick' : 'punch'); } }
  };
})();
