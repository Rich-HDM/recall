/* Recall – a small read-only reference app. No build step, no dependencies. */
(function () {
  'use strict';

  const ICONS = {
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 18h18M4 18 3 8l5 4 4-7 4 7 5-4-1 10"/></svg>',
    parliament: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V9h14v12M9 21v-6h6v6M12 3l7 6H5l7-6zM12 9v3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8L12 3z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    planet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M4.5 9.5c-2.4 2.6-2.4 4.6-1.4 5.6 1.8 1.8 8.1-.6 14-6.5S25 1.3 23.2 3.1c-1 1-3.2 1-5.7-.4"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 6 5 6 5 10s-5 4-5 10M17 2c0 6-5 6-5 10s5 4 5 10"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>'
  };

  const app = document.getElementById('app');
  const cache = {};
  let collections = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadJSON(path) {
    if (cache[path]) return cache[path];
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load ' + path);
    const data = await res.json();
    cache[path] = data;
    return data;
  }

  function tone(c) { return 'tone-' + (c || 'grey'); }

  /* ---------------- Home ---------------- */
  function renderHome() {
    document.title = 'Recall';
    const tiles = collections.map(c => `
      <a class="tile ${tone(c.colour)}" href="#/${c.type}/${c.id}" aria-label="${esc(c.title)}">
        <div class="icon">${ICONS[c.icon] || ICONS.star}</div>
        <div class="label">${esc(c.title)}</div>
      </a>`).join('');
    app.innerHTML = `
      <div class="page">
        <div class="home-head">
          <div>
            <h1>Recall</h1>
            <div class="sub">${collections.length} collections</div>
          </div>
        </div>
        <div class="grid">${tiles}</div>
        <div class="home-foot">Tap a collection to open it.</div>
      </div>`;
    window.scrollTo(0, 0);
  }

  /* ---------------- Lists ---------------- */
  function openKey(id) { return 'recall-open-' + id; }
  function getOpen(id) {
    try { return new Set(JSON.parse(sessionStorage.getItem(openKey(id)) || '[]')); } catch (e) { return new Set(); }
  }
  function saveOpen(id, set) {
    try { sessionStorage.setItem(openKey(id), JSON.stringify([...set])); } catch (e) { /* ignore */ }
  }

  function renderList(col, data) {
    document.title = col.title + ' · Recall';
    const open = getOpen(col.id);
    let n = 0;
    const chips = data.groups.map((g, gi) =>
      `<button class="chip ${tone(g.colour)}" data-go="g${gi}"><span class="dot"></span>${esc(g.name)}</button>`).join('');

    const groups = data.groups.map((g, gi) => {
      const items = g.items.map(it => {
        const key = col.id + ':' + n++;
        const isOpen = open.has(key);
        const facts = (it.facts || []).map(f => `<li>${esc(f)}</li>`).join('');
        return `
          <div class="item ${isOpen ? 'open' : ''}" data-key="${key}">
            <button class="row" aria-expanded="${isOpen}">
              <span class="name">${esc(it.name)}</span>
              ${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}
              <span class="dates">${esc(it.dates || '')}</span>
              <span class="chev">${ICONS.chevron}</span>
            </button>
            <ul class="facts">${facts || '<li class="note">No notes yet.</li>'}</ul>
          </div>`;
      }).join('');
      return `
        <section class="group ${tone(g.colour)}">
          <div class="group-head" id="g${gi}">
            <div class="name"><span class="dot"></span>${esc(g.name)}</div>
            <div class="dates">${esc(g.dates || '')}</div>
          </div>
          <div class="card">${items}</div>
        </section>`;
    }).join('');

    app.innerHTML = `
      <div class="page ${tone(col.colour)}">
        <a class="back" href="#/">${ICONS.back}Home</a>
        <div class="head">
          <div>
            <h1>${esc(col.title)}</h1>
            <div class="sub">${esc(col.subtitle || '')}</div>
          </div>
          <div class="badge">${ICONS[col.icon] || ''}</div>
        </div>
        <div class="toolbar">
          <div class="chips">${chips}</div>
          <div class="tools"><button type="button" data-toggle-all>Expand all</button></div>
        </div>
        ${groups}
      </div>`;

    const page = app.firstElementChild;
    page.addEventListener('click', e => {
      const chip = e.target.closest('[data-go]');
      if (chip) {
        const target = document.getElementById(chip.dataset.go);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const row = e.target.closest('.row');
      if (row) {
        const item = row.parentElement;
        const nowOpen = !item.classList.contains('open');
        item.classList.toggle('open', nowOpen);
        row.setAttribute('aria-expanded', nowOpen);
        const set = getOpen(col.id);
        if (nowOpen) set.add(item.dataset.key); else set.delete(item.dataset.key);
        saveOpen(col.id, set);
        updateToggleAll();
        return;
      }
      const all = e.target.closest('[data-toggle-all]');
      if (all) {
        const items = page.querySelectorAll('.item');
        const anyClosed = [...items].some(i => !i.classList.contains('open'));
        const set = new Set();
        items.forEach(i => {
          i.classList.toggle('open', anyClosed);
          i.querySelector('.row').setAttribute('aria-expanded', anyClosed);
          if (anyClosed) set.add(i.dataset.key);
        });
        saveOpen(col.id, set);
        updateToggleAll();
      }
    });

    function updateToggleAll() {
      const items = page.querySelectorAll('.item');
      const anyClosed = [...items].some(i => !i.classList.contains('open'));
      page.querySelector('[data-toggle-all]').textContent = anyClosed ? 'Expand all' : 'Collapse all';
    }
    updateToggleAll();

    // Highlight the chip of the group currently in view.
    const heads = [...page.querySelectorAll('.group-head')];
    const chipEls = [...page.querySelectorAll('.chip')];
    function syncChips() {
      let current = 0;
      const line = 130;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) current = i; });
      chipEls.forEach((c, i) => c.classList.toggle('on', i === current));
      const on = chipEls[current];
      if (on) {
        const box = on.parentElement;
        const left = on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2;
        box.scrollTo({ left, behavior: 'smooth' });
      }
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { syncChips(); ticking = false; }); }
    }, { passive: true });
    syncChips();
    window.scrollTo(0, 0);
  }

  /* ---------------- Maps ---------------- */
  function renderMap(col) {
    document.title = col.title + ' · Recall';
    const layers = col.id === 'uk'
      ? [['places', 'Towns & cities'], ['rivers', 'Rivers']]
      : [['capitals', 'Capitals'], ['water', 'Seas & oceans'], ['lakes', 'Lakes']];
    const checks = layers.map(([k, label]) => `
      <label class="check"><input type="checkbox" data-layer="${k}">${label}</label>`).join('');

    app.innerHTML = `
      <div class="map-page ${tone(col.colour)}">
        <div class="map-top">
          <a class="back" href="#/" aria-label="Home">${ICONS.back}</a>
          <h1>${esc(col.title)}</h1>
          <button type="button" class="reset" data-reset>Reset view</button>
        </div>
        <div class="map-wrap"><div class="map-loading">Loading map…</div></div>
        <div class="map-foot">${checks}<div class="credit">${col.id === 'uk'
          ? 'Boundaries: ONS (OGL v3), Natural Earth. Rivers: © OpenStreetMap contributors (ODbL), Natural Earth.'
          : 'Map data: Natural Earth (public domain).'}</div></div>
      </div>`;

    const wrap = app.querySelector('.map-wrap');
    loadJSON('data/maps/' + col.id + '.json').then(data => {
      wrap.innerHTML = '';
      const map = window.RecallMaps.mount(wrap, col.id, data);
      app.querySelectorAll('[data-layer]').forEach(input => {
        input.addEventListener('change', () => {
          input.parentElement.classList.toggle('on', input.checked);
          map.setLayer(input.dataset.layer, input.checked);
        });
      });
      app.querySelector('[data-reset]').addEventListener('click', () => map.reset());
    }).catch(err => {
      wrap.innerHTML = `<div class="map-loading">Sorry, the map could not be loaded.<br>${esc(err.message)}</div>`;
    });
  }

  /* ---------------- Router ---------------- */
  async function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean); // e.g. ['list', 'monarchs']
    try {
      if (!collections) collections = await loadJSON('data/collections.json');
      if (parts.length === 0) return renderHome();
      const col = collections.find(c => c.id === parts[1]);
      if (!col) return renderHome();
      if (col.type === 'map') return renderMap(col);
      const data = await loadJSON('data/' + col.id + '.json');
      return renderList(col, data);
    } catch (err) {
      app.innerHTML = `<div class="page"><a class="back" href="#/">${ICONS.back}Home</a><div class="empty">Something went wrong.<br>${esc(err.message)}</div></div>`;
    }
  }

  window.addEventListener('hashchange', route);
  route();

  // Maps are sized to the screen when built, so rebuild them if the screen changes shape.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!app.querySelector('.map-page')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(route, 250);
  });

  /* ---------------- Offline support ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });
    });
  }
})();
