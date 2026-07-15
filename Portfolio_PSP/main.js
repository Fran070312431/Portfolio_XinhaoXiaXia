/* PSP PORTFOLIO — main.js */

/* ▼▼▼ EDITA TUS JUEGOS ▼▼▼ */
const GAMES = [
  { title:"Project Alpha",  genre:"Action RPG",       year:"2024", desc:"Mundo abierto de fantasía oscura. Combate en tiempo real, árboles de habilidades procedurales y más de 40 finales distintos.", tags:["Unity","C#","Solo Dev","6 meses"],    discColor:"#1a3a6a", accentColor:"#4a88cc" },
  { title:"Neon Drift",     genre:"Racing",            year:"2023", desc:"Carreras futuristas en ciudad cyberpunk generada proceduralmente. Físicas de vehículo completamente personalizadas.", tags:["Unreal 5","Blueprints","Game Jam"],      discColor:"#2a0a4a", accentColor:"#aa44ff" },
  { title:"Hollow Root",    genre:"Puzzle Platformer", year:"2023", desc:"Plataformas 2D con mecánicas de manipulación de gravedad. Arte pixel art hecho a mano y banda sonora original.", tags:["Godot 4","GDScript","Pixel Art"],         discColor:"#0a3a1a", accentColor:"#33cc88" },
  { title:"Sector 7",       genre:"Roguelite",         year:"2022", desc:"Shooter top-down con generación procedural de niveles y más de 200 combinaciones de armas y habilidades.", tags:["Unity","Procgen","Game Jam"],              discColor:"#3a1a0a", accentColor:"#ee6622" },
  { title:"Memoria",        genre:"Narrative",         year:"2022", desc:"Juego narrativo sobre pérdida y recuerdos. Exploración en primera persona con diálogos ramificados.", tags:["Twine","Ink","Narrative Design"],           discColor:"#2a0a2a", accentColor:"#cc44aa" }
];
/* ▲▲▲ FIN EDICIÓN ▲▲▲ */

/* ═══════════════════════════════════════════════
   AJUSTE MANUAL — si el cartucho sigue saliendo
   de espaldas o de lado, pon aquí la rotación
   correcta a mano (en radianes) y pondrá
   FORCE_UMD_ROTATION = true para usarla siempre
   en vez de la detección automática.
   Prueba valores como [0,0,0], [0,Math.PI,0],
   [Math.PI/2,0,0], etc. hasta que se vea de frente.
═══════════════════════════════════════════════ */
const FORCE_UMD_ROTATION = false;
const MANUAL_UMD_ROTATION = [0, Math.PI, 0];

/* ═══════════════════════════════════════════════
   AJUSTE ANIMACIÓN DE INSERCIÓN (Blender .glb)
   Si al reproducir insert_anim.glb el cartucho se
   ve demasiado grande/pequeño o descentrado respecto
   al hueco donde estaba el item del carrusel, toca
   estos dos valores a mano.
═══════════════════════════════════════════════ */
const INSERT_ANIM_SCALE  = 60;          // factor de escala del modelo animado
const INSERT_ANIM_OFFSET = [0, 0, 0];  // desplazamiento x,y,z tras escalar
const INSERT_ANIM_TIMESCALE = 0.9;     // velocidad de la animación (1 = normal)
const INSERT_ANIM_HOLD_MS   = 1000;    // pausa tras la animación antes de cortar a la PSP

/* ═══ CONSTANTES ═══ */
const ITEM_W      = 280;   // igual que .umd-item width en CSS
const LERP_SPEED  = 0.10;  // suavidad del scroll del carousel

/* ═══ ESTADO ═══ */
let currentIdx  = 0;
let targetIdx   = 0;        // para lerp suave
let trackOffset = 0;        // offset actual (animado)
let appState    = 'carousel';
let umdScenes   = [];
let umdTemplate = null;
let pspGLTF     = null;
let pspRenderer = null, pspScene = null, pspCamera = null, pspModel = null;
let modelsReady = 0;

/* inserción */
let insertingScene = null;  // umdScene que se está insertando (para ocultar/restaurar su canvas 2D)

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

