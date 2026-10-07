/* PSP PORTFOLIO — main.js */

/* ▼▼▼ EDITA TUS JUEGOS ▼▼▼ */
const GAMES = [
  { 
    title:"Corazón de Guerra",  
    genre:"Plataforma y puzle",       
    year:"2024", 
    desc:"Vive la aventura de Hermes, un jóven que se ve obligado a servir en el ejército como mensajero. Observa el deterioro de la guerra desde la perspectiva de un niño.", 
    tags:["Construct 3","2D","Pixel Art","Narrativa"],    
    discColor:"#5b4100", 
    accentColor:"#b58200",
    cover: "cover/Corazon_cover.webp",
    discModel: "models/Corazon_de_guerra.glb",
    animModel: "models/Corazon_de_guerra_anim.glb",
    playUrl: "https://xiilastudio.itch.io/corazon-de-guerra",
    gddUrl: "docs/GDD_Corazon.pdf"
  },
  { 
    title:"Que no te Coma el Amor",     
    genre:"Narrativa y simulador de citas",            
    year:"2024", 
    desc:"En este juego inspirado en la película Tesis, te pondrás en la piel de un estudiante de cine mientras intentas acercarte a Chema y Bosco.", 
    tags:["Construct 3","Game Jam","Narrativa"],      
    discColor:"#4e0000", 
    accentColor:"#b90000",
    cover: "cover/Coma_cover.webp",
    discModel: "models/Que_no_te_coma_el_amor.glb",
    animModel: "models/Que_no_te_coma_el_amor_anim.glb",
    playUrl: "https://axiada.itch.io/tesiscoma",
    gddUrl: "docs/GDD_Amor.pdf"
  },
  { 
    title:"Clashing Blocks",    
    genre:"Rompecabezas y plataformas", 
    year:"2025", 
    desc:"El mago Alexias protege sus cereales supremos. El caballero Pavel, hambriento, ha escalado la torre para robárselos. Un duelo absurdo donde el desayuno es el premio.", 
    tags:["Unity","2D","Pixel Art","Cooperativo local"],         
    discColor:"#29003e", 
    accentColor:"#8101c1",
    cover: "cover/Clashing_cover.webp",
    discModel: "models/Clashing_blocks.glb",
    animModel: "models/Clashing_blocks_anim.glb",
    playUrl: "https://clashing-blocks.itch.io/clashing-blocks",
    gddUrl: "docs/GDD_ClashingBlocks.pdf"
  },
  { 
    title:"Rush Hour",       
    genre:"Juego de Lógica",         
    year:"2026", 
    desc:"El objetivo principal del jugador es sacar un coche específico, a través de la única salida del tablero desplazando los coches que bloquean el camino.", 
    tags:["Unity","C#","2D","Lógica"],              
    discColor:"#6a2300", 
    accentColor:"#ed5001",
    cover: "cover/Rush_cover.webp",
    discModel: "models/Rush_hour.glb",
    animModel: "models/Rush_hour_anim.glb",
    playUrl: "https://itch.io",
    gddUrl: "docs/GDD_RushHour.pdf"
  },
  { 
    title:"Over Zhousands",        
    genre:"Gestión de Recursos y Tropas",         
    year:"2026", 
    desc:"Juego post apocalíptico estilo cartoon donde controlas tu propia colonia de zombis. Construye tu aZentamiento para fortalecer tu horda.", 
    tags:["Unity","3D","Gestión","Zombis"],           
    discColor:"#0e4500", 
    accentColor:"#1fb501",
    cover: "cover/Over_cover.webp",
    discModel: "models/Over_zhousands.glb",
    animModel: "models/Over_zhousands_anim.glb",
    playUrl: "https://sickgecko.itch.io/over-zhousands",
    gddUrl: "docs/GDD_OverZhousands.pdf"
  }
];
/* ▲▲▲ FIN EDICIÓN ▲▲▲ */

const FORCE_UMD_ROTATION = false;
const MANUAL_UMD_ROTATION = [0, Math.PI, 0];

const INSERT_ANIM_SCALE  = 60;          
const INSERT_ANIM_OFFSET = [0, 0, 0];  
const INSERT_ANIM_TIMESCALE = 0.9;     
const INSERT_ANIM_HOLD_MS   = 150;
const PSP_BOOT_TRIGGER_MS   = 150;
const SIDE_HIDE_OFFSET_PX   = 700;

/* ═══ ANCHO DE CADA DISCO EN EL CARRUSEL ═══
   Ya no es un número fijo: se mide del CSS (ancho del disco + márgenes),
   porque en móvil/tablet los discos son más pequeños. Si esto no
   coincide con el CSS, el disco central deja de quedar en el centro. */
let ITEM_W = 380;

function measureItemWidth() {
  const item = DOM.carouselTrack && DOM.carouselTrack.querySelector('.umd-item');
  if (!item) return;
  const cs = getComputedStyle(item);
  // offsetWidth ignora el transform: scale() que pone el carrusel
  ITEM_W = item.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
}

/* ═══ PANTALLA DE LA PSP DENTRO DEL MODELO 3D ═══
   Rectángulo de la pantalla en coordenadas del modelo, una vez escalado a
   PSP_TARGET_SIZE (15 de ancho). Medido sobre un render del modelo. Se usa
   para encuadrar la cámara y colocar el HTML (#psp-screen) justo encima. */
const PSP_TARGET_SIZE = 15;
const PSP_SCREEN_RECT = { x0: -4.251, x1: 4.300, y0: -2.312, y1: 2.836, z: 0.518 };
const PSP_MIN_SCREEN_PX = 560;   // en pantallas pequeñas se hace zoom hasta que la pantalla mida esto

