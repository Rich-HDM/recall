/* Recall maps: projects lon/lat GeoJSON-like rings to SVG, with pan, pinch and wheel zoom. */
window.RecallMaps = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FILLS = ['#FFE3C2', '#D4F0DC', '#E6DCFF', '#FFF0BF', '#FBE2F0', '#EADFD3', '#E2EBD0'];

  /* ---------- projections (return [x, y] in abstract units, y down) ---------- */
  const D2R = Math.PI / 180;

  function mercator(lon, lat) {
    const la = Math.max(-85, Math.min(85, lat)) * D2R;
    return [lon * D2R, -Math.log(Math.tan(Math.PI / 4 + la / 2))];
  }

  function equalEarth(lon, lat) {
    const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    const l = lon * D2R, p = lat * D2R;
    const t = Math.asin(M * Math.sin(p));
    const t2 = t * t, t6 = t2 * t2 * t2;
    const x = l * Math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
    const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
    return [x, -y];
  }

  /* ---------- geometry helpers ---------- */
  function ringArea(r) { // shoelace on projected coords (absolute)
    let a = 0;
    for (let i = 0, n = r.length; i < n; i++) {
      const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }
  function ringCentroid(r) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = r.length; i < n; i++) {
      const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n];
      const f = x1 * y2 - x2 * y1;
      a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    }
    if (Math.abs(a) < 1e-12) return r[0];
    return [cx / (3 * a), cy / (3 * a)];
  }
  function bboxOf(rings) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rings.forEach(r => r.forEach(([x, y]) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }));
    return [x0, y0, x1, y1];
  }
  function overlaps(a, b, pad) {
    return !(a[2] + pad < b[0] || b[2] + pad < a[0] || a[3] + pad < b[1] || b[3] + pad < a[1]);
  }
  function pathOf(rings) {
    let d = '';
    for (const r of rings) {
      for (let i = 0; i < r.length; i++) d += (i ? 'L' : 'M') + r[i][0].toFixed(2) + ' ' + r[i][1].toFixed(2);
      d += 'Z';
    }
    return d;
  }
  // Long names wrap on to two lines, which keeps labels compact on a phone.
  function label(parent, x, y, text, cls) {
    const t = el('text', { x: x.toFixed(1), y: y.toFixed(1), class: cls }, parent);
    const words = text.split(' ');
    if (text.length > 11 && words.length > 1) {
      let best = 1, bestDiff = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' ').length, b = words.slice(i).join(' ').length;
        if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
      }
      const l1 = el('tspan', { x: x.toFixed(1), dy: '-0.55em' }, t); l1.textContent = words.slice(0, best).join(' ');
      const l2 = el('tspan', { x: x.toFixed(1), dy: '1.1em' }, t); l2.textContent = words.slice(best).join(' ');
    } else {
      t.textContent = text;
    }
    return t;
  }
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Greedy colouring so neighbouring areas differ. Adjacency is approximated by bbox overlap.
  function colourise(features) {
    const order = features.map((f, i) => i).sort((a, b) => features[b].area - features[a].area);
    const colour = new Array(features.length);
    for (const i of order) {
      const used = new Set();
      for (const j of order) {
        if (j === i || colour[j] === undefined) continue;
        if (overlaps(features[i].bbox, features[j].bbox, 0.5)) used.add(colour[j]);
      }
      let c = 0; while (used.has(c) && c < FILLS.length - 1) c++;
      if (used.has(c)) c = i % FILLS.length;
      colour[i] = c;
    }
    return colour;
  }

  /* ---------- main ---------- */
  function mount(container, kind, data) {
    const isUK = kind === 'uk';
    const project = isUK ? mercator : equalEarth;
    const W = container.clientWidth || 390, H = container.clientHeight || 600;

    // Collect projected features.
    const areas = (isUK ? data.counties : data.countries).map(f => {
      const rings = f.rings.map(r => r.map(([lon, lat]) => project(lon, lat)));
      let best = rings[0], bestA = -1;
      rings.forEach(r => { const a = ringArea(r); if (a > bestA) { bestA = a; best = r; } });
      const total = rings.reduce((s, r) => s + ringArea(r), 0);
      const label = f.label ? project(f.label[0], f.label[1]) : ringCentroid(best);
      return { name: f.name, rings, area: total, bbox: bboxOf(rings), label };
    });

    // Fit everything to the viewport (world: fit to all countries; UK: to all counties).
    const all = bboxOf(areas.map(a => [[a.bbox[0], a.bbox[1]], [a.bbox[2], a.bbox[3]]]));
    const pad = 12;
    const scale = Math.min((W - 2 * pad) / (all[2] - all[0]), (H - 2 * pad) / (all[3] - all[1]));
    const toScreen = ([x, y]) => [(x - all[0]) * scale + (W - (all[2] - all[0]) * scale) / 2, (y - all[1]) * scale + (H - (all[3] - all[1]) * scale) / 2];
    areas.forEach(a => {
      a.rings = a.rings.map(r => r.map(toScreen));
      a.bbox = bboxOf(a.rings);
      a.label = toScreen(a.label);
      a.area = a.rings.reduce((s, r) => s + ringArea(r), 0);
    });
    const colours = colourise(areas);

    // Label tiers by area rank (largest areas show first).
    const sortedAreas = areas.map(a => a.area).sort((x, y) => y - x);
    const q = p => sortedAreas[Math.min(sortedAreas.length - 1, Math.floor(sortedAreas.length * p))] || 0;
    const tierOf = isUK
      ? a => (a >= q(0.2) ? 1 : a >= q(0.45) ? 2 : a >= q(0.75) ? 3 : 4)
      : a => (a >= q(0.07) ? 1 : a >= q(0.2) ? 2 : a >= q(0.5) ? 3 : 4);

    // Build SVG.
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'data-z': '0', role: 'img', 'aria-label': isUK ? 'Map of British counties' : 'Political map of the world' }, container);
    svg.style.setProperty('--k', '1');
    const view = el('g', { class: 'view' }, svg);

    const gLand = el('g', { class: 'land' }, view);
    const gLakes = el('g', { class: 'lakes hidden-layer' }, view);
    const gRivers = el('g', { class: 'rivers hidden-layer' }, view);
    const gLabels = el('g', { class: 'labels' }, view);
    const gWater = el('g', { class: 'waterlabels hidden-layer' }, view);
    const gRiverLabels = el('g', { class: 'riverlabels hidden-layer' }, view);
    const gPlaces = el('g', { class: 'places hidden-layer' }, view);

    areas.forEach((a, i) => {
      el('path', { d: pathOf(a.rings), fill: FILLS[colours[i]] }, gLand).appendChild(document.createElementNS(NS, 'title')).textContent = a.name;
      label(gLabels, a.label[0], a.label[1], a.name, 't' + tierOf(a.area));
    });

    const layers = {};
    const dots = []; // circles whose radius must stay constant on screen
    const offsetTexts = []; // [text, x, y, dx] labels kept a fixed screen distance from their dot

    if (isUK) {
      layers.rivers = [gRivers, gRiverLabels];
      (data.rivers || []).forEach(rv => {
        let longest = null;
        rv.coords.forEach(line => {
          const pts = line.map(([lon, lat]) => toScreen(project(lon, lat)));
          let d = '';
          pts.forEach((p, i) => { d += (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); });
          el('path', { d }, gRivers);
          if (!longest || pts.length > longest.length) longest = pts;
        });
        if (longest && longest.length > 1) {
          const m = longest[Math.floor(longest.length / 2)];
          const t = el('text', { x: m[0].toFixed(1), y: (m[1] - 4).toFixed(1), class: 't2' }, gRiverLabels);
          t.textContent = rv.name;
        }
      });

      layers.places = [gPlaces];
      (data.places || []).forEach(p => {
        const [x, y] = toScreen(project(p.lon, p.lat));
        const g = el('g', { class: 't' + Math.min(3, Math.max(1, p.rank || 3)) + (p.rank === 1 ? ' cap' : '') }, gPlaces);
        const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3 }, g);
        dots.push([c, p.rank === 1 ? 3.5 : 2.6]);
        const t = el('text', { x: (x + 5).toFixed(1), y: y.toFixed(1) }, g);
        t.textContent = p.name;
        offsetTexts.push([t, x, 6]);
      });
    } else {
      layers.lakes = [gLakes];
      (data.lakes || []).forEach(l => {
        const rings = l.rings.map(r => r.map(([lon, lat]) => toScreen(project(lon, lat))));
        el('path', { d: pathOf(rings) }, gLakes);
        const c = ringCentroid(rings[0]);
        const t = el('text', { x: c[0].toFixed(1), y: c[1].toFixed(1), class: 't3' }, gWater);
        t.textContent = l.name;
      });

      layers.water = [gWater];
      (data.water || []).forEach(w => {
        const [x, y] = toScreen(project(w.lon, w.lat));
        const t = el('text', { x: x.toFixed(1), y: y.toFixed(1), class: 't' + Math.min(3, Math.max(1, w.rank || 3)) }, gWater);
        t.textContent = w.name;
      });

      layers.capitals = [gPlaces];
      const tierByCountry = {};
      areas.forEach(a => { tierByCountry[a.name] = tierOf(a.area); });
      (data.capitals || []).forEach(p => {
        const [x, y] = toScreen(project(p.lon, p.lat));
        const tier = tierByCountry[p.country] || 4;
        const g = el('g', { class: 'cap' }, gPlaces);
        const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.5, class: 't' + Math.min(tier, 3) }, g);
        dots.push([c, 2.6]);
        const t = el('text', { x: (x + 4).toFixed(1), y: y.toFixed(1), class: 't' + Math.min(4, tier + 1) }, g);
        t.textContent = p.name;
        offsetTexts.push([t, x, 5]);
      });
    }

    /* ---------- pan & zoom ---------- */
    const minK = 1, maxK = isUK ? 14 : 24;
    let k = 1, tx = 0, ty = 0;
    let frame = null;

    function zBucket() { return k < 1.9 ? 0 : k < 3.6 ? 1 : k < 7 ? 2 : 3; }
    function apply() {
      frame = null;
      view.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})`);
      svg.style.setProperty('--k', k.toFixed(4));
      const z = String(zBucket());
      if (svg.getAttribute('data-z') !== z) svg.setAttribute('data-z', z);
      const r = 1 / k;
      dots.forEach(([c, base]) => c.setAttribute('r', (base * r).toFixed(2)));
      offsetTexts.forEach(([t, x, dx]) => t.setAttribute('x', (x + dx * r).toFixed(2)));
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(apply); }
    function clamp() {
      k = Math.max(minK, Math.min(maxK, k));
      // keep the map from being dragged completely off screen
      const minTx = W - W * k - W * 0.4, maxTx = W * 0.4;
      const minTy = H - H * k - H * 0.4, maxTy = H * 0.4;
      tx = Math.max(minTx, Math.min(maxTx, tx));
      ty = Math.max(minTy, Math.min(maxTy, ty));
    }
    function zoomAt(px, py, factor) {
      const k2 = Math.max(minK, Math.min(maxK, k * factor));
      const wx = (px - tx) / k, wy = (py - ty) / k;
      k = k2; tx = px - wx * k; ty = py - wy * k;
      clamp(); schedule();
    }
    function local(e) {
      const r = svg.getBoundingClientRect();
      return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
    }

    const pointers = new Map();
    let pinch = null, lastTap = 0, moved = false;

    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]), k0: k, wx: ((a[0] + b[0]) / 2 - tx) / k, wy: ((a[1] + b[1]) / 2 - ty) / k };
      }
      e.preventDefault();
    });
    svg.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      const cur = local(e);
      pointers.set(e.pointerId, cur);
      if (pointers.size === 1) {
        const dx = cur[0] - prev[0], dy = cur[1] - prev[1];
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        tx += dx; ty += dy; clamp(); schedule();
      } else if (pointers.size === 2 && pinch) {
        moved = true;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        k = Math.max(minK, Math.min(maxK, pinch.k0 * d / pinch.d0));
        tx = mx - pinch.wx * k; ty = my - pinch.wy * k;
        clamp(); schedule();
      }
    });
    function up(e) {
      if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) { // re-anchor remaining pointer
        const id = [...pointers.keys()][0];
        pointers.set(id, pointers.get(id));
      }
      if (pointers.size === 0 && !moved && e.type === 'pointerup') {
        const now = Date.now();
        if (now - lastTap < 320) { const [x, y] = local(e); zoomAt(x, y, 2); lastTap = 0; }
        else lastTap = now;
      }
    }
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const [x, y] = local(e);
      zoomAt(x, y, Math.exp(-e.deltaY * 0.0022));
    }, { passive: false });

    apply();

    return {
      setLayer(name, on) {
        (layers[name] || []).forEach(g => g.classList.toggle('hidden-layer', !on));
      },
      reset() { k = 1; tx = 0; ty = 0; schedule(); }
    };
  }

  return { mount };
})();