/* ═══ LOADING ═══ */
const loadBar = document.querySelector('.load-bar');
let fakePct = 0;
const fakeTimer = setInterval(() => {
  fakePct = Math.min(fakePct + Math.random() * 10, 80);
  loadBar.style.width = fakePct + '%';
}, 180);

function modelLoaded() {
  modelsReady++;
  loadBar.style.width = (80 + modelsReady * 7) + '%';
  if (modelsReady >= 3) {
    clearInterval(fakeTimer);
    loadBar.style.width = '100%';
    setTimeout(init, 350);
  }
}

/* ═══ GLTF ═══ */
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
    // click
    const cb=ctx.createBuffer(1,2048,sr); const cd=cb.getChannelData(0);
    for(let i=0;i<2048;i++) cd[i]=(Math.random()*2-1)*Math.exp(-i/180);
    const cs=ctx.createBufferSource(); cs.buffer=cb;
    const cg=ctx.createGain(); cg.gain.value=0.85;
    cs.connect(cg); cg.connect(ctx.destination); cs.start();
  } catch(e) {}
}

/* ═══ INIT ═══ */
function init() {
  buildCarousel();
  buildPSP();
  buildDots();
  // Centrar inmediatamente sin animación
  trackOffset = centeredOffset(0);
  applyTrackTransform(trackOffset);
  updateLabels();
  updateDots();
  updateScales();
  document.getElementById('loading').classList.add('done');
  requestAnimationFrame(animLoop);
}

/* ═══════════════════════════════════════════════
   CENTRADO: el offset que pone item[idx] en el
   centro de #carousel-outer
═══════════════════════════════════════════════ */
function centeredOffset(idx) {
  const outerW = document.getElementById('carousel-outer').offsetWidth;
  // Centro del outer - posición del centro del item idx
  return (outerW / 2) - (idx * ITEM_W) - (ITEM_W / 2);
}

function applyTrackTransform(offset) {
  document.getElementById('carousel-track').style.transform = `translateX(${offset}px)`;
}

/* ═══ BUILD CAROUSEL ═══ */
const trackEl = document.getElementById('carousel-track');