/* ═══ ESTADO ═══ */
let currentIdx  = 0;
let trackOffset = 0;        
let appState    = 'carousel';
let umdScenes   = [];
let umdTemplates = [];
let pspGLTF     = null;
let pspRenderer = null, pspScene = null, pspCamera = null, pspModel = null;
let modelsReady = 0;
let clockTimer  = null;

/* inserción */
let insertingScene = null;  

/* inserción — animación real vía Blender (.glb + AnimationMixer).
   Un único canvas/renderer compartido por las 5 animaciones: antes había
   uno por juego (11 contextos WebGL en total) y en móviles el navegador
   empieza a cerrar contextos y los discos desaparecen. */
let insertAnimGLTFs    = [];
let insertAnimData     = [];
let insertAnimCanvas   = null;
let insertAnimRenderer = null;
let activeInsertAnim   = null;
let insertAnimPlaying  = false;
let pspLastW = 0, pspLastH = 0;

/* ═══ CACHÉ DOM ═══ */
let DOM = {};

function cacheDOM() {
  DOM.loadBar          = document.querySelector('.load-bar');
  DOM.loading          = document.getElementById('loading');
  DOM.carouselOuter    = document.getElementById('carousel-outer');
  DOM.carouselTrack    = document.getElementById('carousel-track');
  DOM.dotsNav          = document.getElementById('dots-nav');
  DOM.gameNameDisplay  = document.getElementById('game-name-display');
  DOM.gameGenreDisplay = document.getElementById('game-genre-display');
  DOM.bottomUi         = document.getElementById('bottom-ui');
  DOM.header           = document.getElementById('header');
  DOM.labelSelect      = document.getElementById('label-select');
  DOM.viewCarousel     = document.getElementById('view-carousel');
  DOM.viewPsp          = document.getElementById('view-psp');
  DOM.btnBack          = document.getElementById('btn-back');
  DOM.pspCanvas        = document.getElementById('psp-canvas');
  DOM.screenIdle       = document.getElementById('screen-idle');
  DOM.screenGame       = document.getElementById('screen-game');
  DOM.pspScreen        = document.getElementById('psp-screen');
  DOM.sgTitle          = document.getElementById('sg-title');
  DOM.sgGenre          = document.getElementById('sg-genre');
  DOM.sgTitleInfo      = document.getElementById('sg-title-info');
  DOM.sgGenreInfo      = document.getElementById('sg-genre-info');
  DOM.sgYear           = document.getElementById('sg-year');
  DOM.sgDesc           = document.getElementById('sg-desc');
  DOM.sgTags           = document.getElementById('sg-tags');
  DOM.sgTime           = document.getElementById('sg-time');
  DOM.sgBody           = document.querySelector('.sg-body');
  DOM.sgBgImg          = document.getElementById('sg-bg-img');
  DOM.btnPlay          = document.getElementById('sg-btn-play');
  DOM.btnGdd           = document.getElementById('sg-btn-gdd');
  DOM.sgContent        = document.getElementById('sg-content');
  DOM.sgInfoPage       = document.getElementById('sg-info-page');
  DOM.sgScrollArrow    = document.getElementById('sg-scroll-arrow');
  DOM.sgScrollArrowIcon= document.getElementById('sg-scroll-arrow-icon');

  DOM.btnExtras        = document.getElementById('btn-extras');
  DOM.circleFill       = document.getElementById('circle-fill');

  // La flecha es el ÚNICO control para pasar de la portada a la info
  // y viceversa — no hay scroll libre. Alterna la clase 'showing-info'
  // en #sg-content (el CSS se encarga de deslizar ambas páginas) y
  // voltea el icono de la flecha (↓ = ir a la info, ↑ = volver a portada).
  if (DOM.sgScrollArrow && DOM.sgContent) {
    DOM.sgScrollArrow.addEventListener('click', () => {
      const showingInfo = DOM.sgContent.classList.toggle('showing-info');
      if (DOM.sgScrollArrowIcon) {
        DOM.sgScrollArrowIcon.classList.toggle('fa-chevron-down', !showingInfo);
        DOM.sgScrollArrowIcon.classList.toggle('fa-chevron-up', showingInfo);
      }
    });
  }

  // Botón de contenido extra: la pantalla se tapa con el círculo y,
  // ya tapada del todo, navegamos de verdad a extra.html (página aparte).
  if (DOM.btnExtras) {
    DOM.btnExtras.addEventListener('click', () => {
      if (appState !== 'carousel') return;
      playCircleWipe(DOM.btnExtras, () => {
        window.location.href = 'extra.html';
      }, /* shrinkBack */ false);
    });
  }
}

/**
 * Transición tipo "iris": un círculo crece desde el botón que se
 * pulsó hasta tapar toda la pantalla (con pasos, no suave, para dar
 * sensación pixel/retro). Cuando la pantalla queda ya tapada del
 * todo, se ejecuta onCovered().
 *
 * - shrinkBack = true  (por defecto): tras onCovered(), el círculo
 *   se encoge de vuelta a 0, revelando lo nuevo EN LA MISMA página.
 * - shrinkBack = false: se queda tapado — se usa justo antes de
 *   navegar a otra página (extra.html), donde esa página arranca
 *   ya "tapada" y hace ella misma la animación de destape (ver
 *   extra.html) para que la transición se sienta continua.
 */
function playCircleWipe(originEl, onCovered, shrinkBack = true) {
  if (!DOM.circleFill) { onCovered(); return; }

  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  DOM.circleFill.style.left = cx + 'px';
  DOM.circleFill.style.top  = cy + 'px';

  // Aseguramos que arranca en 0 (por si venimos de una transición anterior)
  DOM.circleFill.classList.remove('expand');
  void DOM.circleFill.offsetWidth; // fuerza reflow para reiniciar la transición

  const onExpandEnd = () => {
    DOM.circleFill.removeEventListener('transitionend', onExpandEnd);
    onCovered();
    if (shrinkBack) {
      // Pequeña pausa con la pantalla tapada del todo antes de destapar
      setTimeout(() => {
        DOM.circleFill.classList.remove('expand');
      }, 100);
    }
  };
  DOM.circleFill.addEventListener('transitionend', onExpandEnd);
  requestAnimationFrame(() => DOM.circleFill.classList.add('expand'));
}

