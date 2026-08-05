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

/* ═══ CONSTANTES ═══ */
const ITEM_W = 380;   

/* ═══ ESTADO ═══ */
let currentIdx  = 0;
let trackOffset = 0;        
let appState    = 'carousel';
let umdScenes   = [];
let umdTemplate = null;
let pspGLTF     = null;
let pspRenderer = null, pspScene = null, pspCamera = null, pspModel = null;
let modelsReady = 0;
let clockTimer  = null;

/* inserción */
let insertingScene = null;  

/* inserción — animación real vía Blender (.glb + AnimationMixer) */
let insertAnimGLTF     = null;
let insertAnimCanvas   = null;
let insertAnimRenderer = null;
let insertAnimScene    = null;
let insertAnimCamera   = null;
let insertMixer        = null;
let insertAction       = null;
let insertAnimReady    = false;
let insertAnimPlaying  = false;

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
}

/* ═══ LOADING ═══ */
let fakePct = 0;
const fakeTimer = setInterval(() => {
  fakePct = Math.min(fakePct + Math.random() * 10, 80);
  if (DOM.loadBar) DOM.loadBar.style.width = fakePct + '%';
}, 180);

function modelLoaded() {
  modelsReady++;
  if (DOM.loadBar) DOM.loadBar.style.width = (80 + modelsReady * 7) + '%';
  if (modelsReady >= 3) {
    clearInterval(fakeTimer);
    if (DOM.loadBar) DOM.loadBar.style.width = '100%';
    setTimeout(init, 350);
  }
}

/* ═══ GLTF LOADER ═══ */
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('models/sony_psp.glb',
  g => { pspGLTF = g; modelLoaded(); }, undefined,
  () => { pspGLTF = null; modelLoaded(); });
gltfLoader.load('models/psp_umd.glb',
  g => { umdTemplate = g.scene; modelLoaded(); }, undefined,
  () => { umdTemplate = null; modelLoaded(); });
