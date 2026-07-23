/* TrivoxIA — efeitos visuais (ports vanilla de Dia Text Reveal, Highlighter e Animated Beam do MagicUI) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     1. DIA TEXT REVEAL — faixa de gradiente varre o texto e
        assenta na cor padrão. Cores da marca (roxo/azul).
     ============================================================ */
  var DIA_COLORS = ['#4EC5F1', '#2F6BFF', '#6B2EE8', '#B14AFF'];
  var BAND_HALF = 17;
  var SWEEP_START = -BAND_HALF;
  var SWEEP_END = 100 + BAND_HALF;
  var INK = 'var(--ink)';

  function sweepEase(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function buildGradient(pos) {
    var bandStart = pos - BAND_HALF;
    var bandEnd = pos + BAND_HALF;
    if (bandStart >= 100) return 'linear-gradient(90deg, ' + INK + ', ' + INK + ')';
    var n = DIA_COLORS.length;
    var parts = [];
    if (bandStart > 0) {
      parts.push(INK + ' 0%', INK + ' ' + bandStart.toFixed(2) + '%');
    }
    DIA_COLORS.forEach(function (c, i) {
      var pct = n === 1 ? pos : bandStart + (i / (n - 1)) * BAND_HALF * 2;
      parts.push(c + ' ' + pct.toFixed(2) + '%');
    });
    if (bandEnd < 100) {
      parts.push('transparent ' + bandEnd.toFixed(2) + '%', 'transparent 100%');
    }
    return 'linear-gradient(90deg, ' + parts.join(', ') + ')';
  }

  function diaSetup(el) {
    el.style.color = 'transparent';
    el.style.backgroundClip = 'text';
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundSize = '100% 100%';
    el.style.backgroundImage = buildGradient(SWEEP_START);
  }

  function diaPlay(el, duration) {
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / (duration * 1000), 1);
      var pos = SWEEP_START + (SWEEP_END - SWEEP_START) * sweepEase(p);
      el.style.backgroundImage = buildGradient(pos);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('[data-dia]').forEach(function (el) {
    if (reduceMotion) return; // texto fica na cor normal, sem efeito
    diaSetup(el);
    if (el.hasAttribute('data-dia-autoplay')) {
      setTimeout(function () { diaPlay(el, 1.5); }, 300);
    } else {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            diaPlay(el, 1.5);
            obs.disconnect();
          }
        });
      }, { threshold: 0.3 });
      obs.observe(el);
    }
  });

  /* ============================================================
     2. HIGHLIGHTER — traço de marca-texto/sublinhado com jeito
        de desenho à mão (inspirado em rough-notation).
     ============================================================ */
  function jitter(seedRef, amp) {
    seedRef.v = (seedRef.v * 9301 + 49297) % 233280;
    return (seedRef.v / 233280 - 0.5) * 2 * amp;
  }

  function roughLine(x1, y1, x2, y2, seedRef, amp) {
    var segs = 4;
    var d = 'M ' + x1.toFixed(1) + ' ' + (y1 + jitter(seedRef, amp)).toFixed(1);
    for (var i = 1; i <= segs; i++) {
      var t = i / segs;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t + (i === segs ? jitter(seedRef, amp * 0.6) : jitter(seedRef, amp));
      d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function annotateMarker(el, animateIn) {
    // svg ancorado no bloco pai (h2/p) — inline quebrado em várias linhas
    // não serve de referência para posicionamento absoluto
    var host = el.closest('h2, h3, p') || el.parentElement;
    var old = host.querySelector('.mk-svg[data-for="' + el.dataset.marker + '"]');
    if (old) old.remove();
    host.classList.add('mk-host');

    var action = el.getAttribute('data-marker') || 'highlight';
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'mk-svg');
    svg.setAttribute('data-for', el.dataset.marker);
    svg.setAttribute('aria-hidden', 'true');
    host.insertBefore(svg, host.firstChild);

    var hostRect = host.getBoundingClientRect();
    var rects = el.getClientRects();
    var seedRef = { v: 42 };
    var paths = [];
    var delayBase = 0;

    for (var r = 0; r < rects.length; r++) {
      var rect = rects[r];
      var x1 = rect.left - hostRect.left;
      var x2 = rect.right - hostRect.left;
      var iterations = 2;
      for (var it = 0; it < iterations; it++) {
        var path = document.createElementNS(svgNS, 'path');
        var d, sw, color, op;
        if (action === 'underline') {
          var yU = rect.bottom - hostRect.top - 3 + it * 1.4;
          d = roughLine(it % 2 ? x2 : x1, yU, it % 2 ? x1 : x2, yU, seedRef, 1.6);
          sw = 2.5; color = '#6B2EE8'; op = '0.9';
        } else {
          var yH = rect.top - hostRect.top + rect.height / 2 + jitter(seedRef, 1.5);
          d = roughLine(it % 2 ? x2 : x1, yH, it % 2 ? x1 : x2, yH, seedRef, 2.2);
          sw = rect.height * 0.82; color = '#DCC8FF'; op = '0.55';
        }
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', sw);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-opacity', op);
        svg.appendChild(path);
        paths.push({ path: path, delay: delayBase });
        delayBase += 280;
      }
    }

    paths.forEach(function (p) {
      if (reduceMotion || !animateIn) return;
      var len = p.path.getTotalLength();
      p.path.style.strokeDasharray = len + ' ' + len;
      p.path.style.strokeDashoffset = len;
      p.path.style.transition = 'stroke-dashoffset 350ms ease-out ' + p.delay + 'ms';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { p.path.style.strokeDashoffset = '0'; });
      });
    });
  }

  var markersDrawn = [];
  document.querySelectorAll('.mk[data-marker]').forEach(function (el) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          annotateMarker(el, true);
          markersDrawn.push(el);
          obs.disconnect();
        }
      });
    }, { threshold: 0.6 });
    obs.observe(el);
  });

  var mkResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(mkResizeTimer);
    mkResizeTimer = setTimeout(function () {
      markersDrawn.forEach(function (el) { annotateMarker(el, false); });
    }, 150);
  });

  /* ============================================================
     3. ANIMATED BEAM — feixes de luz WhatsApp/Instagram →
        Funcionário de IA → Agenda/CRM/Financeiro.
     ============================================================ */
  var integ = document.getElementById('integ');
  if (!integ) return;

  var svgNS2 = 'http://www.w3.org/2000/svg';
  var isvg = integ.querySelector('.integ-svg');
  var nodes = {
    wa: integ.querySelector('.dot-wa'),
    ig: integ.querySelector('.dot-ig'),
    core: integ.querySelector('.dot-core'),
    out: integ.querySelectorAll('.integ-out .integ-dot')
  };

  var beamDefs = [
    { from: 'wa', to: 'core', curve: -0.18, delay: 0 },
    { from: 'ig', to: 'core', curve: 0.18, delay: 1.1 },
    { from: 'core', to: 'out0', curve: -0.22, delay: 0.5 },
    { from: 'core', to: 'out1', curve: 0, delay: 1.6 },
    { from: 'core', to: 'out2', curve: 0.22, delay: 2.4 }
  ];
  var beams = [];

  function nodeEl(key) {
    if (key.indexOf('out') === 0) return nodes.out[parseInt(key.slice(3), 10)];
    return nodes[key];
  }

  function center(el, box) {
    var r = el.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  }

  function buildBeams() {
    isvg.innerHTML = '';
    beams = [];
    var box = integ.getBoundingClientRect();
    isvg.setAttribute('width', box.width);
    isvg.setAttribute('height', box.height);
    isvg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);

    beamDefs.forEach(function (def, i) {
      var a = center(nodeEl(def.from), box);
      var b = center(nodeEl(def.to), box);
      // ponto de controle deslocado na perpendicular do trajeto
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx + (-dy / dist) * dist * def.curve;
      var cy = my + (dx / dist) * dist * def.curve;
      var d = 'M ' + a.x + ',' + a.y + ' Q ' + cx + ',' + cy + ' ' + b.x + ',' + b.y;

      var base = document.createElementNS(svgNS2, 'path');
      base.setAttribute('d', d);
      base.setAttribute('fill', 'none');
      base.setAttribute('stroke', '#B7B3AB');
      base.setAttribute('stroke-width', '1.5');
      base.setAttribute('stroke-opacity', '0.35');
      base.setAttribute('stroke-linecap', 'round');
      isvg.appendChild(base);

      var gradId = 'beam-g-' + i;
      var defs = document.createElementNS(svgNS2, 'defs');
      var grad = document.createElementNS(svgNS2, 'linearGradient');
      grad.setAttribute('id', gradId);
      grad.setAttribute('x1', a.x); grad.setAttribute('y1', a.y);
      grad.setAttribute('x2', b.x); grad.setAttribute('y2', b.y);
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      [['0%', '#4EC5F1', '0'], ['25%', '#4EC5F1', '1'], ['65%', '#6B2EE8', '1'], ['100%', '#B14AFF', '0']].forEach(function (s) {
        var stop = document.createElementNS(svgNS2, 'stop');
        stop.setAttribute('offset', s[0]);
        stop.setAttribute('stop-color', s[1]);
        stop.setAttribute('stop-opacity', s[2]);
        grad.appendChild(stop);
      });
      defs.appendChild(grad);
      isvg.appendChild(defs);

      var glow = document.createElementNS(svgNS2, 'path');
      glow.setAttribute('d', d);
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', 'url(#' + gradId + ')');
      glow.setAttribute('stroke-width', '2.5');
      glow.setAttribute('stroke-linecap', 'round');
      isvg.appendChild(glow);

      var len = glow.getTotalLength();
      var seg = len * 0.35;
      if (reduceMotion) {
        glow.setAttribute('stroke-opacity', '0.6');
      } else {
        glow.style.strokeDasharray = seg + ' ' + len;
        glow.style.strokeDashoffset = seg;
      }
      beams.push({ el: glow, len: len, seg: seg, delay: def.delay });
    });
  }

  var DURATION = 3.2;
  var REPEAT_DELAY = 0.6;
  var CYCLE = DURATION + REPEAT_DELAY;

  function animateBeams(ts) {
    var t = ts / 1000;
    beams.forEach(function (b) {
      var local = (t - b.delay) % CYCLE;
      if (local < 0) { b.el.style.strokeDashoffset = b.seg; return; }
      var p = Math.min(local / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      b.el.style.strokeDashoffset = b.seg - (b.seg + b.len) * eased;
    });
    requestAnimationFrame(animateBeams);
  }

  buildBeams();
  if (!reduceMotion) requestAnimationFrame(animateBeams);

  var ro = new ResizeObserver(function () { buildBeams(); });
  ro.observe(integ);
})();