/* ═══ LOADING ═══
   La barra se busca ya aquí: antes se buscaba en cacheDOM(), que solo se
   llama al terminar de cargar, así que la barra nunca llegaba a moverse. */
DOM.loadBar = document.querySelector('.load-bar');
let fakePct = 0;
const fakeTimer = setInterval(() => {
  fakePct = Math.min(fakePct + Math.random() * 6, 60);
  setLoadBar(Math.max(fakePct, 60 * modelsReady / TOTAL_MODELS));
}, 180);

function setLoadBar(pct) {
  if (DOM.loadBar) DOM.loadBar.style.width = Math.min(100, pct) + '%';
}

function modelLoaded() {
  modelsReady++;
  setLoadBar(60 + 40 * modelsReady / TOTAL_MODELS);
  if (modelsReady >= TOTAL_MODELS) {
    clearInterval(fakeTimer);
    setLoadBar(100);
    setupInsertAnimScenes();
    setTimeout(init, 350);
  }
}

/* ═══ GLTF LOADER ═══ */
const gltfLoader = new THREE.GLTFLoader();

const TOTAL_MODELS = 1 + (GAMES.length * 2);

gltfLoader.load('models/sony_psp.glb',
  g => { pspGLTF = g; modelLoaded(); }, undefined,
  () => { pspGLTF = null; modelLoaded(); });

GAMES.forEach((game, i) => {
  gltfLoader.load(game.discModel,
    g => { umdTemplates[i] = g.scene; modelLoaded(); }, undefined,
    () => { umdTemplates[i] = null; modelLoaded(); });

  gltfLoader.load(game.animModel,
    g => { insertAnimGLTFs[i] = g; modelLoaded(); }, undefined,
    () => { insertAnimGLTFs[i] = null; modelLoaded(); });
});

/* ═══ SONIDO ═══ */
function playPSPSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sr = ctx.sampleRate, dur = 1.8;
    const buf = ctx.createBuffer(1, sr * dur, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, f = 40 + 80 * Math.min(t / 0.8, 1);
      d[i] = (Math.sin(2*Math.PI*f*t)*0.15 + (Math.random()*2-1)*0.04*Math.max(0,1-t/dur)
             + (t<0.5?Math.sin(2*Math.PI*8*t)*0.08:0)) * Math.min(t*4,1) * Math.max(0,1-(t-1.2)/0.6);
    }
    const src=ctx.createBufferSource(); src.buffer=buf;
    const flt=ctx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=800;
    const gn=ctx.createGain(); gn.gain.value=0.5;
    src.connect(flt); flt.connect(gn); gn.connect(ctx.destination); src.start();

    const cb=ctx.createBuffer(1,2048,sr); const cd=cb.getChannelData(0);
    for(let i=0;i<2048;i++) cd[i]=(Math.random()*2-1)*Math.exp(-i/180);
    const cs=ctx.createBufferSource(); cs.buffer=cb;
    const cg=ctx.createGain(); cg.gain.value=0.85;
    cs.connect(cg); cg.connect(ctx.destination); cs.start();
  } catch(e) {}
}

/* ═══ INIT ═══ */
function init() {
  cacheDOM();
  buildCarousel();
  measureItemWidth();
  buildPSP();
  buildDots();

  trackOffset = centeredOffset(0);
  applyTrackTransform(trackOffset);
  updateLabels();
  updateDots();
  updateScales();

  if (DOM.loading) DOM.loading.classList.add('done');
  requestAnimationFrame(animLoop);
}

function centeredOffset(idx) {
  const outerW = DOM.carouselOuter ? DOM.carouselOuter.offsetWidth : window.innerWidth;
  return (outerW / 2) - (idx * ITEM_W) - (ITEM_W / 2);
}

function applyTrackTransform(offset) {
  if (DOM.carouselTrack) DOM.carouselTrack.style.transform = `translateX(${offset}px)`;
}

