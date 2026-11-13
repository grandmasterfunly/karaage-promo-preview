/* Hustle: tap-only poster burst + Karaage wisdom. No scroll-linked JS, no layout changes. */
(function () {
  'use strict';
  var D = window.KP_DATA;
  var poster = document.querySelector('[data-hu-poster]');
  if (poster) {
    var powBtn = poster.querySelector('[data-hu-pow]');
    var burst = poster.querySelector('[data-hu-burst]');
    var mascot = poster.querySelector('[data-hu-mascot]');
    var live = poster.querySelector('[data-hu-live]');
    function bang() {
      var word = KP.pick(D.bursts);
      if (burst) burst.textContent = word;
      if (live) KP.say(live, word);
      if (!KP.motionOK()) return;
      if (burst) { burst.classList.remove('is-on'); void burst.offsetWidth; burst.classList.add('is-on'); }
      if (mascot) { mascot.classList.remove('is-hit'); void mascot.offsetWidth; mascot.classList.add('is-hit'); }
    }
    if (powBtn) powBtn.addEventListener('click', bang);
  }

  var sec = document.getElementById('k-wisdom') || document.getElementById('k-hustle');
  if (!sec) return;
  function $(s) { return sec.querySelector(s); }
  var idx = 0, cur = { idx: 0 };
  function baseCount(i, k) { return ((i * (k === 'fire' ? 17 : 13) + 3) % 47) + 8; }
  function deal(announce) {
    var txt = $('[data-fact-text]'), count = $('[data-fact-count]'), pow = $('[data-pow]'), bub = $('[data-bubble]');
    if (!txt) return;
    idx = (idx + (announce ? 1 : 0)) % D.jokes.length;
    cur.idx = idx;
    if (!announce) txt.setAttribute('aria-live', 'off');
    if (count) count.textContent = '#' + (idx + 1);
    txt.textContent = D.jokes[idx];
    if (!announce) setTimeout(function () { txt.setAttribute('aria-live', 'polite'); }, 50);
    if (pow) pow.textContent = KP.pick(D.bursts);
    if (announce && KP.motionOK() && bub && pow) {
      bub.classList.remove('is-hit'); void bub.offsetWidth; bub.classList.add('is-hit');
      pow.classList.remove('is-on'); void pow.offsetWidth; pow.classList.add('is-on');
    }
    sec.querySelectorAll('[data-react]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    sec.querySelectorAll('[data-react-n]').forEach(function (n) { n.textContent = baseCount(idx, n.dataset.reactN); });
  }
  var hit = $('[data-hit]');
  if (hit) hit.addEventListener('click', function () { deal(true); });
  sec.querySelectorAll('[data-react]').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var k = b.dataset.react, n = sec.querySelector('[data-react-n="' + k + '"]');
      if (n) n.textContent = baseCount(cur.idx, k) + (on ? 1 : 0);
      if (on && KP.motionOK()) {
        for (var i = 0; i < 5; i++) {
          var p = document.createElement('span'); p.className = 'pop'; p.setAttribute('aria-hidden', 'true');
          p.textContent = k === 'fire' ? '\uD83D\uDD25' : '\uD83D\uDE02';
          p.style.left = (b.offsetWidth / 2 - 10 + KP.rand(-14, 14)) + 'px'; p.style.top = '-6px';
          p.style.setProperty('--dx', KP.rand(-40, 40) + 'px'); p.style.setProperty('--dr', KP.rand(-40, 40) + 'deg');
          b.appendChild(p); setTimeout(function (q) { q.remove(); }.bind(null, p), 950);
        }
      }
    });
  });
  deal(false);
  window.KP_hustle = { deal: deal };
})();
