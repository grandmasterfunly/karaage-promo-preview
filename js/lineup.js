/* Select Your Bowl: single-stage arcade picker. No scroll handlers, no filters. */
(function () {
  'use strict';
  var sec = document.getElementById('k-lineup');
  if (!sec) return;
  var picks = [].slice.call(sec.querySelectorAll('[data-lineup]'));
  var wm = sec.querySelector('[data-lineup-wm]');
  var tag = sec.querySelector('[data-lineup-tag]');
  var order = sec.querySelector('[data-lineup-order]');
  var live = sec.querySelector('[data-lineup-live]');
  var imgA = sec.querySelector('[data-lineup-a]');
  var imgB = sec.querySelector('[data-lineup-b]');
  var front = imgA;
  var back = imgB;
  var reduced = false;
  try { reduced = document.documentElement.classList.contains('motion-off') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  var DATA = {
    combat: {
      name: 'Karaage Combat Bowl',
      tag: 'Choose your bowl.',
      wm: 'assets/wm-combat.webp', wmw: 1600, wmh: 460,
      src: 'assets/bowl-combat.webp',
      srcset: 'assets/bowl-combat-sm.webp 800w, assets/bowl-combat.webp 1391w',
      sizes: '(max-width:760px) 86vw, 520px',
      w: 1391, h: 1126,
      alt: 'Karaage Combat Bowl: three crispy karaage over sushi rice with fried onions, pickled jalapeños, shredded cheese, scallions, purple cabbage, carrots, cucumber and Sus Hi sauce.'
    },
    enter: {
      name: 'Enter the Karaage Bowl',
      tag: 'Become one with the taste.',
      wm: 'assets/wm-enter.webp', wmw: 1600, wmh: 511,
      src: 'assets/bowl-enter.webp', srcset: '', sizes: '',
      w: 1000, h: 829,
      alt: 'Enter the Karaage Bowl: three crispy karaage drizzled with white sauce and sweet soy over sushi rice, with cheese, carrots, cucumber and scallions.'
    },
    soba: {
      name: 'Soba Noodle Hidden Karaage Bowl',
      tag: 'Chill noodles. Bold moves.',
      wm: 'assets/wm-soba.webp', wmw: 1600, wmh: 445,
      src: 'assets/bowl-soba.webp', srcset: '', sizes: '',
      w: 1228, h: 1236,
      alt: 'Soba Noodle Hidden Karaage Bowl: crispy karaage over chilled soba noodles with kimchi, scallions, carrots and cucumber.'
    },
    hustle: {
      name: 'Karaage Hustle Burrito',
      tag: 'The chicken the other chicken fears.',
      wm: 'assets/wm-hustle.webp', wmw: 1600, wmh: 625,
      src: 'assets/burrito.webp',
      srcset: 'assets/burrito-sm.webp 800w, assets/burrito.webp 1325w',
      sizes: '(max-width:760px) 86vw, 520px',
      w: 1325, h: 1117,
      alt: 'Karaage Hustle Burrito cut in half: two halves standing side by side, showing crispy karaage, slaw, carrots and sauce.'
    }
  };
  var IDS = ['combat', 'enter', 'soba', 'hustle'];
  var current = 'combat';
  var preloaded = { combat: true };
  var touched = false;

  function preloadAll() {
    if (touched) return;
    touched = true;
    IDS.forEach(function (id) {
      if (preloaded[id]) return;
      var d = DATA[id];
      var im = new Image();
      if (d.srcset) im.srcset = d.srcset;
      im.src = d.src;
      var wmIm = new Image();
      wmIm.src = d.wm;
      preloaded[id] = true;
    });
  }

  function applySrc(el, d) {
    if (!el) return;
    el.width = d.w;
    el.height = d.h;
    if (d.srcset) {
      el.srcset = d.srcset;
      el.sizes = d.sizes;
    } else {
      el.removeAttribute('srcset');
      el.removeAttribute('sizes');
    }
    el.src = d.src;
  }

  function show(id, announce) {
    var d = DATA[id];
    if (!d || id === current && announce === false) {
      /* still sync radios if needed */
    }
    var prev = current;
    current = id;
    picks.forEach(function (b) {
      var on = b.getAttribute('data-lineup') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (wm) { wm.src = d.wm; wm.alt = d.name; wm.width = d.wmw; wm.height = d.wmh; }
    if (tag) tag.textContent = d.tag;
    if (order) order.setAttribute('aria-label', 'Order ' + d.name);
    if (announce !== false && live) live.textContent = d.name + ' selected.';
    if (id === prev && front && front.getAttribute('src') === d.src) return;
    if (!back || !front) return;
    applySrc(back, d);
    back.alt = d.alt;
    back.removeAttribute('aria-hidden');
    front.alt = '';
    front.setAttribute('aria-hidden', 'true');
    if (reduced) {
      front.classList.remove('is-on');
      back.classList.add('is-on');
      var tmp = front; front = back; back = tmp;
      return;
    }
    /* opacity crossfade; start only after the incoming image is ready when possible */
    var incoming = back;
    function swap() {
      if (incoming !== back) return;
      front.classList.remove('is-on');
      back.classList.add('is-on');
      var tmp = front; front = back; back = tmp;
    }
    if (incoming.complete && incoming.naturalWidth) swap();
    else incoming.addEventListener('load', swap, { once: true });
  }

  picks.forEach(function (b, i) {
    b.addEventListener('click', function () {
      preloadAll();
      show(b.getAttribute('data-lineup'));
    });
    b.addEventListener('focus', function () { preloadAll(); });
    b.addEventListener('keydown', function (e) {
      var key = e.key;
      if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
      e.preventDefault();
      preloadAll();
      var idx = IDS.indexOf(current);
      if (key === 'Home') idx = 0;
      else if (key === 'End') idx = IDS.length - 1;
      else if (key === 'ArrowRight' || key === 'ArrowDown') idx = (idx + 1) % IDS.length;
      else idx = (idx - 1 + IDS.length) % IDS.length;
      show(IDS[idx]);
      picks[idx].focus({ preventScroll: true });
    });
  });

  window.KP_lineup = { pick: function (id) { if (DATA[id]) { preloadAll(); show(id); } }, current: function () { return current; } };
})();