/* ═══ BUILD CAROUSEL ═══ */
function buildCarousel() {
  umdScenes = [];
  if (!DOM.carouselTrack) return;
  DOM.carouselTrack.innerHTML = '';

  GAMES.forEach((game, i) => {
    const item = document.createElement('div');
    item.className = 'umd-item';

    const cv = document.createElement('canvas');
    cv.className = 'umd-canvas';
    cv.width = cv.height = 500;

    const shadowEl = document.createElement('div');
    shadowEl.className = 'umd-shadow';

    item.appendChild(cv);
    item.appendChild(shadowEl);
    DOM.carouselTrack.appendChild(item);

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const kl = new THREE.DirectionalLight(0xffffff, 2.2); kl.position.set(5, 8, 7); scene.add(kl);
    const fl = new THREE.DirectionalLight(0x99aaff, 0.5); fl.position.set(-5, -2, 4); scene.add(fl);
    const rl = new THREE.DirectionalLight(0xffeedd, 0.35); rl.position.set(0, -6, -5); scene.add(rl);
    const glowLight = new THREE.PointLight(parseInt(game.accentColor.replace('#',''), 16), 1.0, 9);
    glowLight.position.set(0, 0, 3); scene.add(glowLight);

    let mesh;
    const gameUmdTemplate = umdTemplates[i];
    if (gameUmdTemplate) {
      mesh = gameUmdTemplate.clone();

      const box0  = new THREE.Box3().setFromObject(mesh);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxD  = Math.max(size0.x, size0.y, size0.z);
      const sc    = 4.2 / maxD;
      mesh.scale.setScalar(sc);
      mesh.scale.x *= 1.05;

      if (FORCE_UMD_ROTATION) {
        mesh.rotation.set(MANUAL_UMD_ROTATION[0], MANUAL_UMD_ROTATION[1], MANUAL_UMD_ROTATION[2]);
      } else {
        const flatRots = [
          [0,0,0], [0,Math.PI,0],
          [Math.PI/2,0,0], [-Math.PI/2,0,0],
          [0,0,Math.PI/2], [0,0,-Math.PI/2],
          [Math.PI/2,0,Math.PI/2], [-Math.PI/2,0,Math.PI/2],
        ];
        let bestScore = -Infinity, bestRot = [0,0,0];
        for (const r of flatRots) {
          mesh.rotation.set(r[0],r[1],r[2]);
          mesh.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(mesh);
          const s = b.getSize(new THREE.Vector3());
          const score = (s.x * s.y) / (s.z * s.z + 0.001);
          if (score > bestScore) { bestScore = score; bestRot = r; }
        }

        const candidateA = bestRot;
        const candidateB = [bestRot[0], bestRot[1] + Math.PI, bestRot[2]];

        function frontZBias(rot) {
          mesh.rotation.set(rot[0],rot[1],rot[2]);
          mesh.updateMatrixWorld(true);
          let totalZ = 0, count = 0;
          const v = new THREE.Vector3();
          mesh.traverse(n => {
            if (n.isMesh && n.geometry && n.geometry.attributes.position) {
              const posAttr = n.geometry.attributes.position;
              const step = Math.max(1, Math.floor(posAttr.count / 200));
              for (let vi = 0; vi < posAttr.count; vi += step) {
                v.fromBufferAttribute(posAttr, vi);
                v.applyMatrix4(n.matrixWorld);
                totalZ += v.z;
                count++;
              }
            }
          });
          return count ? totalZ / count : 0;
        }

        const zA = frontZBias(candidateA);
        const zB = frontZBias(candidateB);
        bestRot = zA >= zB ? candidateA : candidateB;

        mesh.rotation.set(bestRot[0], bestRot[1], bestRot[2]);
      }

      mesh.updateMatrixWorld(true);
      const box1    = new THREE.Box3().setFromObject(mesh);
      const center1 = box1.getCenter(new THREE.Vector3());
      mesh.position.sub(center1);
      const col = new THREE.Color(game.discColor);
      mesh.traverse(n => {
          if (n.isMesh) {
              const m = n.material.clone();
              m.color.lerp(col, 0.2);

              n.material = m;
          }
      });

    } else {
      mesh = makeFallbackUMD(game);
    }

    scene.add(mesh);
    item.addEventListener('click', () => onUMDClick(i));

    umdScenes.push({
      renderer, scene, camera, mesh, item,
      game,
      scale: 1, opacity: 1, sideOffset: 0,
      baseRotX: mesh.rotation.x,
      baseRotY: mesh.rotation.y,
      lastW: 0, lastH: 0
    });
  });
}

function makeFallbackUMD(game) {
  const g = new THREE.Group();
  const col = new THREE.Color(game.discColor);
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9,1.9,0.26,64),
    new THREE.MeshStandardMaterial({color:0x202020,metalness:0.3,roughness:0.5}));
  shell.rotation.x = Math.PI/2; g.add(shell);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5,1.5,0.09,64),
    new THREE.MeshStandardMaterial({color:col,metalness:0.7,roughness:0.15}));
  disc.rotation.x = Math.PI/2; disc.position.z = 0.1; g.add(disc);

  for (let r=0.3; r<1.45; r+=0.09) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r,0.005,8,64),
      new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.06,metalness:0.9}));
    ring.position.z = 0.12; g.add(ring);
  }

  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15,0.15,0.12,32),
    new THREE.MeshStandardMaterial({color:0x080808}));
  hole.rotation.x = Math.PI/2; hole.position.z = 0.11; g.add(hole);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.9,0.022,12,64),
    new THREE.MeshStandardMaterial({color:0x888888,metalness:0.9,roughness:0.1}));
  g.add(rim);
  return g;
}

/* ═══ NAVEGACIÓN ═══ */
function navigate(dir) {
  if (appState !== 'carousel') return;
  const n = currentIdx + dir;
  if (n < 0 || n >= GAMES.length) return;
  currentIdx = n;
  updateLabels();
  updateDots();
}

function onUMDClick(idx) {
  if (appState !== 'carousel') return;
  if (idx !== currentIdx) { currentIdx = idx; updateLabels(); updateDots(); return; }
  startInsert();
}

function updateLabels() {
  const g = GAMES[currentIdx];
  if (DOM.gameNameDisplay)  DOM.gameNameDisplay.textContent  = g.title;
  if (DOM.gameGenreDisplay) DOM.gameGenreDisplay.textContent = g.genre;
}

/* ═══ DOTS ═══ */
function buildDots() {
  if (!DOM.dotsNav) return;
  DOM.dotsNav.innerHTML = '';
  GAMES.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'nav-dot' + (i === 0 ? ' active' : '');
    b.onclick = () => { if(appState!=='carousel') return; currentIdx=i; updateLabels(); updateDots(); };
    DOM.dotsNav.appendChild(b);
  });
}

function updateDots() {
  if (!DOM.dotsNav) return;
  const dots = DOM.dotsNav.children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === currentIdx);
  }
}

