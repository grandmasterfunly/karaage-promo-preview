/* Select Your Karaage: four master flyers as a hoverable / swipeable deck */
(function () {
  'use strict';
  var KP = window.KP;
  var sec = document.getElementById('k-lineup');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var cards = Array.prototype.slice.call(sec.querySelectorAll('.lineup__card[data-lineup]'));
  var order = $('[data-lineup-order]');
  var live = $('[data-lineup-live]');
  var cur = 'combat';
  var NAMES = {
    combat: 'Karaage Combat Bowl',
    enter: 'Enter the Karaage Bowl',
    soba: 'Soba Noodle Hidden Karaage Bowl',
    hustle: 'Karaage Hustle Burrito'
  };
  function show(id, announce) {
    if (!NAMES[id]) return;
    cur = id;
    cards.forEach(function (b) {
      var on = b.getAttribute('data-lineup') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (order) order.setAttribute('aria-label', 'Order Now, ' + NAMES[id]);
    if (announce && live) KP.say(live, NAMES[id] + ' selected.');
  }

  cards.forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-lineup'), true); });
    b.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') show(b.getAttribute('data-lineup'), false);
    });
    b.addEventListener('focus', function () { show(b.getAttribute('data-lineup'), false); });
  });

  sec.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var i = cards.findIndex(function (b) { return b.getAttribute('data-lineup') === cur; });
    if (i < 0) return;
    e.preventDefault();
    var next = cards[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + cards.length) % cards.length];
    next.focus();
    show(next.getAttribute('data-lineup'), true);
  });

  /* Mobile: swipe the deck to flip the front card, no scrollIntoView. */
  var deck = sec.querySelector('.lineup__deck');
  var sx = 0, sy = 0, tracking = false;
  if (deck) {
    deck.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    deck.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      var i = cards.findIndex(function (b) { return b.getAttribute('data-lineup') === cur; });
      if (i < 0) return;
      var next = cards[(i + (dx < 0 ? 1 : -1) + cards.length) % cards.length];
      show(next.getAttribute('data-lineup'), true);
    });
    deck.addEventListener('pointercancel', function () { tracking = false; });
  }

  show('combat', false);
})();
