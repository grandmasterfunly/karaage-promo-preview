/* Tiny ?debug=1 overlay: resize, layout-shift, and unexpected scroll-jump counts. */
(function () {
  'use strict';
  if (!/[?&]debug=1(?:&|$)/.test(location.search)) return;
  var VER = '20261113j';
  var box = document.createElement('div');
  box.id = 'kp-debug';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;pointer-events:none;white-space:pre;font:11px/1.4 ui-monospace,Menlo,monospace;background:rgba(10,7,16,.9);color:#ffe35a;padding:8px 10px;border:2px solid #ffe35a;max-width:260px;';
  var resizes = 0, resizesW = 0, resizesH = 0, vvResizes = 0, shifts = 0, cls = 0;
  var jumps = 0, jumpsResize = 0, jumpsFlick = 0, lastJump = '';
  var lastW = window.innerWidth, lastH = window.innerHeight, lastY = window.scrollY, lastST = performance.now();
  function sectionAt() {
    try {
      var el = document.elementFromPoint(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
      var sec = el && el.closest && el.closest('[data-chapter], .kp section, #main > *');
      if (!sec) return '?';
      return sec.id || sec.getAttribute('data-chapter') || (sec.className || '').toString().split(' ')[0] || '?';
    } catch (e) { return '?'; }
  }
  function paint() {
    if (!box.parentNode) return;
    box.textContent = 'debug=1 v=' + VER
      + '\nresize ' + resizes + ' (w ' + resizesW + ' / h-only ' + resizesH + ')'
      + '\nvviewport ' + vvResizes
      + '\nlayout shifts ' + shifts
      + '\nCLS ' + cls.toFixed(3)
      + '\nscroll jumps ' + jumps + ' (resize ' + jumpsResize + ' / flick ' + jumpsFlick + ')'
      + (lastJump ? '\nlast jump @ ' + lastJump : '');
  }
  function mount() { if (!box.parentNode && document.body) document.body.appendChild(box); paint(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('resize', function () {
    resizes++;
    if (window.innerWidth !== lastW) resizesW++; else resizesH++;
    var y = window.scrollY;
    /* Height-only resize with a large scroll correction means layout used a
       dynamic viewport unit (or JS scrolled). Tiny Safari chrome adjustments are ignored. */
    if (window.innerWidth === lastW && Math.abs(y - lastY) > 24) {
      jumps++; jumpsResize++; lastJump = sectionAt() + ' y=' + Math.round(y);
    }
    lastW = window.innerWidth; lastH = window.innerHeight; lastY = y;
    paint();
  }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { vvResizes++; paint(); });
  }
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        if (e.hadRecentInput) return;
        shifts++;
        cls += e.value;
      });
      paint();
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  window.addEventListener('scroll', function () {
    var y = window.scrollY, t = performance.now();
    var dy = y - lastY, dt = t - lastST;
    /* Ignore ordinary flick momentum. A teleport is a huge delta in a very short window. */
    if (Math.abs(dy) > 200 && dt < 24) {
      jumps++; jumpsFlick++; lastJump = sectionAt() + ' y=' + Math.round(y);
    }
    lastY = y; lastST = t;
    paint();
  }, { passive: true });
})();