/* ═══ ESCALAS ═══ */
function updateScales() {
  const inserting = appState !== 'carousel';

  umdScenes.forEach((s, i) => {
    const dist = Math.abs(i - currentIdx);
    const targetScale   = dist===0 ? 1.2 : dist===1 ? 1.05 : 0.95;
    const targetOpacity = dist===0 ? 1    : dist===1 ? 0.8 : 0;
    s.targetScale   = targetScale;
    s.targetOpacity = targetOpacity;

    if (inserting && i !== currentIdx) {
      const dir = i < currentIdx ? -1 : 1;
      s.targetSideOffset = dir * SIDE_HIDE_OFFSET_PX;
    } else {
      s.targetSideOffset = 0;
    }
  });
}

/* ═══ SETUP INSERT ANIM — una animación distinta por juego ═══ */
function setupInsertAnimScenes() {
  insertAnimData = [];

  // Canvas + renderer únicos, compartidos por todas las animaciones
  insertAnimCanvas = document.createElement('canvas');
  insertAnimCanvas.id = 'insert-anim-canvas';
  Object.assign(insertAnimCanvas.style, {
    position: 'fixed',
    left: '0px', top: '0px', width: '0px', height: '0px',
    pointerEvents: 'none',
    zIndex: '40',
    opacity: '0',
  });
  document.body.appendChild(insertAnimCanvas);

  insertAnimRenderer = new THREE.WebGLRenderer({ canvas: insertAnimCanvas, antialias: true, alpha: true });
  insertAnimRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  insertAnimRenderer.setClearColor(0, 0);
  insertAnimRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  insertAnimRenderer.toneMappingExposure = 1.35;

  GAMES.forEach((game, i) => {
    const gltf = insertAnimGLTFs[i];
    if (!gltf) {
      insertAnimData[i] = null;
      return;
    }

    const canvas = insertAnimCanvas;
    const renderer = insertAnimRenderer;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const kl = new THREE.DirectionalLight(0xffffff, 2.2);
    kl.position.set(5, 8, 7);
    scene.add(kl);
    const fl = new THREE.DirectionalLight(0x99aaff, 0.5);
    fl.position.set(-5, -2, 4);
    scene.add(fl);

    const root = gltf.scene;
    root.scale.setScalar(INSERT_ANIM_SCALE);
    root.position.set(INSERT_ANIM_OFFSET[0], INSERT_ANIM_OFFSET[1], INSERT_ANIM_OFFSET[2]);
    scene.add(root);

    const mixer = new THREE.AnimationMixer(root);
    const clip = gltf.animations && gltf.animations[0];
    const action = clip ? mixer.clipAction(clip) : null;

    if (action) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    insertAnimData[i] = { canvas, renderer, scene, camera, mixer, action };
  });
}

function playInsertAnimation(scene, onDone) {
  const data = insertAnimData[currentIdx];

  if (!data || !data.action) {
    onDone();
    return;
  }

  activeInsertAnim = data;
  scene.item.style.opacity = '0';

  const rect  = scene.item.getBoundingClientRect();
  const baseW = Math.max(rect.width, 1);
  const baseH = Math.max(rect.height, 1);

  const mult = 3;
  const w = baseW * mult;
  const h = baseH * mult;
  const left = rect.left - baseW;
  const top  = rect.top  - baseH;

  Object.assign(data.canvas.style, {
    left:    left + 'px',
    top:     top + 'px',
    width:   w + 'px',
    height:  h + 'px',
    opacity: '1',
  });

  data.renderer.setSize(w, h, false);
  data.camera.aspect = w / h;
  data.camera.position.set(0, 0, 8 * mult);
  data.camera.updateProjectionMatrix();

  data.action.stop();
  data.action.reset();
  data.action.timeScale = INSERT_ANIM_TIMESCALE;
  data.action.play();
  insertAnimPlaying = true;

  const onFinished = (e) => {
    if (e.action !== data.action) return;
    data.mixer.removeEventListener('finished', onFinished);
    insertAnimPlaying = false;
    data.canvas.style.opacity = '0';
    activeInsertAnim = null;
    onDone();
  };

  data.mixer.addEventListener('finished', onFinished);
}

/* ═══ INSERTAR / VOLVER ═══ */
function startInsert() {
  if (appState !== 'carousel') return;
  appState = 'inserting';
  playPSPSound();

  if (DOM.bottomUi)         DOM.bottomUi.classList.add('hiding');
  if (DOM.header)           DOM.header.classList.add('hiding');
  if (DOM.labelSelect)      DOM.labelSelect.classList.add('hiding');
  if (DOM.gameNameDisplay)  DOM.gameNameDisplay.classList.add('hiding');
  if (DOM.gameGenreDisplay) DOM.gameGenreDisplay.classList.add('hiding');
  if (DOM.btnExtras)        DOM.btnExtras.classList.add('hiding');

  insertingScene = umdScenes[currentIdx];

  playInsertAnimation(insertingScene, () => {
    setTimeout(() => {
      if (DOM.viewCarousel) DOM.viewCarousel.classList.add('hiding');
      if (DOM.viewPsp)      DOM.viewPsp.classList.add('visible');

      setTimeout(() => {
        bootScreen(GAMES[currentIdx]);
        if (DOM.btnBack) DOM.btnBack.classList.add('visible');
        appState = 'psp';
      }, PSP_BOOT_TRIGGER_MS);
    }, INSERT_ANIM_HOLD_MS);
  });
}