gltfLoader.load('models/insert_anim.glb',
  g => { insertAnimGLTF = g; setupInsertAnimScene(); modelLoaded(); }, undefined,
  () => { insertAnimGLTF = null; modelLoaded(); });

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
    if (umdTemplate) {
      mesh = umdTemplate.clone();

      const box0  = new THREE.Box3().setFromObject(mesh);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxD  = Math.max(size0.x, size0.y, size0.z);
      const sc    = 4.2 / maxD;
      mesh.scale.setScalar(sc);

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
          m.color.lerp(col, 0.4);
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
    const targetScale   = dist===0 ? 1.18 : dist===1 ? 1 : 0.9;
    const targetOpacity = dist===0 ? 1    : dist===1 ? 0.9 : 0;
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

/* ═══ SETUP INSERT ANIM ═══ */
function setupInsertAnimScene() {
  if (!insertAnimGLTF) return;

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

  insertAnimScene  = new THREE.Scene();
  insertAnimCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  insertAnimCamera.position.set(0, 0, 8);
  insertAnimCamera.lookAt(0, 0, 0);

  insertAnimScene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const kl = new THREE.DirectionalLight(0xffffff, 2.2); kl.position.set(5, 8, 7); insertAnimScene.add(kl);
  const fl = new THREE.DirectionalLight(0x99aaff, 0.5); fl.position.set(-5, -2, 4); insertAnimScene.add(fl);

  const root = insertAnimGLTF.scene;
  root.scale.setScalar(INSERT_ANIM_SCALE);
  root.position.set(INSERT_ANIM_OFFSET[0], INSERT_ANIM_OFFSET[1], INSERT_ANIM_OFFSET[2]);
  insertAnimScene.add(root);

  insertMixer = new THREE.AnimationMixer(root);
  const clip = insertAnimGLTF.animations && insertAnimGLTF.animations[0];
  if (clip) {
    insertAction = insertMixer.clipAction(clip);
    insertAction.setLoop(THREE.LoopOnce, 1);
    insertAction.clampWhenFinished = true;
  }
  insertAnimReady = true;
}

function playInsertAnimation(scene, onDone) {
  if (!insertAnimReady || !insertAction) {
    onDone();
    return;
  }

  scene.item.style.opacity = '0';

  const rect  = scene.item.getBoundingClientRect();
  const baseW = Math.max(rect.width, 1);
  const baseH = Math.max(rect.height, 1);

  const mult = 3;
  const w = baseW * mult;
  const h = baseH * mult;
  const left = rect.left - baseW;
  const top  = rect.top  - baseH;

  Object.assign(insertAnimCanvas.style, {
    left:    left + 'px',
    top:     top  + 'px',
    width:   w + 'px',
    height:  h + 'px',
    opacity: '1',
  });
  insertAnimRenderer.setSize(w, h, false);
  insertAnimCamera.aspect = w / h;
  insertAnimCamera.position.set(0, 0, 8 * mult);
  insertAnimCamera.updateProjectionMatrix();

  insertAction.stop();
  insertAction.reset();
  insertAction.timeScale = INSERT_ANIM_TIMESCALE;
  insertAction.play();
  insertAnimPlaying = true;

  const onFinished = (e) => {
    if (e.action !== insertAction) return;
    insertMixer.removeEventListener('finished', onFinished);
    insertAnimPlaying = false;
    insertAnimCanvas.style.opacity = '0';
    onDone();
  };
  insertMixer.addEventListener('finished', onFinished);
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
    if (insertAnimCanvas) insertAnimCanvas.style.opacity = '0';
    insertAnimPlaying = false;
    if (insertAction) insertAction.stop();

    if (DOM.bottomUi)         DOM.bottomUi.classList.remove('hiding');
    if (DOM.header)           DOM.header.classList.remove('hiding');
    if (DOM.labelSelect)      DOM.labelSelect.classList.remove('hiding');
    if (DOM.gameNameDisplay)  DOM.gameNameDisplay.classList.remove('hiding');
    if (DOM.gameGenreDisplay) DOM.gameGenreDisplay.classList.remove('hiding');
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

    const PSP_TARGET_SIZE = 15; 

    const sc = PSP_TARGET_SIZE / maxD;
    pspModel.scale.setScalar(sc);
    pspModel.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(sc));
    pspModel.rotation.set(0, 0, 0);
    pspModel.traverse(n => { if(n.isMesh){ n.castShadow = true; n.receiveShadow = true; } });
  } else {
    pspModel = makeFallbackPSP();
  }
  pspScene.add(pspModel);
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

    // También rellenar título y género en la página de info
    const titleInfo = document.getElementById('sg-title-info');
    const genreInfo = document.getElementById('sg-genre-info');
    if (titleInfo) titleInfo.textContent = game.title;
    if (genreInfo) {
      genreInfo.textContent = game.genre;
      genreInfo.style.color = game.accentColor;
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
  if(e.key==='Enter'  && appState==='carousel') startInsert();
  if(e.key==='Escape' && appState==='psp')      goBack();
});

window.addEventListener('resize', () => {
  if (appState === 'carousel') { 
    trackOffset = centeredOffset(currentIdx); 
    applyTrackTransform(trackOffset); 
  }
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
    const h = Math.max((s.item.clientHeight || 280) - 18, 80);
    if (s.lastW !== w || s.lastH !== h) {
      s.lastW = w;
      s.lastH = h;
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    s.renderer.render(s.scene, s.camera);
  });

  if (insertAnimPlaying && insertMixer) {
    insertMixer.update(dt);
    insertAnimRenderer.render(insertAnimScene, insertAnimCamera);
  }

  if (pspRenderer && pspModel && DOM.pspCanvas) {
    const W = DOM.pspCanvas.clientWidth;
    const H = DOM.pspCanvas.clientHeight;
    if (W > 0 && H > 0) {
      if (pspRenderer.domElement.width !== Math.round(W * devicePixelRatio)) {
        pspRenderer.setSize(W, H, false);
        pspCamera.aspect = W / H;
        pspCamera.updateProjectionMatrix();
      }
      pspRenderer.render(pspScene, pspCamera);
    }
  }
}