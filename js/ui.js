// ui.js — pure DOM layer: sheets, cards, bays, overlays, toasts. No three.js here.
import { ITEMS } from './items.js';

const $ = (id) => document.getElementById(id);
const LOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

function itemCard(id, remaining, { done, selected }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'item-card' + (done ? ' done' : '') + (selected ? ' selected' : '');
  b.disabled = done;
  b.dataset.item = id;
  const total = remaining.total;
  b.innerHTML =
    (total > 1 ? `<span class="count">${remaining.left}</span>` : '') +
    ITEMS[id].icon +
    `<span class="nm">${ITEMS[id].name}</span><span class="wt">${ITEMS[id].weight}</span>`;
  return b;
}

export function createUI(cb) {
  const els = {
    itemRow: $('item-row'), bayGrid: $('bay-grid'), loadCount: $('load-count'),
    btnAuto: $('btn-auto'), btnUndo: $('btn-undo'), btnGo: $('btn-go'), goHint: $('go-hint'),
    drivePct: $('drive-pct'), driveBar: $('drive-bar'), btnDrive: $('btn-drive'),
    deliverRow: $('deliver-row'), deliverCount: $('deliver-count'), btnUnloadAll: $('btn-unload-all'),
    steps: [...document.querySelectorAll('.step')],
    ocIndex: $('oc-index'), ocName: $('oc-name'), ocSub: $('oc-sub'),
    headlineSub: $('headline-sub'), metaPlace: $('meta-place'),
    ovResult: $('ov-result'), ovRoutes: $('ov-routes'), ovHelp: $('ov-help'),
    rTitle: $('r-title'), rStars: [...$('r-stars').children], rLine: $('r-line'),
    rItems: $('r-items'), rTime: $('r-time'), rBest: $('r-best'),
    btnNext: $('btn-next'), routesList: $('routes-list'),
    toast: $('toast'), btnSound: $('btn-sound'),
  };

  let toastTimer = 0, starTimers = [];

  /* ---- static wiring ---- */
  els.btnAuto.addEventListener('click', () => cb.onAuto());
  els.btnUndo.addEventListener('click', () => cb.onUndo());
  els.btnGo.addEventListener('click', () => cb.onGo());
  els.btnUnloadAll.addEventListener('click', () => cb.onUnloadAll());
  els.btnNext.addEventListener('click', () => cb.onNext());
  $('btn-replay').addEventListener('click', () => cb.onReplay());
  $('btn-routes2').addEventListener('click', () => cb.onShowRoutes());
  $('btn-routes').addEventListener('click', () => cb.onShowRoutes());
  $('btn-help').addEventListener('click', () => cb.onHelp());
  els.btnSound.addEventListener('click', () => cb.onToggleSound());
  for (const b of document.querySelectorAll('[data-close]'))
    b.addEventListener('click', () => api.closeOverlay(b.dataset.close));

  /* hold-to-drive */
  let holding = false;
  const endDrive = () => {
    if (!holding) return;
    holding = false;
    els.btnDrive.classList.remove('holding');
    cb.onDriveEnd();
  };
  els.btnDrive.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (holding) return;
    holding = true;
    try { els.btnDrive.setPointerCapture(e.pointerId); } catch {}
    els.btnDrive.classList.add('holding');
    cb.onDriveStart();
  });
  els.btnDrive.addEventListener('pointerup', endDrive);
  els.btnDrive.addEventListener('pointercancel', endDrive);
  els.btnDrive.addEventListener('lostpointercapture', endDrive);

  const api = {
    /* ---- order framing ---- */
    setOrder(order, index, total) {
      els.ocIndex.textContent = `ORDER ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      els.ocName.textContent = order.name;
      const n = order.items.reduce((s, [, c]) => s + c, 0);
      els.ocSub.textContent = `${order.customer} · ${n} items`;
      els.headlineSub.textContent = order.blurb;
      els.metaPlace.textContent = order.place;
    },

    /* ---- phases ---- */
    setPhase(phase) {
      for (const p of ['load', 'drive', 'deliver'])
        $('phase-' + p).classList.toggle('hidden', p !== phase);
      const order = ['load', 'drive', 'deliver'];
      const at = order.indexOf(phase);
      els.steps.forEach((s) => {
        const i = order.indexOf(s.dataset.step);
        s.classList.toggle('active', i === at);
        s.classList.toggle('done', i < at);
      });
      endDrive();
      cb.onPhaseShown();
    },

    /* ---- LOAD ---- */
    renderLoadList(itemsState, selectedId) {
      els.itemRow.replaceChildren();
      for (const st of itemsState) {
        const left = st.count - st.placed;
        const card = itemCard(st.id, { left, total: st.count }, { done: left === 0, selected: st.id === selectedId });
        card.addEventListener('click', () => cb.onSelectItem(st.id));
        els.itemRow.appendChild(card);
      }
    },
    renderBays(bays) {
      els.bayGrid.replaceChildren();
      bays.forEach((full, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bay ' + (full ? 'full' : 'free');
        b.textContent = i + 1;
        b.addEventListener('click', () => cb.onBay(i));
        els.bayGrid.appendChild(b);
      });
    },
    flashBay(i) {
      const b = els.bayGrid.children[i];
      if (!b) return;
      b.classList.remove('flash');
      void b.offsetWidth;
      b.classList.add('flash');
    },
    updateLoad(loaded, total) {
      els.loadCount.textContent = `${loaded} / ${total}`;
      els.btnGo.disabled = loaded < total;
      els.goHint.textContent = loaded < total ? `${total - loaded} item${total - loaded > 1 ? 's' : ''} to load` : 'All aboard!';
      els.btnUndo.disabled = loaded === 0;
      els.btnAuto.disabled = loaded === total;
    },

    /* ---- DRIVE ---- */
    setDrive(pct) {
      const p = Math.min(100, Math.round(pct));
      els.drivePct.textContent = p + '%';
      els.driveBar.style.width = p + '%';
    },

    /* ---- DELIVER ---- */
    renderDeliverList(itemsState) {
      els.deliverRow.replaceChildren();
      for (const st of itemsState) {
        const left = st.placed - st.delivered;
        const card = itemCard(st.id, { left, total: Math.max(st.count, 1) }, { done: left === 0, selected: false });
        if (st.placed > 0) {
          card.addEventListener('click', () => cb.onDeliver(st.id));
          els.deliverRow.appendChild(card);
        }
      }
    },
    updateDeliver(done, total) {
      els.deliverCount.textContent = `${done} / ${total}`;
      els.btnUnloadAll.disabled = done === total;
    },

    /* ---- result ---- */
    showResult(order, stars, time, best, isLast) {
      els.rTitle.textContent = order.name;
      els.rLine.textContent = order.thanks;
      els.rItems.textContent = order.items.reduce((s, [, c]) => s + c, 0);
      els.rTime.textContent = time;
      els.rBest.textContent = best;
      els.btnNext.querySelector('.go-text').textContent = isLast ? 'All routes' : 'Next order';
      for (const s of els.rStars) s.classList.remove('lit');
      api.openOverlay('ov-result');
      starTimers.forEach(clearTimeout);
      starTimers = [];
      for (let i = 0; i < stars; i++)
        starTimers.push(setTimeout(() => {
          els.rStars[i].classList.add('lit');
          cb.onStar(i);
        }, 450 + i * 380));
    },
    hideResult() {
      starTimers.forEach(clearTimeout);
      starTimers = [];
      api.closeOverlay('ov-result');
    },

    /* ---- routes ---- */
    renderRoutes(orders, save, currentIndex) {
      els.routesList.replaceChildren();
      orders.forEach((o, i) => {
        const locked = i + 1 > save.unlocked;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'route-row' + (i === currentIndex ? ' current' : '');
        row.disabled = locked;
        const got = save.stars[o.id] || 0;
        const stars = locked ? LOCK :
          [0, 1, 2].map((k) => `<span class="${k < got ? '' : 'off'}">★</span>`).join('');
        row.innerHTML =
          `<span class="num">${String(i + 1).padStart(2, '0')}</span>` +
          `<span class="info"><b>${o.name}</b><span>${o.customer} · ${o.place.toLowerCase()}</span></span>` +
          `<span class="r-stars">${stars}</span>`;
        if (!locked) row.addEventListener('click', () => cb.onPickRoute(i));
        els.routesList.appendChild(row);
      });
    },

    /* ---- overlays / toast / sound ---- */
    openOverlay(id) { $(id).classList.remove('hidden'); },
    closeOverlay(id) { $(id).classList.add('hidden'); },
    closeOverlays() { for (const id of ['ov-result', 'ov-routes', 'ov-help']) api.closeOverlay(id); },
    toast(msg) {
      clearTimeout(toastTimer);
      els.toast.textContent = msg;
      els.toast.classList.remove('hidden');
      toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 1600);
    },
    setSound(muted) { els.btnSound.classList.toggle('muted', muted); },
  };
  return api;
}