function goBack() {
  if (appState !== 'psp') return;
  appState = 'inserting';
  if (DOM.btnBack)    DOM.btnBack.classList.remove('visible');
  if (DOM.screenGame) DOM.screenGame.classList.remove('active');
  if (DOM.screenIdle) DOM.screenIdle.style.display = 'flex';
  if (DOM.viewPsp)    DOM.viewPsp.classList.remove('visible');

  setTimeout(() => {
    if (insertingScene) {
      insertingScene.item.style.opacity   = '';
      insertingScene.item.style.transform = '';
      insertingScene = null;
    }
    if (activeInsertAnim) {
      activeInsertAnim.canvas.style.opacity = '0';
      if (activeInsertAnim.action) activeInsertAnim.action.stop();
    }
    insertAnimPlaying = false;
    activeInsertAnim = null;

    if (DOM.bottomUi)         DOM.bottomUi.classList.remove('hiding');
    if (DOM.header)           DOM.header.classList.remove('hiding');
    if (DOM.labelSelect)      DOM.labelSelect.classList.remove('hiding');
    if (DOM.gameNameDisplay)  DOM.gameNameDisplay.classList.remove('hiding');
    if (DOM.gameGenreDisplay) DOM.gameGenreDisplay.classList.remove('hiding');
    if (DOM.btnExtras)        DOM.btnExtras.classList.remove('hiding');
    if (DOM.viewCarousel)     DOM.viewCarousel.classList.remove('hiding');

    updateLabels(); updateDots();
    appState = 'carousel';
  }, 700);
}

/* ═══ PSP 3D ═══ */
function buildPSP() {
  if (!DOM.pspCanvas) return;
  pspRenderer = new THREE.WebGLRenderer({ canvas: DOM.pspCanvas, antialias: true, alpha: true });
  pspRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  pspRenderer.setClearColor(0, 0);
  pspRenderer.shadowMap.enabled = true;
  pspRenderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  pspRenderer.toneMapping       = THREE.ACESFilmicToneMapping;
  pspRenderer.toneMappingExposure = 1.6;

  pspScene  = new THREE.Scene();
  pspCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  pspCamera.position.set(0, 0, 12);
  pspCamera.lookAt(0, 0, 0);

  pspScene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const kl = new THREE.DirectionalLight(0xffffff, 3.2); 
  kl.position.set(8, 14, 10); 
  kl.castShadow = true; 
  kl.shadow.camera.left = -15;
  kl.shadow.camera.right = 15;
  kl.shadow.camera.top = 15;
  kl.shadow.camera.bottom = -15;
  kl.shadow.camera.near = 0.5;
  kl.shadow.camera.far = 30;
  kl.shadow.mapSize.set(2048, 2048);
  kl.shadow.bias = -0.0005;
  pspScene.add(kl);

  const fl = new THREE.DirectionalLight(0x8899ff, 0.7); fl.position.set(-10, 3, -6); pspScene.add(fl);
  const rl = new THREE.DirectionalLight(0xffeedd, 0.5); rl.position.set(3, -8, -8); pspScene.add(rl);
  const bl = new THREE.DirectionalLight(0xffffff, 0.3); bl.position.set(0, -10, 5); pspScene.add(bl);

  if (pspGLTF) {
    pspModel = pspGLTF.scene;
    const box  = new THREE.Box3().setFromObject(pspModel);
    const maxD = Math.max(...box.getSize(new THREE.Vector3()).toArray());

    const sc = PSP_TARGET_SIZE / maxD;
    pspModel.scale.setScalar(sc);
    pspModel.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(sc));
    pspModel.rotation.set(0, 0, 0);
    pspModel.traverse(n => { if(n.isMesh){ n.castShadow = true; n.receiveShadow = true; } });
  } else {
    pspModel = makeFallbackPSP();
  }
  pspScene.add(pspModel);

  // Tamaño real de la PSP ya escalada (para encuadrarla en layoutPSP)
  const size = new THREE.Box3().setFromObject(pspModel).getSize(new THREE.Vector3());
  pspScene.userData.pspW = size.x;
  pspScene.userData.pspH = size.y;

  layoutPSP();
  // Compilar los shaders ya, para que no haya tirón la primera vez que sale
  pspRenderer.compile(pspScene, pspCamera);
}

/* ═══ ENCUADRE RESPONSIVE DE LA PSP ═══
   En escritorio se queda todo como siempre (cámara en z = 12, pantalla de
   712px). Con la cámara fija, en móvil la PSP salía enorme y recortada, así
   que en pantallas pequeñas:
   1. Se calcula la escala (píxeles por unidad 3D) para que la PSP entera
      quepa en la ventana.
   2. Si así la pantalla queda demasiado pequeña (móvil, tablet vertical),
      se acerca la cámara hasta que la pantalla mida PSP_MIN_SCREEN_PX,
      sin pasarse nunca del ancho/alto de la ventana (los lados de la PSP
      pueden quedar fuera, la pantalla nunca).
   3. Se proyectan las esquinas de la pantalla 3D y se coloca #psp-screen
      exactamente encima. */