function buildCarousel() {
  umdScenes = [];
  trackEl.innerHTML = '';

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
    trackEl.appendChild(item);

    /* ── Three.js micro-escena ── */
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const kl = new THREE.DirectionalLight(0xffffff, 2.2); kl.position.set(5, 8, 7); scene.add(kl);
    const fl = new THREE.DirectionalLight(0x99aaff, 0.5); fl.position.set(-5, -2, 4); scene.add(fl);
    const rl = new THREE.DirectionalLight(0xffeedd, 0.35); rl.position.set(0, -6, -5); scene.add(rl);
    const glowLight = new THREE.PointLight(parseInt(game.accentColor.replace('#',''), 16), 1.0, 9);
    glowLight.position.set(0, 0, 3); scene.add(glowLight);

    /* ── Mesh UMD ── */
    let mesh;
    if (umdTemplate) {
      mesh = umdTemplate.clone();

      // Normalizar tamaño (escala provisional, el centrado real se hace después de rotar)
      const box0  = new THREE.Box3().setFromObject(mesh);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxD  = Math.max(size0.x, size0.y, size0.z);
      const sc    = 4.2 / maxD;
      mesh.scale.setScalar(sc);

      // ── ROTACIÓN FRONTAL ──
      if (FORCE_UMD_ROTATION) {
        mesh.rotation.set(MANUAL_UMD_ROTATION[0], MANUAL_UMD_ROTATION[1], MANUAL_UMD_ROTATION[2]);
      } else {
        // 1) Encontrar el eje "plano" probando 8 orientaciones
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

        // 2) Decidir signo correcto comparando relieve hacia +Z en ambas caras
        const candidateA = bestRot;
        const candidateB = [bestRot[0], bestRot[1] + Math.PI, bestRot[2]];

        function frontZBias(rot) {
          mesh.rotation.set(rot[0],rot[1],rot[2]);
          mesh.updateMatrixWorld(true);
          let totalZ = 0, count = 0;
          mesh.traverse(n => {
            if (n.isMesh && n.geometry && n.geometry.attributes.position) {
              const posAttr = n.geometry.attributes.position;
              const v = new THREE.Vector3();
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

      // ── RECENTRADO REAL ──
      // Importante: se hace DESPUÉS de fijar la rotación definitiva,
      // porque el centro de masa cambia al rotar. Si centramos antes
      // de rotar, el disco queda descuadrado (efecto "movido a la izquierda").
      mesh.updateMatrixWorld(true);
      const box1    = new THREE.Box3().setFromObject(mesh);
      const center1 = box1.getCenter(new THREE.Vector3());
      mesh.position.sub(center1);

      // Tint del color del juego
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
      // Estado de escala/opacidad para lerp
      scale: 1, opacity: 1,
      baseRotX: mesh.rotation.x,
      baseRotY: mesh.rotation.y,
    });
  });
}

function makeFallbackUMD(game) {
  const g = new THREE.Group();
  const col = new THREE.Color(game.discColor);
  // Carcasa
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9,1.9,0.26,64),
    new THREE.MeshStandardMaterial({color:0x202020,metalness:0.3,roughness:0.5}));
  shell.rotation.x = Math.PI/2; g.add(shell);
  // Disco
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5,1.5,0.09,64),
    new THREE.MeshStandardMaterial({color:col,metalness:0.7,roughness:0.15}));
  disc.rotation.x = Math.PI/2; disc.position.z = 0.1; g.add(disc);
  // Anillos iridiscentes
  for (let r=0.3; r<1.45; r+=0.09) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r,0.005,8,64),
      new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.06,metalness:0.9}));
    ring.position.z = 0.12; g.add(ring);
  }
  // Agujero
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15,0.15,0.12,32),
    new THREE.MeshStandardMaterial({color:0x080808}));
  hole.rotation.x = Math.PI/2; hole.position.z = 0.11; g.add(hole);
  // Borde
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
  document.getElementById('game-name-display').textContent  = g.title;
  document.getElementById('game-genre-display').textContent = g.genre;
}

/* ═══ DOTS ═══ */
function buildDots() {
  const c = document.getElementById('dots-nav'); c.innerHTML = '';
  GAMES.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'nav-dot' + (i === 0 ? ' active' : '');
    b.onclick = () => { if(appState!=='carousel') return; currentIdx=i; updateLabels(); updateDots(); };
    c.appendChild(b);
  });
}

function updateDots() {
  document.querySelectorAll('.nav-dot').forEach((d,i) => d.classList.toggle('active', i===currentIdx));
}

/* ═══ ESCALAS (JS puro, sin clases CSS) ═══ */
function updateScales() {
  umdScenes.forEach((s, i) => {
    const dist = Math.abs(i - currentIdx);
    // Ajuste: Central (1.18), Laterales (0.9, un poco más grandes que 0.78), Resto (0)
    const targetScale   = dist === 0 ? 1.18 : dist === 1 ? 0.9 : 0; 
    const targetOpacity = dist === 0 ? 1    : dist === 1 ? 0.7 : 0; // Ajustamos opacidad también
    s.targetScale   = targetScale;
    s.targetOpacity = targetOpacity;
  });
}

/* ═══════════════════════════════════════════════
   ANIMACIÓN DE INSERCIÓN — escena dedicada que
   reproduce el clip horneado en insert_anim.glb
   una sola vez (AnimationMixer + LoopOnce).
═══════════════════════════════════════════════ */
function setupInsertAnimScene() {
  if (!insertAnimGLTF) return;

  // Canvas flotante creado a mano (no hace falta tocar el HTML),
  // posicionado en pantalla justo encima del item que se pulsa.
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
  } else {
    console.warn('insert_anim.glb no contiene ninguna animación (AnimationClip).');
  }

  insertAnimReady = true;
}

/**
 * Reproduce la animación de inserción sobre el item indicado
 * y llama a onDone() cuando termina (una sola pasada).
 */
