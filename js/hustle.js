/* Karaage Hustle Burrito: one speech bubble, endless karaage wisdom */
(function () {
  'use strict';
  var KP = window.KP, D = window.KP_DATA;
  var sec = document.getElementById('k-hustle');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var txt = $('[data-fact-text]'), nEl = $('[data-fact-count]'), pow = $('[data-pow]'), bub = $('[data-bubble]');
  var deck = [], dealt = 0, cur = null;
  function draw() { if (!deck.length) deck = D.jokes.map(function (j, i) { return i; }).sort(function () { return Math.random() - .5; }); return deck.pop(); }
  function baseCount(i, k) { return 12 + ((i * (k === 'fire' ? 37 : 53)) % 180); }
  function deal(announce) {
    var idx = draw(); dealt++;
    nEl.textContent = '#' + dealt;
    cur = { idx: idx };
    if (!announce) txt.removeAttribute('aria-live');
    txt.textContent = D.jokes[idx];
    if (!announce) setTimeout(function () { txt.setAttribute('aria-live', 'polite'); }, 50);
    pow.textContent = KP.pick(D.bursts);
    if (announce && KP.motionOK()) {
      bub.classList.remove('is-hit'); void bub.offsetWidth; bub.classList.add('is-hit');
      pow.classList.remove('is-on'); void pow.offsetWidth; pow.classList.add('is-on');
    }
    sec.querySelectorAll('[data-react]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    sec.querySelectorAll('[data-react-n]').forEach(function (n) { n.textContent = baseCount(idx, n.dataset.reactN); });
  }
  $('[data-hit]').addEventListener('click', function () { deal(true); });
  sec.querySelectorAll('[data-react]').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var k = b.dataset.react, n = sec.querySelector('[data-react-n="' + k + '"]');
      n.textContent = baseCount(cur.idx, k) + (on ? 1 : 0);
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
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en, ob) { if (en[0].isIntersecting) { sec.classList.add('is-in'); ob.disconnect(); } }, { threshold: .25 }).observe(sec); else sec.classList.add('is-in');
  window.KP_hustle = { deal: deal };
})();