function layoutPSP() {
  if (!pspRenderer || !pspCamera || !DOM.viewPsp) return;
  const W = DOM.viewPsp.clientWidth;
  const H = DOM.viewPsp.clientHeight;
  if (!W || !H) return;

  if (W !== pspLastW || H !== pspLastH) {
    pspLastW = W; pspLastH = H;
    pspRenderer.setSize(W, H, false);
  }

  // Hueco reservado abajo para el botón "Volver al menú" (en móvil
  // horizontal el botón va arriba a la izquierda y no hace falta)
  const shortLandscape = H < 520 && W > H;
  const reserve = shortLandscape ? 0 : Math.min(96, H * 0.12);
  const Ha = H - reserve;

  const pspW = pspScene.userData.pspW || PSP_TARGET_SIZE;
  const pspH = pspScene.userData.pspH || PSP_TARGET_SIZE * 0.44;
  const R = PSP_SCREEN_RECT;
  const scrW = R.x1 - R.x0, scrH = R.y1 - R.y0;

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(pspCamera.fov / 2));
  pspCamera.aspect = W / H;

  // ── ESCRITORIO: exactamente igual que antes (cámara en z = 12 y la
  //    pantalla con su tamaño de siempre). Solo si la PSP cabe entera y
  //    la pantalla no queda pequeña; si no, se usa el encuadre responsive.
  const pOrig = H / (2 * (12 - R.z) * tanHalf);
  if (!shortLandscape && pOrig * pspW <= W * 0.98 && pOrig * scrW >= PSP_MIN_SCREEN_PX) {
    pspCamera.position.set(0, 0, 12);
    pspCamera.lookAt(0, 0, 0);
    pspCamera.updateProjectionMatrix();
    const w = Math.min(712, 0.58 * W);           // = width: min(712px, 58vw)
    const h = w * 295 / 480;                     // = aspect-ratio: 480 / 295
    if (DOM.pspScreen) Object.assign(DOM.pspScreen.style, {
      left: (W - w) / 2 + 'px',
      top:  (H - h - 0.055 * H) / 2 + 'px',      // = margin-top: -5.5vh
      width: w + 'px', height: h + 'px',
    });
    return;
  }

  // ── PANTALLAS PEQUEÑAS: encuadre responsive ──
  const pWhole  = Math.min(0.92 * W / pspW, 0.86 * Ha / pspH);   // PSP entera
  const pScreen = Math.min(0.95 * W / scrW, 0.90 * Ha / scrH);   // pantalla lo más grande posible
  const pMin    = PSP_MIN_SCREEN_PX / scrW;
  const p = Math.max(pWhole, Math.min(pScreen, pMin));

  // Al hacer zoom se centra la pantalla; con la PSP entera, la PSP
  const t = Math.min(1, Math.max(0, (p / pWhole - 1) / 0.25));
  const cx = t * (R.x0 + R.x1) / 2;
  const cy = t * (R.y0 + R.y1) / 2 - reserve / (2 * p);

  const dist = H / (2 * p * tanHalf);
  pspCamera.position.set(cx, cy, R.z + dist);
  pspCamera.lookAt(cx, cy, 0);
  pspCamera.updateProjectionMatrix();
  pspCamera.updateMatrixWorld();

  // Proyectar las esquinas de la pantalla 3D a píxeles
  const proj = (x, y) => {
    const v = new THREE.Vector3(x, y, R.z).project(pspCamera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  };
  const tl = proj(R.x0, R.y1);
  const br = proj(R.x1, R.y0);
  if (DOM.pspScreen) {
    Object.assign(DOM.pspScreen.style, {
      left:   tl.x + 'px',
      top:    tl.y + 'px',
      width:  (br.x - tl.x) + 'px',
      height: (br.y - tl.y) + 'px',
    });
  }
}

function makeFallbackPSP() {
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x1c1c1c,metalness:0.25,roughness:0.45});
  const body=new THREE.Mesh(new THREE.BoxGeometry(12,5.5,1.0),mat); g.add(body);
  const bez=new THREE.Mesh(new THREE.BoxGeometry(7.2,4.5,0.18),new THREE.MeshStandardMaterial({color:0x0a0a0a,roughness:0.9}));
  bez.position.set(0,0.4,0.58); g.add(bez);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(6.6,4.0),new THREE.MeshStandardMaterial({color:0x0a0a20,emissive:0x0a0a20,emissiveIntensity:0.5}));
  scr.position.set(0,0.4,0.68); g.add(scr);
  const shMat=new THREE.MeshStandardMaterial({color:0x252525});
  [-4.6,4.6].forEach(x=>{ const s=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.45,0.9),shMat); s.position.set(x,2.8,0); g.add(s); });
  [[-4.2,-0.7,0.55,0,1.6,0.12],[-4.2,-0.7,0.55,1.6,0,0.12]].forEach(([x,y,z,w,h,d])=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w||0.5,h||1.6,d),new THREE.MeshStandardMaterial({color:0x181818}));
    m.position.set(x,y,z); g.add(m);
  });
  [[0,0.55],[0.55,0],[-0.55,0],[0,-0.55]].forEach(([bx,by],idx)=>{
    const btn=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.12,16),
      new THREE.MeshStandardMaterial({color:[0x1a3a7a,0x8b1010,0x1a1a7a,0x4a3a00][idx],metalness:0.2}));
    btn.rotation.x=Math.PI/2; btn.position.set(4.3+bx*0.88,-0.7+by*0.88,0.58); g.add(btn);
  });
  return g;
}

/* ═══ PANTALLA ═══ */
function bootScreen(game) {
  if (DOM.sgBody) DOM.sgBody.scrollTop = 0;

  // Siempre arrancar mostrando la portada, no la info de la vez anterior
  if (DOM.sgContent) DOM.sgContent.classList.remove('showing-info');
  if (DOM.sgScrollArrowIcon) {
    DOM.sgScrollArrowIcon.classList.add('fa-chevron-down');
    DOM.sgScrollArrowIcon.classList.remove('fa-chevron-up');
  }

  if (DOM.screenIdle) DOM.screenIdle.style.display = 'flex';
  if (DOM.screenGame) DOM.screenGame.classList.remove('active');
  if (DOM.pspScreen)  DOM.pspScreen.classList.add('screen-booting');

  setTimeout(() => {
    if (DOM.pspScreen)  DOM.pspScreen.classList.remove('screen-booting');
    if (DOM.screenIdle) DOM.screenIdle.style.display = 'none';
    if (DOM.screenGame) DOM.screenGame.classList.add('active');

    if (DOM.sgBody) DOM.sgBody.style.setProperty('--game-color', game.discColor);
    if (DOM.sgTitle) DOM.sgTitle.textContent = game.title;

    if (DOM.sgGenre) {
      DOM.sgGenre.textContent = game.genre;
      DOM.sgGenre.style.color = game.accentColor;
    }

    // Título y género en la página de info (no en la portada)
    if (DOM.sgTitleInfo) DOM.sgTitleInfo.textContent = game.title;
    if (DOM.sgGenreInfo) {
      DOM.sgGenreInfo.textContent = game.genre;
      DOM.sgGenreInfo.style.color = game.accentColor;
    }

    if (DOM.sgYear) DOM.sgYear.textContent = game.year;
    if (DOM.sgDesc) DOM.sgDesc.textContent = game.desc;

    // Imagen de portada — se pone como fondo del div #sg-bg-img,
    // que es el elemento que de verdad tiene el CSS de background-size:cover.
    if (DOM.sgBgImg) {
      const coverUrl = game.cover || game.bgImage || game.image || '';
      DOM.sgBgImg.style.backgroundImage = coverUrl ? `url('${coverUrl}')` : 'none';
    }

    // Enlaces de acción
    if (DOM.btnPlay) DOM.btnPlay.href = game.playUrl || '#';
    if (DOM.btnGdd)  DOM.btnGdd.href  = game.gddUrl  || '#';

    if (DOM.sgTags) {
      DOM.sgTags.innerHTML = game.tags
        .map(t => `<span class="sg-tag" style="border-color:${game.accentColor}44;color:${game.accentColor}">${t}</span>`)
        .join('');
    }

    updateClock();
  }, 300);
}