function playInsertAnimation(scene, onDone) {
  if (!insertAnimReady || !insertAction) {
    // No hay animación cargada todavía: seguir sin bloquear el flujo
    onDone();
    return;
  }

  // Ocultamos el canvas 2D del item — lo sustituye la animación 3D real
  scene.item.style.opacity = '0';

  const rect  = scene.item.getBoundingClientRect();
  const baseW = Math.max(rect.width, 1);
  const baseH = Math.max(rect.height, 1);

  // Damos más "aire" alrededor del item para que el cartucho pueda
  // subir/bajar sin que el canvas lo recorte, manteniendo el tamaño
  // aparente igual (compensamos alejando la cámara el mismo factor).
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

/* ═══ INSERTAR ═══ */
function startInsert() {
  if (appState !== 'carousel') return;
  appState = 'inserting';
  playPSPSound();

  // Ocultamos los botones en paralelo — ya no esperamos a que
  // terminen para arrancar la animación, así reacciona al instante.
  document.getElementById('bottom-ui').classList.add('hiding');

  insertingScene = umdScenes[currentIdx];

  playInsertAnimation(insertingScene, () => {
    // Pequeña pausa tras terminar la inserción antes de cortar a la
    // PSP, para que no sea un cambio brusco de plano.
    setTimeout(() => {
      document.getElementById('view-carousel').classList.add('hiding');
      document.getElementById('view-psp').classList.add('visible');
      setTimeout(() => {
        bootScreen(GAMES[currentIdx]);
        document.getElementById('btn-back').classList.add('visible');
        appState = 'psp';
      }, 900);
    }, INSERT_ANIM_HOLD_MS);
  });
}

function goBack() {
  if (appState !== 'psp') return;
  appState = 'inserting';
  document.getElementById('btn-back').classList.remove('visible');
  document.getElementById('screen-game').classList.remove('active');
  document.getElementById('screen-idle').style.display = 'flex';
  document.getElementById('view-psp').classList.remove('visible');

  setTimeout(() => {
    // Reset estado de inserción
    if (insertingScene) {
      insertingScene.item.style.opacity   = '';
      insertingScene.item.style.transform = '';
      insertingScene = null;
    }
    if (insertAnimCanvas) insertAnimCanvas.style.opacity = '0';
    insertAnimPlaying = false;
    if (insertAction) insertAction.stop();

    document.getElementById('bottom-ui').classList.remove('hiding');
    document.getElementById('view-carousel').classList.remove('hiding');
    updateLabels(); updateDots();
    appState = 'carousel';
  }, 700);
}

/* ═══ PSP 3D ═══ */

function buildPSP() {
  const cv = document.getElementById('psp-canvas');
  pspRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
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
  const kl=new THREE.DirectionalLight(0xffffff,3.2); kl.position.set(8,14,10); kl.castShadow=true; kl.shadow.mapSize.set(2048,2048); pspScene.add(kl);
  const fl=new THREE.DirectionalLight(0x8899ff,0.7); fl.position.set(-10,3,-6); pspScene.add(fl);
  const rl=new THREE.DirectionalLight(0xffeedd,0.5); rl.position.set(3,-8,-8); pspScene.add(rl);
  const bl=new THREE.DirectionalLight(0xffffff,0.3); bl.position.set(0,-10,5); pspScene.add(bl);

  if (pspGLTF) {
    pspModel = pspGLTF.scene;
    const box  = new THREE.Box3().setFromObject(pspModel);
    const maxD = Math.max(...box.getSize(new THREE.Vector3()).toArray());

    const PSP_TARGET_SIZE = 13; // ← sube/baja para cambiar tamaño

    const sc = PSP_TARGET_SIZE / maxD;
    pspModel.scale.setScalar(sc);
    pspModel.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(sc));
    pspModel.rotation.set(0, 0, 0);
    pspModel.traverse(n => { if(n.isMesh){n.castShadow=true;n.receiveShadow=true;} });

    // ── Detectar la malla de pantalla ──
    // Buscamos el mesh más ancho en X y plano en Z (la pantalla LCD)
    // entre todos los meshes del modelo
    pspModel.updateMatrixWorld(true);
    let screenMesh = null, bestScore = -Infinity;
    pspModel.traverse(n => {
      if (!n.isMesh) return;
      const b = new THREE.Box3().setFromObject(n);
      const s = b.getSize(new THREE.Vector3());
      // Pantalla: ancha en X, alta en Y, delgada en Z, y en la mitad delantera del modelo
      const score = (s.x * s.y) / (s.z + 0.001);
      if (score > bestScore) { bestScore = score; screenMesh = n; }
    });

    if (screenMesh) {
      pspScreenBox3D = new THREE.Box3().setFromObject(screenMesh);
      console.log('✅ Pantalla detectada, bbox:', pspScreenBox3D);
    } else {
      // Fallback: usar la mitad superior-central de la PSP
      const fullBox = new THREE.Box3().setFromObject(pspModel);
      const c = fullBox.getCenter(new THREE.Vector3());
      const s = fullBox.getSize(new THREE.Vector3());
      pspScreenBox3D = new THREE.Box3(
        new THREE.Vector3(c.x - s.x * 0.28, c.y - s.y * 0.1, c.z + s.z * 0.3),
        new THREE.Vector3(c.x + s.x * 0.28, c.y + s.y * 0.35, c.z + s.z * 0.5)
      );
    }

  } else {
    pspModel = makeFallbackPSP();
  }
  pspScene.add(pspModel);
}

