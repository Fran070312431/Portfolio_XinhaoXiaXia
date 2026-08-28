/* ═══════════════════════════════════════════════════════
   EXTRA.JS — Página de contenido extra
   Edita EXTRA_CATEGORIES para añadir tu contenido real
═══════════════════════════════════════════════════════ */

/* ▼▼▼ EDITA AQUÍ ▼▼▼ */
const EXTRA_CATEGORIES = [
  {
    id: 'modelado',
    label: 'Modelado 3D',
    icon: 'fa-cube',
    sub: 'Props, personajes y entornos',
    items: [
      { title: 'Prop A',    thumb: null, icon: 'fa-cube'   },
      { title: 'Prop B',    thumb: null, icon: 'fa-cube'   },
      { title: 'Personaje', thumb: null, icon: 'fa-person' },
    ]
  },
  {
    id: 'pixelart',
    label: 'Pixel Art',
    icon: 'fa-border-all',
    sub: 'Sprites y escenas en pixel art',
    items: [
      { title: 'Sprite 1', thumb: null, icon: 'fa-image' },
      { title: 'Sprite 2', thumb: null, icon: 'fa-image' },
    ]
  },
  {
    id: 'arte',
    label: 'Arte Conceptual',
    icon: 'fa-paintbrush',
    sub: 'Ilustraciones y concept art',
    items: [
      { title: 'Concept 1', thumb: null, icon: 'fa-paintbrush' },
      { title: 'Concept 2', thumb: null, icon: 'fa-paintbrush' },
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: 'fa-file-lines',
    sub: 'GDDs, apuntes y documentación',
    items: [
      { title: 'GDD ejemplo', thumb: null, icon: 'fa-file-lines' },
    ]
  },
];
/* ▲▲▲ FIN EDICIÓN ▲▲▲ */

let activeCatIdx = 0;
let isAnimating  = false;

const sidebarEl  = document.getElementById('xmb-sidebar');
const contentEl  = document.getElementById('xmb-content-bar');
const titleEl    = document.getElementById('xmb-cat-title');
const subEl      = document.getElementById('xmb-cat-sub');

/* ── RENDER SIDEBAR ── */
function renderSidebar() {
  sidebarEl.innerHTML = '';
  EXTRA_CATEGORIES.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'xmb-cat' + (i === activeCatIdx ? ' active' : '');
    btn.innerHTML = `<i class="fa-solid ${cat.icon}"></i><span>${cat.label}</span>`;
    btn.addEventListener('click', () => {
      if (i === activeCatIdx || isAnimating) return;
      switchCategory(i);
    });
    sidebarEl.appendChild(btn);
  });
}

/* ── RENDER CONTENT con animación izquierda→derecha ── */
function renderContent(animate) {
  const cat = EXTRA_CATEGORIES[activeCatIdx];

  if (!animate) {
    buildItems(cat);
    return;
  }

  // Salida: slide hacia la izquierda
  isAnimating = true;
  contentEl.classList.add('xmb-exit');

  setTimeout(() => {
    contentEl.classList.remove('xmb-exit');
    buildItems(cat);
    // Entrada: viene desde la derecha
    contentEl.classList.add('xmb-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        contentEl.classList.remove('xmb-enter');
        contentEl.classList.add('xmb-enter-active');
        setTimeout(() => {
          contentEl.classList.remove('xmb-enter-active');
          isAnimating = false;
        }, 320);
      });
    });
  }, 220);
}

function buildItems(cat) {
  contentEl.innerHTML = '';
  cat.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'xmb-item';
    if (item.thumb) {
      el.innerHTML = `
        <div class="xmb-thumb"><img src="${item.thumb}" alt="${item.title}"></div>
        <span class="xmb-item-label">${item.title}</span>`;
    } else {
      el.innerHTML = `
        <div class="xmb-thumb xmb-thumb-icon"><i class="fa-solid ${item.icon}"></i></div>
        <span class="xmb-item-label">${item.title}</span>`;
    }
    contentEl.appendChild(el);
  });
}

/* ── ANIMACIÓN TÍTULO ── */
function animateTitle(cat) {
  titleEl.classList.add('xmb-title-exit');
  subEl.classList.add('xmb-title-exit');
  setTimeout(() => {
    titleEl.textContent = cat.label;
    subEl.textContent   = cat.sub || '';
    titleEl.classList.remove('xmb-title-exit');
    subEl.classList.remove('xmb-title-exit');
    titleEl.classList.add('xmb-title-enter');
    subEl.classList.add('xmb-title-enter');
    setTimeout(() => {
      titleEl.classList.remove('xmb-title-enter');
      subEl.classList.remove('xmb-title-enter');
    }, 280);
  }, 180);
}

/* ── CAMBIAR CATEGORÍA ── */
function switchCategory(newIdx) {
  activeCatIdx = newIdx;
  renderSidebar();
  animateTitle(EXTRA_CATEGORIES[newIdx]);
  renderContent(true);
}

/* ── TECLADO ── */
document.addEventListener('keydown', e => {
  if (isAnimating) return;
  if (e.key === 'ArrowUp'   && activeCatIdx > 0)
    switchCategory(activeCatIdx - 1);
  if (e.key === 'ArrowDown' && activeCatIdx < EXTRA_CATEGORIES.length - 1)
    switchCategory(activeCatIdx + 1);
});

/* ── INIT ── */
function init() {
  const cat = EXTRA_CATEGORIES[activeCatIdx];
  titleEl.textContent = cat.label;
  subEl.textContent   = cat.sub || '';
  renderSidebar();
  renderContent(false);
}
init();

/* ═══ TRANSICIÓN CIRCULAR (no tocar) ═══ */
const circleFill = document.getElementById('circle-fill');

function getCircleScale() {
  const w = window.innerWidth, h = window.innerHeight;
  return Math.ceil(Math.sqrt(w * w + h * h) / 30) + 2;
}

function snapCovered() {
  if (!circleFill) return;
  circleFill.style.setProperty('--circle-scale', getCircleScale());
  circleFill.style.transition = 'none';
  circleFill.classList.add('expand');
  void circleFill.offsetWidth;
  circleFill.style.transition = '';
}

function revealPage() {
  if (!circleFill) return;
  circleFill.style.setProperty('--circle-scale', getCircleScale());
  requestAnimationFrame(() => circleFill.classList.remove('expand'));
}

if (circleFill) {
  const params = new URLSearchParams(window.location.search);
  const cx = params.get('x') || 'calc(100% - 47px)';
  const cy = params.get('y') || '47px';
  circleFill.style.left = cx;
  circleFill.style.top  = cy;
  snapCovered();
  window.addEventListener('load', () => setTimeout(revealPage, 50));
}

const btnBack = document.getElementById('btn-back-extra');
if (btnBack) {
  btnBack.addEventListener('click', () => {
    if (!circleFill) { window.location.href = 'index.html'; return; }
    const rect = btnBack.getBoundingClientRect();
    circleFill.style.left = (rect.left + rect.width  / 2) + 'px';
    circleFill.style.top  = (rect.top  + rect.height / 2) + 'px';
    circleFill.style.setProperty('--circle-scale', getCircleScale());
    circleFill.classList.remove('expand');
    void circleFill.offsetWidth;
    const done = () => {
      circleFill.removeEventListener('transitionend', done);
      window.location.href = 'index.html';
    };
    circleFill.addEventListener('transitionend', done);
    requestAnimationFrame(() => circleFill.classList.add('expand'));
  });
}