function updateClock() {
  if (clockTimer) clearTimeout(clockTimer);
  const n = new Date();
  if (DOM.sgTime) DOM.sgTime.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  if (appState === 'psp') {
    clockTimer = setTimeout(updateClock, 30000);
  }
}

/* ═══ EVENTOS ═══ */
document.getElementById('arr-left').onclick   = () => navigate(-1);
document.getElementById('arr-right').onclick  = () => navigate(1);
document.getElementById('btn-insert').onclick = startInsert;
document.getElementById('btn-back').onclick   = goBack;

window.addEventListener('keydown', e => {
  if(e.key==='ArrowLeft')  navigate(-1);
  if(e.key==='ArrowRight') navigate(1);
  // Si el foco está en un botón/enlace, Enter ya lo pulsa el navegador.
  // Antes, Enter sobre una flecha cambiaba de juego Y además insertaba.
  const onControl = e.target.closest && e.target.closest('button, a');
  if(e.key==='Enter'  && appState==='carousel' && !onControl) startInsert();
  if(e.key==='Escape' && appState==='psp')      goBack();
});

let resizeRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    if (!DOM.carouselTrack) return;   // todavía cargando
    measureItemWidth();
    if (appState === 'carousel') {
      trackOffset = centeredOffset(currentIdx);
      applyTrackTransform(trackOffset);
    }
    layoutPSP();
  });
});

let tx = null;
document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  if(tx === null) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if(Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
});

/* ═══ ANIMATION LOOP ═══ */
let time = 0;
const clock = new THREE.Clock();

function animLoop() {
  requestAnimationFrame(animLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  if (appState === 'carousel' || appState === 'inserting') {
    const target = centeredOffset(currentIdx);
    trackOffset += (target - trackOffset) * 0.1;
    applyTrackTransform(trackOffset);
  }

  updateScales();

  umdScenes.forEach((s, i) => {
    if (!s.mesh) return;
    const isCenter = i === currentIdx;

    const isInsertingThisScene = insertingScene === s && appState !== 'carousel';
    if (!isInsertingThisScene) {
      s.scale      = s.scale      + ((s.targetScale      ?? 1) - s.scale)      * 0.1;
      s.opacity    = s.opacity    + ((s.targetOpacity    ?? 1) - s.opacity)    * 0.1;
      s.sideOffset = (s.sideOffset ?? 0) + ((s.targetSideOffset ?? 0) - (s.sideOffset ?? 0)) * 0.1;
      s.item.style.transform = `scale(${s.scale}) translateX(${s.sideOffset}px)`;
      s.item.style.opacity   = s.opacity.toString();
    }

    const isHidden = s.opacity < 0.01 && (s.targetOpacity ?? 0) < 0.01;
    if (isHidden) return;

    const wobbleY = isCenter ? Math.sin(time * 0.7) * 0.07 : (i < currentIdx ? 0.1 : -0.1);
    const wobbleX = isCenter ? Math.sin(time * 0.45) * 0.04 : 0;
    s.mesh.rotation.y += (s.baseRotY + wobbleY - s.mesh.rotation.y) * 0.05;
    s.mesh.rotation.x += (s.baseRotX + wobbleX - s.mesh.rotation.x) * 0.05;

    if (isCenter) s.mesh.position.y = Math.sin(time * 1.4) * 0.07;
    else          s.mesh.position.y += (0 - s.mesh.position.y) * 0.05;

    const w = s.item.clientWidth  || 280;
    // A 280px queda igual que antes (280 - 18 = 262); en discos más pequeños
    // (móvil) se resta en proporción para que no salgan más estirados
    const h = Math.max(Math.round((s.item.clientHeight || 280) * 262 / 280), 80);
    if (s.lastW !== w || s.lastH !== h) {
      s.lastW = w;
      s.lastH = h;
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    s.renderer.render(s.scene, s.camera);
  });

  if (insertAnimPlaying && activeInsertAnim) {
    activeInsertAnim.mixer.update(dt);
    activeInsertAnim.renderer.render(activeInsertAnim.scene, activeInsertAnim.camera);
  }

  // La PSP solo se dibuja cuando se ve (o está entrando/saliendo).
  // El tamaño lo gestiona layoutPSP() al redimensionar; antes se
  // comparaba con devicePixelRatio sin limitar y en móviles con DPR 3
  // se recreaba el buffer en CADA frame.
  if (pspRenderer && pspModel && appState !== 'carousel') {
    pspRenderer.render(pspScene, pspCamera);
  }
}