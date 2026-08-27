/* extra.html — interfaz XMB de contenido extra */

/* ▼▼▼ EDITA TUS CATEGORÍAS Y CONTENIDO AQUÍ ▼▼▼ */
const EXTRA_CATEGORIES = [
  {
    id: 'modelado',
    label: 'Modelado 3D',
    icon: 'fa-cube',
    sub: 'Props, personajes y entornos en 3D',
    items: [
      { title: 'Prop A', icon: 'fa-cube' },
      { title: 'Prop B', icon: 'fa-cube' },
      { title: 'Personaje', icon: 'fa-person' },
    ]
  },
  {
    id: 'pixelart',
    label: 'Pixel Art',
    icon: 'fa-border-all',
    sub: 'Sprites y escenas en pixel art',
    items: [
      { title: 'Sprite 1', icon: 'fa-image' },
      { title: 'Sprite 2', icon: 'fa-image' },
    ]
  },
  {
    id: 'arte',
    label: 'Arte Conceptual',
    icon: 'fa-paintbrush',
    sub: 'Ilustraciones y concept art',
    items: [
      { title: 'Concept 1', icon: 'fa-paintbrush' },
      { title: 'Concept 2', icon: 'fa-paintbrush' },
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: 'fa-file-lines',
    sub: 'GDDs, apuntes y documentación',
    items: [
      { title: 'GDD ejemplo', icon: 'fa-file-lines' },
    ]
  },
];
/* ▲▲▲ FIN EDICIÓN ▲▲▲ */

let activeCategory = EXTRA_CATEGORIES[0].id;

function renderSidebar() {
  const sidebar = document.getElementById('xmb-sidebar');
  sidebar.innerHTML = '';
  EXTRA_CATEGORIES.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'xmb-cat' + (cat.id === activeCategory ? ' active' : '');
    b.innerHTML = `<i class="fa-solid ${cat.icon}"></i><span>${cat.label}</span>`;
    b.onclick = () => { activeCategory = cat.id; render(); };
    sidebar.appendChild(b);
  });
}

function renderContent() {
  const cat = EXTRA_CATEGORIES.find(c => c.id === activeCategory);
  if (!cat) return;

  document.getElementById('xmb-cat-title').textContent = cat.label;
  document.getElementById('xmb-cat-sub').textContent   = cat.sub || '';

  const bar = document.getElementById('xmb-content-bar');
  bar.innerHTML = '';
  cat.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'xmb-item';
    el.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.title}</span>`;
    bar.appendChild(el);
  });
}

function render() {
  renderSidebar();
  renderContent();
}

render();

/* ═══ Transición circular de entrada/salida ═══
   Continúa la animación que empezó el botón de #btn-extras en
   index.html: esta página arranca ya "tapada" por el círculo y,
   nada más cargar, se destapa. Al volver, hace lo contrario:
   se tapa y entonces navega de vuelta a index.html. */
const circleFill = document.getElementById('circle-fill');

function snapCovered() {
  if (!circleFill) return;
  circleFill.style.transition = 'none';
  circleFill.classList.add('expand');
  void circleFill.offsetWidth; // forzar reflow
  circleFill.style.transition = '';
}

function revealPage() {
  if (!circleFill) return;
  requestAnimationFrame(() => {
    circleFill.classList.remove('expand');
  });
}

// Al cargar: aparece ya tapada (centrada, aprox. donde estaba el
// botón de extras en la página anterior) y se destapa.
if (circleFill) {
  circleFill.style.left = 'calc(100% - 40px)';
  circleFill.style.top  = '50%';
  snapCovered();
  window.addEventListener('load', () => setTimeout(revealPage, 50));
}

const btnBack = document.getElementById('btn-back-extra');
if (btnBack) {
  btnBack.addEventListener('click', () => {
    if (!circleFill) { window.location.href = 'index.html'; return; }
    const rect = btnBack.getBoundingClientRect();
    circleFill.style.left = (rect.left + rect.width / 2) + 'px';
    circleFill.style.top  = (rect.top + rect.height / 2) + 'px';
    circleFill.classList.remove('expand');
    void circleFill.offsetWidth;

    const onCovered = () => {
      circleFill.removeEventListener('transitionend', onCovered);
      window.location.href = 'index.html';
    };
    circleFill.addEventListener('transitionend', onCovered);
    requestAnimationFrame(() => circleFill.classList.add('expand'));
  });
}