// Proyecta un punto 3D a coordenadas de píxel en el canvas
function project3D(v3, camera, canvas) {
  const v = v3.clone().project(camera);
  return {
    x: (v.x + 1) / 2 * canvas.clientWidth,
    y: (1 - (v.y + 1) / 2) * canvas.clientHeight
  };
}

// Actualiza la posición del overlay HTML para que coincida exactamente
// con la pantalla 3D del modelo PSP
function updateScreenOverlay() {
  const screen = document.getElementById('psp-screen');
  const cv     = document.getElementById('psp-canvas');
  if (!pspScreenBox3D || !pspCamera || cv.clientWidth === 0) return;

  const min = pspScreenBox3D.min;
  const max = pspScreenBox3D.max;

  // Proyectar las 4 esquinas de la bbox de la pantalla
  const tl = project3D(new THREE.Vector3(min.x, max.y, max.z), pspCamera, cv);
  const br = project3D(new THREE.Vector3(max.x, min.y, max.z), pspCamera, cv);

  const rect = cv.getBoundingClientRect();
  const left   = rect.left + tl.x;
  const top    = rect.top  + tl.y;
  const width  = br.x - tl.x;
  const height = br.y - tl.y;

  screen.style.left   = left   + 'px';
  screen.style.top    = top    + 'px';
  screen.style.width  = width  + 'px';
  screen.style.height = height + 'px';
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
  const idle = document.getElementById('screen-idle');
  const gscr = document.getElementById('screen-game');
  const pscr = document.getElementById('psp-screen');
  const body = document.querySelector('.sg-body');
  if (body) body.scrollTop = 0;

  idle.style.display = 'flex';
  gscr.classList.remove('active');
  pscr.classList.add('screen-booting');

  setTimeout(() => {
    pscr.classList.remove('screen-booting');
    idle.style.display = 'none';
    gscr.classList.add('active');

    // Pasar color del juego como CSS var al sg-body para el gradiente de fondo
    if (body) body.style.setProperty('--game-color', game.discColor);

    document.getElementById('sg-title').textContent = game.title;

    const genreEl = document.getElementById('sg-genre');
    genreEl.textContent = game.genre;
    genreEl.style.color = game.accentColor;

    document.getElementById('sg-year').textContent = game.year;
    document.getElementById('sg-desc').textContent = game.desc;
    document.getElementById('sg-tags').innerHTML = game.tags
      .map(t => `<span class="sg-tag" style="border-color:${game.accentColor}33;color:${game.accentColor}cc">${t}</span>`)
      .join('');

    updateClock();
  }, 750);
}
function updateClock() {
  const n=new Date(), el=document.getElementById('sg-time');
  if(el) el.textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
  if(appState==='psp') setTimeout(updateClock,30000);
}

