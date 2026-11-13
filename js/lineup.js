/* The Chicken Karaage Lineup: fanned official product photos */
(function () {
  'use strict';
  var sec = document.getElementById('k-lineup');
  if (!sec) return;
  var items = sec.querySelectorAll('[data-lineup]');
  var info = sec.querySelector('[data-lineup-info]');
  var wm = sec.querySelector('[data-lineup-wm]');
  var tag = sec.querySelector('[data-lineup-tag]');
  var order = sec.querySelector('[data-lineup-order]');
  var fan = sec.querySelector('.lineup__fan') || sec;
  var DATA = {
    combat: { src: 'assets/wm-combat.webp', alt: 'Karaage Combat Bowl', tag: 'Choose your bowl.', w: 1600, h: 460, z: 2 },
    enter: { src: 'assets/wm-enter.webp', alt: 'Enter the Karaage Bowl', tag: 'Become one with the taste.', w: 1600, h: 511, z: 3 },
    soba: { src: 'assets/wm-soba.webp', alt: 'Soba Noodle Hidden Karaage Bowl', tag: 'Chill noodles. Bold moves.', w: 1600, h: 445, z: 3 },
    hustle: { src: 'assets/wm-hustle.webp', alt: 'Karaage Hustle Burrito', tag: 'The chicken the other chicken fears.', w: 1600, h: 625, z: 2 }
  };
  var current = null;
  function pick(id) {
    if (current === id) {
      current = null;
      sec.classList.remove('is-picked');
      items.forEach(function (b) { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); });
      if (info) info.classList.add('is-empty');
      if (tag) tag.textContent = '';
      return;
    }
    current = id;
    sec.classList.add('is-picked');
    items.forEach(function (b) {
      var on = b.getAttribute('data-lineup') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var d = DATA[id];
    if (d && wm) { wm.src = d.src; wm.alt = d.alt; wm.width = d.w; wm.height = d.h; }
    if (tag) tag.textContent = d ? d.tag : '';
    if (order) order.setAttribute('aria-label', d ? ('Order ' + d.alt) : 'Order now');
    if (info) info.classList.remove('is-empty');
  }
  function zOf(b) {
    if (b.classList.contains('is-on')) return 100;
    var d = DATA[b.getAttribute('data-lineup')];
    return d ? d.z : 1;
  }
  var hitCache = new WeakMap();
  function alphaAt(img, clientX, clientY) {
    var r = img.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return 0;
    if (!img.naturalWidth) return 0;
    var c = hitCache.get(img);
    if (!c) {
      c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      try { c.getContext('2d').drawImage(img, 0, 0); hitCache.set(img, c); }
      catch (e) { return 255; }
    }
    var x = Math.min(c.width - 1, Math.max(0, Math.floor((clientX - r.left) / r.width * c.width)));
    var y = Math.min(c.height - 1, Math.max(0, Math.floor((clientY - r.top) / r.height * c.height)));
    try { return c.getContext('2d').getImageData(x, y, 1, 1).data[3]; }
    catch (e) { return 255; }
  }
  function hitItem(clientX, clientY) {
    var list = Array.prototype.slice.call(items).sort(function (a, b) { return zOf(b) - zOf(a); });
    for (var i = 0; i < list.length; i++) {
      var img = list[i].querySelector('img');
      if (img && alphaAt(img, clientX, clientY) > 24) return list[i];
    }
    return null;
  }
  fan.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var hit = hitItem(e.clientX, e.clientY);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      pick(hit.getAttribute('data-lineup'));
    }
  }, true);
  items.forEach(function (b) {
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(b.getAttribute('data-lineup'));
      }
    });
  });
  window.KP_lineup = { pick: pick, hitItem: hitItem };
})();