/* ═══ EVENTOS ═══ */
document.getElementById('arr-left').onclick   = () => navigate(-1);
document.getElementById('arr-right').onclick  = () => navigate(1);
document.getElementById('btn-insert').onclick = startInsert;
document.getElementById('btn-back').onclick   = goBack;
window.addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft')  navigate(-1);
  if(e.key==='ArrowRight') navigate(1);
  if(e.key==='Enter'  && appState==='carousel') startInsert();
  if(e.key==='Escape' && appState==='psp')      goBack();
});
window.addEventListener('resize', () => {
  if (appState === 'carousel') { trackOffset = centeredOffset(currentIdx); applyTrackTransform(trackOffset); }

});
let tx=null;
document.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',  e=>{
  if(tx===null) return;
  const dx=e.changedTouches[0].clientX-tx; tx=null;
  if(Math.abs(dx)>50) navigate(dx<0?1:-1);
});

/* ═══════════════════════════════════════════════
   ANIMATION LOOP
═══════════════════════════════════════════════ */
let time = 0;
const clock = new THREE.Clock();

function animLoop() {
  requestAnimationFrame(animLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  // ── Carousel track: lerp suave hacia centeredOffset(currentIdx) ──
  if (appState === 'carousel' || appState === 'inserting') {
    const target = centeredOffset(currentIdx);
    trackOffset += (target - trackOffset) * 0.1;
    applyTrackTransform(trackOffset);
  }

  // ── Escalar items ──
  updateScales();

  umdScenes.forEach((s, i) => {
    if (!s.mesh) return;
    const isCenter = i === currentIdx;

    // ─ Lerp escala y opacidad del item DOM ─
    // (si este item es el que está reproduciendo la animación de
    //  inserción, su canvas 2D está oculto por playInsertAnimation,
    //  así que no lo pisamos)
    if (!(insertAnimPlaying && insertingScene === s)) {
      s.scale   = s.scale   + ((s.targetScale   ?? 1) - s.scale)   * 0.1;
      s.opacity = s.opacity + ((s.targetOpacity ?? 1) - s.opacity) * 0.1;
      s.item.style.transform = `scale(${s.scale})`;
      s.item.style.opacity   = s.opacity.toString();
    }

    // ─ Rotación flotante normal ─
    const wobbleY = isCenter ? Math.sin(time * 0.7) * 0.07 : (i < currentIdx ? 0.1 : -0.1);
    const wobbleX = isCenter ? Math.sin(time * 0.45) * 0.04 : 0;
    s.mesh.rotation.y += (s.baseRotY + wobbleY - s.mesh.rotation.y) * 0.05;
    s.mesh.rotation.x += (s.baseRotX + wobbleX - s.mesh.rotation.x) * 0.05;

    // Elevación flotante central
    if (isCenter) s.mesh.position.y = Math.sin(time * 1.4) * 0.07;
    else          s.mesh.position.y += (0 - s.mesh.position.y) * 0.05;

    // ─ Render ─
    const w = s.item.clientWidth  || 280;
    const h = Math.max((s.item.clientHeight || 280) - 18, 80);
    if (s.renderer.domElement.width !== Math.round(w * devicePixelRatio)) {
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    s.renderer.render(s.scene, s.camera);
  });

  // ── Animación de inserción (glb) ──
  if (insertAnimPlaying && insertMixer) {
    insertMixer.update(dt);
    insertAnimRenderer.render(insertAnimScene, insertAnimCamera);
  }

  // ── PSP ──
  if (pspRenderer && pspModel) {
    const cv = document.getElementById('psp-canvas');
    const W = cv.clientWidth, H = cv.clientHeight;
    if (W > 0 && H > 0) {
      if (pspRenderer.domElement.width !== W || pspRenderer.domElement.height !== H) {
        pspRenderer.setSize(W, H, false);
        pspCamera.aspect = W / H;
        pspCamera.updateProjectionMatrix();
      }
      // PSP completamente estática y plana — sin rotación animada
      pspRenderer.render(pspScene, pspCamera);

    }
  }
}