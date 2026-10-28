// ==========================================
// 🏥 MINI-JEU MÉDICAL - STREAMELEMENTS
// ==========================================

// IMAGES
const IMAGES = {
  TOP: "https://cdn.streamelements.com/uploads/01m588nq4zpbxypebmyd8twfrm.webp",
  DESHYDRATEE: "https://cdn.streamelements.com/uploads/01m588rec4h4yq7yncyr2x2qgc.webp",
  ANASARQUE: "https://cdn.streamelements.com/uploads/01m588r46sxsvg9pytfnepj8k0.webp",
  HYPERTHERMIE: "https://cdn.streamelements.com/uploads/01m588rppt6ej3pqwzrrczhjmc.webp",
  ERUPTION: "https://cdn.streamelements.com/uploads/01m588qvg1rb0daxmf3krzcts6.webp",
  ETOUFFEMENT: "https://cdn.streamelements.com/uploads/01m588pvtx05yxm8hx5kddvd4v.webp",
  INTUBEE_EVEILLEE: "https://cdn.streamelements.com/uploads/01m588qhxwsga6rncj4g0bvz8g.webp",
  INTUBEE_SEDATEE: "https://cdn.streamelements.com/uploads/01m588p2erva65r8kfz2y2zkdg.webp",
  ARRET_ASYSTOLIE: "https://cdn.streamelements.com/uploads/01m588pdjzf9s85r1bjaak6t16.webp"
};

// ==========================================
// ⚙️ CONFIGURATION
// ==========================================

const HYDRO_MAX = 200;
const HYDRO_CASE = 10;
const ANASARQUE_SEUIL = 150;
const ANASARQUE_SORTIE = 120;
const THERMO_MIN = 35;
const THERMO_MAX = 42;
const WAVE_SPEED = 80;
const WAVE_GAP = 40;
const WAVE_FADE = 15;

// ==========================================
// ÉTAT DE LA PATIENTE
// ==========================================

const state = {
  hp: 100,
  hydro: 80,
  temp: 37,
  anasarque: false,
  eruption: false,
  ettouffement: false,
  intubee: false,
  sedatee: false,
  arret: false
};

let gameInterval = null;

// ==========================================
// COMMANDES ET ALIAS
// ==========================================

function normalizeCommand(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .split(/\s+/)[0]
    .replace(/[!?.,;:]+$/, "");
}

const COMMANDS = {
  eau: [
    "!eau", "!boire", "!hydrater", "!hydratation"
  ],

  perfusion: [
    "!perfusion", "!perf"
  ],

  diuretique: [
    "!lasilix", "!lasix", "!diuretique",
    "!diuretik", "!diurese"
  ],

  doliprane: [
    "!doliprane", "!doli", "!paracetamol",
    "!paracetaml"
  ],

  creme: [
    "!creme", "!cream", "!antihistaminique",
    "!antihistaminik", "!soignereruption"
  ],

  heimlich: [
    "!heimlich", "!heimlik", "!claque",
    "!deboucher", "!desobstruer",
    "!etouffement", "!etouffe"
  ],

  intuber: [
    "!intuber", "!intubation", "!intube",
    "!intubee", "!tube"
  ],

  sedater: [
    "!hypnovel", "!sedater", "!sedate",
    "!sedation", "!endormir", "!dormir", "!hypno"
  ],

  reveiller: [
    "!reveiller", "!reveil", "!reveile",
    "!reveille", "!reveillee", "!stopsedation"
  ],

  extuber: [
    "!extuber", "!extubation", "!extube",
    "!retirertube", "!retirertuyau"
  ],

  cpr: [
    "!mace", "!cpr", "!massage", "!reanimer",
    "!reanimation", "!massagecardiaque", "!rcr"
  ],

  manger: [
    "!manger", "!repas", "!nourrir",
    "!nourriture", "!miam", "!mange"
  ],

  sandwich: [
    "!sandwich", "!sandwitch", "!sandwiche"
  ],

  cacahuetes: [
    "!cacahuete", "!cacahuetes", "!cacahouete",
    "!cacahouetes", "!cacahuette", "!cacahuettes",
    "!arachide", "!arachides", "!peanut", "!peanuts"
  ]
};

function matchesCommand(message, command) {
  return COMMANDS[command].includes(message);
}

// ==========================================
// JOURNAL DES ÉVÉNEMENTS
// ==========================================

// Le journal défile sur l'écran : plus le message est long, plus il défile longtemps.
function showLog(message) {
  const log = document.getElementById("log-box");
  if (!log) return;

  const text = lcdText(message);
  const entry = document.createElement("div");
  entry.textContent = text;
  entry.style.animationDuration = 4 + text.length * 0.12 + "s";
  log.prepend(entry);

  while (log.children.length > 6) {
    log.removeChild(log.lastChild);
  }
}

// ==========================================
// ÉCRAN LCD
// ==========================================

// Un écran LCD n'affiche pas d'emoji : on les retire du texte.
function lcdText(text) {
  return String(text)
    .replace(/[\p{Extended_Pictographic}‍️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Dessine une icône à partir d'une grille de caractères :
// "#" pour un pixel, "." pour rien, toute autre lettre pour un groupe de pixels.
function pixelSvg(rows) {
  const groups = {};

  rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      if (char === ".") return;

      const name = char === "#" ? "contour" : char;
      groups[name] = (groups[name] || "") +
        `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
    });
  });

  const content = Object.entries(groups)
    .map(([name, rects]) => `<g class="px-${name}">${rects}</g>`)
    .join("");

  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${content}</svg>`;
}

const PIXELS = {
  food: [
    "....##...",
    "...#.....",
    ".##.#.##.",
    "#########",
    "#########",
    "#########",
    "#########",
    ".#######.",
    "..##.##.."
  ],
  water: [
    "....#....",
    "....#....",
    "...###...",
    "..#####..",
    ".##.####.",
    ".#.#####.",
    ".#######.",
    "..#####..",
    "...###..."
  ],
  medicine: [
    ".........",
    ".........",
    ".#######.",
    "#...#####",
    "#...#####",
    "#...#####",
    ".#######.",
    ".........",
    "........."
  ],
  cream: [
    "...###...",
    "...###...",
    "..#####..",
    ".#.....#.",
    ".#.###.#.",
    ".#.###.#.",
    ".#.....#.",
    ".#.....#.",
    "..#####.."
  ],
  heimlich: [
    "..#.#.#..",
    ".#######.",
    ".#######.",
    ".#######.",
    "##.#####.",
    "#..#####.",
    "#..####..",
    ".######..",
    "..####..."
  ],
  tube: [
    "....#....",
    "....#....",
    ".##.#.##.",
    "####.####",
    "####.####",
    "####.####",
    "####.####",
    ".##...##.",
    "........."
  ],
  sleep: [
    "...###.##",
    "..##....#",
    ".##....#.",
    ".##...##.",
    ".##......",
    ".##......",
    "..##.....",
    "...###...",
    "........."
  ],
  cpr: [
    ".##...##.",
    "#########",
    "####.####",
    "###...###",
    "####.####",
    ".#######.",
    "..#####..",
    "...###...",
    "....#...."
  ],
  attention: [
    "..#####..",
    ".#.....#.",
    "#...#...#",
    "#...#...#",
    "#...#...#",
    "#.......#",
    "#...#...#",
    ".#.....#.",
    "..#####.."
  ],
  // Cœur de santé : "g" et "d" sont ses moitiés gauche et droite.
  heart: [
    ".##...##.",
    "#gg#.#dd#",
    "#gggdddd#",
    "#gggdddd#",
    ".#ggddd#.",
    "..#gdd#..",
    "...#d#...",
    "....#...."
  ]
};

// Icônes autour de l'écran : allumées quand la patiente en a besoin,
// clignotantes quand c'est urgent, inversées quand un viewer utilise la commande.
const LCD_ICONS = [
  {
    id: "food", row: "top",
    commands: ["manger", "sandwich", "cacahuetes"],
    on: () => state.hp <= 60 && !state.intubee,
    alert: () => state.hp <= 30 && !state.intubee
  },
  {
    id: "water", row: "top",
    commands: ["eau", "perfusion"],
    on: () => state.hydro <= 50,
    alert: () => state.hydro <= 25
  },
  {
    id: "medicine", row: "top",
    commands: ["doliprane", "diuretique"],
    on: () => state.temp >= 38 || state.anasarque,
    alert: () => state.temp >= 39
  },
  {
    id: "cream", row: "top",
    commands: ["creme"],
    on: () => state.eruption,
    alert: () => false
  },
  {
    id: "heimlich", row: "bottom",
    commands: ["heimlich"],
    on: () => state.ettouffement,
    alert: () => state.ettouffement
  },
  {
    id: "tube", row: "bottom",
    commands: ["intuber", "extuber"],
    on: () => state.intubee,
    alert: () => false
  },
  {
    id: "sleep", row: "bottom",
    commands: ["sedater", "reveiller"],
    on: () => state.sedatee,
    alert: () => false
  },
  {
    id: "cpr", row: "bottom",
    commands: ["cpr"],
    on: () => state.arret,
    alert: () => state.arret
  }
];

function buildLcdIcons() {
  for (const icon of LCD_ICONS) {
    const row = document.getElementById("lcd-icons-" + icon.row);
    if (!row) continue;

    const element = document.createElement("span");
    element.id = "lcd-icon-" + icon.id;
    element.className = "lcd-icon";
    element.innerHTML = pixelSvg(PIXELS[icon.id]);
    row.appendChild(element);
  }

  const attention = document.getElementById("lcd-attention");
  if (attention) attention.innerHTML = pixelSvg(PIXELS.attention);

  const drop = document.getElementById("lcd-drop");
  if (drop) drop.innerHTML = pixelSvg(PIXELS.water);
}

function updateLcdIcons(statusClass) {
  for (const icon of LCD_ICONS) {
    // Pendant un arrêt cardiaque, seule la réanimation compte.
    const active = !state.arret || icon.id === "cpr";

    toggleClass("lcd-icon-" + icon.id, "on", active && icon.on());
    toggleClass("lcd-icon-" + icon.id, "alerte", active && icon.alert());
  }

  toggleClass("lcd-attention", "on", statusClass !== "");
  toggleClass("lcd-attention", "alerte", statusClass === "critical");
}

function flashCommandIcon(message) {
  const icon = LCD_ICONS.find((item) =>
    item.commands.some((command) => matchesCommand(message, command))
  );

  if (!icon) return;

  toggleClass("lcd-icon-" + icon.id, "flash", true);
  toggleClass("device-buttons", "presse", true);

  setTimeout(() => {
    toggleClass("lcd-icon-" + icon.id, "flash", false);
    toggleClass("device-buttons", "presse", false);
  }, 1200);
}

// Cinq cœurs de 20 PV, avec des demi-cœurs de 10 PV.
function buildHearts() {
  const container = document.getElementById("hp-hearts");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const heart = document.createElement("span");
    heart.className = "lcd-heart";
    heart.innerHTML = pixelSvg(PIXELS.heart);
    container.appendChild(heart);
  }
}

function setHearts(hp) {
  const container = document.getElementById("hp-hearts");
  const valueElement = document.getElementById("hp-val");
  const halves = Math.ceil(hp / 10);

  if (valueElement) {
    valueElement.textContent = Math.round(hp);
  }

  if (!container) return;

  Array.from(container.children).forEach((heart, index) => {
    const filled = Math.max(0, Math.min(2, halves - index * 2));
    heart.classList.toggle("moitie", filled === 1);
    heart.classList.toggle("plein", filled === 2);
  });
}

// La patiente est redessinée en pixels à partir de son image.
const SPRITE_WIDTH = 64;
const SPRITE_HEIGHT = 56;

function drawSprite() {
  const image = document.getElementById("patient-img");
  const canvas = document.getElementById("patient-sprite");
  if (!image || !canvas || !canvas.getContext || !image.naturalWidth) return;

  const ctx = canvas.getContext("2d");
  const cropWidth = image.naturalWidth * 0.8;
  const cropHeight = Math.min(image.naturalHeight, cropWidth * SPRITE_HEIGHT / SPRITE_WIDTH);
  const cropX = image.naturalWidth * 0.1;
  const cropY = Math.min(image.naturalHeight - cropHeight, image.naturalHeight * 0.04);

  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
}

function startSprite() {
  const image = document.getElementById("patient-img");
  if (!image || !image.addEventListener) return;

  image.addEventListener("load", drawSprite);
}

// L'hydratation s'affiche en segments LCD,
// un segment par tranche de HYDRO_CASE % entamée.
function buildHydroCells() {
  const container = document.getElementById("hydro-cells");
  if (!container) return;

  container.innerHTML = "";

  for (let level = HYDRO_CASE; level <= HYDRO_MAX; level += HYDRO_CASE) {
    const cell = document.createElement("span");
    cell.className = level > ANASARQUE_SEUIL
      ? "hydro-cell zone-surcharge"
      : "hydro-cell";
    container.appendChild(cell);
  }
}

function setHydroCells(hydro) {
  const valueElement = document.getElementById("hydro-val");
  const container = document.getElementById("hydro-cells");

  if (valueElement) {
    valueElement.textContent = Math.round(hydro) + "%";
  }

  if (container) {
    const lit = Math.ceil(hydro / HYDRO_CASE);

    Array.from(container.children).forEach((cell, index) => {
      cell.classList.toggle("on", index < lit);
    });
  }
}

function toggleClass(id, className, active) {
  const element = document.getElementById(id);

  if (element) {
    element.classList.toggle(className, active);
  }
}

// ==========================================
// THERMOMÈTRE
// ==========================================

// Un segment par demi-degré, du plus chaud (en haut) au plus froid.
// Les segments des degrés entiers sont plus larges.
function buildThermometerScale() {
  const scale = document.getElementById("thermo-scale");
  if (!scale) return;

  scale.innerHTML = "";

  for (let temp = THERMO_MAX; temp > THERMO_MIN; temp -= 0.5) {
    const segment = document.createElement("span");
    segment.className = Number.isInteger(temp) ? "thermo-segment major" : "thermo-segment";
    segment.setAttribute("data-temp", temp);
    scale.appendChild(segment);
  }
}

function setThermometer(temp) {
  const valueElement = document.getElementById("temp-val");
  const scale = document.getElementById("thermo-scale");

  if (valueElement) {
    valueElement.textContent = temp.toFixed(1) + "°";
  }

  if (scale) {
    Array.from(scale.children).forEach((segment) => {
      segment.classList.toggle("on", Number(segment.getAttribute("data-temp")) <= temp);
    });
  }
}

// ==========================================
// MONITEUR CARDIAQUE (ONDE DE SANTÉ)
// ==========================================

// Le tracé est mémorisé par colonnes de WAVE_STEP pixels et redessiné à chaque image,
// en basse résolution (un pixel LCD = LCD_PIXEL pixels à l'écran).
const WAVE_STEP = 0.5;
const LCD_PIXEL = 2;

const wave = {
  canvas: null,
  ctx: null,
  points: null,
  head: 0,
  pending: 0,
  beatTime: 0,
  period: 60 / 70,
  last: 0,
  className: null,
  color: "#263321"
};

function gaussian(t, center, width) {
  return Math.exp(-((t - center) ** 2) / (2 * width * width));
}

// Forme d'un battement, t en secondes depuis le début du battement.
// Le complexe QRS garde sa durée, le reste se resserre quand le cœur accélère.
function heartbeatShape(t, period) {
  const k = Math.min(1, period / 0.8);
  const qrs = 0.22 * k;

  return 0.12 * gaussian(t, qrs - 0.12 * k, 0.025 * k)
    - 0.15 * gaussian(t, qrs - 0.02, 0.008)
    + 1.0 * gaussian(t, qrs, 0.012)
    - 0.3 * gaussian(t, qrs + 0.02, 0.01)
    + 0.28 * gaussian(t, qrs + 0.2 * k, 0.04 * k);
}

function waveSettings() {
  if (state.arret) {
    return { bpm: 0, amplitude: 0, irregular: false, noise: 0.02 };
  }

  const health = state.hp / 100;

  return {
    bpm: 70 + (1 - health) * 90,
    amplitude: 0.4 + 0.6 * health,
    irregular: state.hp <= 30,
    noise: state.hp <= 30 ? 0.06 : 0.015
  };
}

function nextPeriod(settings) {
  const period = 60 / settings.bpm;
  return settings.irregular
    ? period * (0.7 + Math.random() * 0.6)
    : period;
}

function resizeWave() {
  const ratio = 1 / LCD_PIXEL;
  const width = Math.round(wave.canvas.clientWidth * ratio);
  const height = Math.round(wave.canvas.clientHeight * ratio);

  if (width === wave.canvas.width && height === wave.canvas.height && wave.points) return;

  wave.canvas.width = width;
  wave.canvas.height = height;
  wave.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  wave.points = new Float32Array(Math.ceil(wave.canvas.clientWidth / WAVE_STEP) + 1).fill(NaN);
  wave.head = 0;
}

// Écrit la colonne suivante ; arrivé au bord droit, le tracé repart à gauche.
function advanceWave(settings, baseline, scale) {
  wave.head = (wave.head + 1) % wave.points.length;
  wave.beatTime += WAVE_STEP / WAVE_SPEED;

  if (settings.bpm && wave.beatTime >= wave.period) {
    wave.beatTime -= wave.period;
    wave.period = nextPeriod(settings);
  }

  const beat = settings.bpm
    ? settings.amplitude * heartbeatShape(wave.beatTime, wave.period)
    : 0;
  const noise = (Math.random() - 0.5) * 2 * settings.noise;

  wave.points[wave.head] = baseline - scale * (beat + noise);
}

// Efface le trou à partir de x (lueur comprise), puis l'ancien tracé en fondu.
function eraseAhead(x, height) {
  const solid = Math.max(0, WAVE_GAP + WAVE_STEP - 3);
  const length = solid + WAVE_FADE;
  const gradient = wave.ctx.createLinearGradient(x, 0, x + length, 0);

  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(solid / length, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  wave.ctx.fillStyle = gradient;
  wave.ctx.fillRect(x, 0, length, height);

  return length;
}

function drawWave(now) {
  requestAnimationFrame(drawWave);

  const elapsed = Math.min((now - wave.last) / 1000, 0.1);
  wave.last = now;

  resizeWave();

  const ctx = wave.ctx;
  const width = wave.canvas.clientWidth;
  const height = wave.canvas.clientHeight;
  if (!width || !height) return;

  if (wave.canvas.className !== wave.className) {
    wave.className = wave.canvas.className;
    wave.color = getComputedStyle(wave.canvas).color;
  }

  const settings = waveSettings();
  const baseline = height * 0.72;
  const scale = height * 0.62;

  wave.pending += WAVE_SPEED * elapsed;

  while (wave.pending >= WAVE_STEP) {
    wave.pending -= WAVE_STEP;
    advanceWave(settings, baseline, scale);
  }

  const points = wave.points;
  const count = points.length;
  const gap = Math.round(WAVE_GAP / WAVE_STEP);

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = wave.color;

  // Du plus ancien au plus récent, en laissant un trou devant le point d'écriture.
  ctx.beginPath();
  let drawing = false;

  for (let age = count - 1 - gap; age >= 0; age--) {
    const column = (wave.head - age + count) % count;
    const y = points[column];

    if (Number.isNaN(y)) {
      drawing = false;
      continue;
    }

    const x = column * WAVE_STEP;

    if (drawing && column !== 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
    }

    drawing = true;
  }

  ctx.stroke();

  // Trou devant le point d'écriture, avec un bord adouci côté ancien tracé.
  const eraseStart = wave.head * WAVE_STEP + 3;

  ctx.globalCompositeOperation = "destination-out";

  const eraseLength = eraseAhead(eraseStart, height);

  if (eraseStart + eraseLength > count * WAVE_STEP) {
    eraseAhead(eraseStart - count * WAVE_STEP, height);
  }

  ctx.globalCompositeOperation = "source-over";

  // Point d'écriture.
  const headY = points[wave.head];

  if (!Number.isNaN(headY)) {
    ctx.fillStyle = wave.color;
    ctx.beginPath();
    ctx.arc(wave.head * WAVE_STEP, headY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function startHeartMonitor() {
  const canvas = document.getElementById("hp-wave");

  if (!canvas || !canvas.getContext || typeof requestAnimationFrame !== "function") {
    return;
  }

  wave.canvas = canvas;
  wave.ctx = canvas.getContext("2d");
  wave.last = performance.now();
  requestAnimationFrame(drawWave);
}

// ==========================================
// DÉTECTION DE L'ANASARQUE
// ==========================================

function updateAnasarque() {
  // L'anasarque apparaît à partir de 150 %.
  if (state.hydro >= ANASARQUE_SEUIL && !state.anasarque) {
    state.anasarque = true;

    showLog(
      "🚨 SURCHARGE HYDRIQUE : la patiente présente une ANASARQUE !"
    );
  }

  // On conserve l'état tant que l'hydratation
  // n'est pas redescendue à 120 % ou moins.
  else if (
    state.hydro <= ANASARQUE_SORTIE &&
    state.anasarque
  ) {
    state.anasarque = false;

    showLog(
      "💧 La surcharge hydrique diminue. Fin de l'anasarque."
    );
  }
}

// ==========================================
// MISE À JOUR DE LA PATIENTE
// ==========================================

function updatePatient() {
  state.hp = Math.max(0, Math.min(100, state.hp));
  state.hydro = Math.max(0, Math.min(HYDRO_MAX, state.hydro));
  state.temp = Math.max(30, Math.min(45, state.temp));

  updateAnasarque();

  setHearts(state.hp);
  setHydroCells(state.hydro);
  setThermometer(state.temp);

  toggleClass("hp-wave", "critique", state.hp <= 30 || state.arret);
  toggleClass("hydro-cells", "critique", state.hydro <= 25);
  toggleClass("hydro-cells", "surcharge", state.anasarque);
  toggleClass("thermometer", "fievre", state.temp >= 39);
  toggleClass("lcd", "arret", state.arret);
  toggleClass("lcd", "etouffement", state.ettouffement);
  toggleClass("lcd", "sedatee", state.sedatee);

  const status = document.getElementById("patient-status");
  const image = document.getElementById("patient-img");

  let statusText = "Stable";
  let imageUrl = IMAGES.TOP;
  let statusClass = "";

  // PRIORITÉ 1 : ARRÊT CARDIAQUE
  if (state.arret) {
    statusText = "🚨 ARRÊT CARDIAQUE";
    imageUrl = IMAGES.ARRET_ASYSTOLIE;
    statusClass = "critical";
  }

  // PRIORITÉ 2 : ÉTOUFFEMENT
  else if (state.ettouffement) {
    statusText = "😱 ÉTOUFFEMENT — !heimlich";
    imageUrl = IMAGES.ETOUFFEMENT;
    statusClass = "critical";
  }

  // PRIORITÉ 3 : INTUBATION ET SÉDATION
  else if (state.intubee && state.sedatee) {
    statusText = "😴 Intubée et sédatée";
    imageUrl = IMAGES.INTUBEE_SEDATEE;
    statusClass = "warning";
  }

  else if (state.intubee) {
    statusText = "🫁 Intubée et éveillée";
    imageUrl = IMAGES.INTUBEE_EVEILLEE;
    statusClass = "warning";
  }

  // PRIORITÉ 4 : ÉTAT CRITIQUE
  else if (state.hp <= 30) {
    statusText = "🩺 État critique";
    imageUrl = IMAGES.DESHYDRATEE;
    statusClass = "critical";
  }

  // PRIORITÉ 5 : ANASARQUE
  else if (state.anasarque) {
    statusText = "💧 ANASARQUE";
    imageUrl = IMAGES.ANASARQUE;
    statusClass = "anasarque";
  }

  // PRIORITÉ 6 : HYPERTHERMIE
  else if (state.temp >= 39) {
    statusText = "🌡️ HYPERTHERMIE";
    imageUrl = IMAGES.HYPERTHERMIE;
    statusClass = "critical";
  }

  // PRIORITÉ 7 : DÉSHYDRATATION
  else if (state.hydro <= 25) {
    statusText = "💧 DÉSHYDRATATION";
    imageUrl = IMAGES.DESHYDRATEE;
    statusClass = "warning";
  }

  // PRIORITÉ 8 : SYMPTÔMES LÉGERS
  else if (state.eruption) {
    statusText = "🔴 Éruption cutanée";
    imageUrl = IMAGES.ERUPTION;
    statusClass = "warning";
  }

  else if (state.hydro <= 50) {
    statusText = "💧 Déshydratée";
    imageUrl = IMAGES.DESHYDRATEE;
    statusClass = "warning";
  }

  else if (state.hp <= 60 || state.temp >= 38) {
    statusText = "🤒 Patiente malade";

    imageUrl = state.temp >= 38
      ? IMAGES.HYPERTHERMIE
      : IMAGES.DESHYDRATEE;

    statusClass = "warning";
  }

  if (status) {
    status.textContent = lcdText(statusText);
    status.classList.remove("critical", "anasarque", "warning");

    if (statusClass) {
      status.classList.add(statusClass);
    }
  }

  updateLcdIcons(statusClass);

  if (image && image.getAttribute("src") !== imageUrl) {
    image.src = imageUrl;
  }
}

// ==========================================
// ARRÊT CARDIAQUE
// ==========================================

function triggerArret(reason) {
  if (state.arret) return;

  state.arret = true;

  showLog(
    "🚨 ARRÊT CARDIAQUE ! " +
    (reason || "La patiente est en danger.")
  );

  updatePatient();
}

// ==========================================
// ÉVOLUTION AUTOMATIQUE : TOUTES LES 15 S
// ==========================================

function gameTick() {
  if (state.arret) {
    updatePatient();
    return;
  }

  // Diminution naturelle de l'hydratation.
  state.hydro = Math.max(
    0,
    state.hydro - (state.sedatee ? 2 : 1)
  );

  // Perte progressive de santé, récupération sous intubation.
  if (state.intubee) {
    state.hp = Math.min(100, state.hp + 1);
  } else {
    state.hp = Math.max(0, state.hp - 1);
  }

  // Retour progressif vers 37 °C.
  if (state.temp > 37) {
    state.temp = Math.max(37, state.temp - 0.1);
  } else if (state.temp < 37) {
    state.temp = Math.min(37, state.temp + 0.1);
  }

  // Risque d'arrêt cardiaque en cas d'étouffement.
  if (state.ettouffement && Math.random() < 0.3) {
    triggerArret("L'étouffement a provoqué un arrêt cardiaque !");
    return;
  }

  // Une déshydratation extrême fait perdre des PV.
  if (state.hydro <= 0) {
    state.hp = Math.max(0, state.hp - 3);
  }

  if (state.hp <= 0) {
    triggerArret("La patiente n'a plus de points de vie !");
    return;
  }

  // Apparition aléatoire d'une éruption.
  if (!state.eruption && Math.random() < 0.02) {
    state.eruption = true;
    showLog("🔴 Une éruption cutanée apparaît !");
  }

  // Apparition aléatoire d'une poussée de fièvre.
  if (state.temp < 38 && Math.random() < 0.03) {
    state.temp += 2.5;
    showLog("🌡️ La patiente fait une poussée de fièvre !");
  }

  updatePatient();
}

// ==========================================
// TRAITEMENT DES COMMANDES TWITCH
// ==========================================

window.addEventListener("onEventReceived", function (obj) {
  if (!obj || !obj.detail) return;

  const listener = obj.detail.listener;

  if (listener !== "message" && listener !== "chat-message") {
    return;
  }

  const event = obj.detail.event || {};
  const data = event.data || event;

  const rawMessage = data.text || data.message || "";
  const message = normalizeCommand(rawMessage);

  const user =
    data.displayName ||
    data.nick ||
    data.username ||
    data.name ||
    "Un viewer";

  if (!message.startsWith("!")) return;

  flashCommandIcon(message);

  // ========================================
  // NOURRITURE
  // ========================================

  const foodCommand =
    matchesCommand(message, "manger") ||
    matchesCommand(message, "sandwich") ||
    matchesCommand(message, "cacahuetes");

  if (foodCommand) {
    if (state.arret || state.ettouffement) {
      showLog("🚨 " + user + " : impossible de manger dans cet état !");
    }

    else if (state.intubee) {
      showLog("🫁 " + user + " : patiente intubée, pas de nourriture !");
    }

    else if (Math.random() < 1 / 15) {
      state.ettouffement = true;

      if (matchesCommand(message, "sandwich")) {
        showLog("🥪😱 " + user + " donne un sandwich : ÉTOUFFEMENT !");
      } else if (matchesCommand(message, "cacahuetes")) {
        showLog("🥜😱 " + user + " donne des cacahuètes : ÉTOUFFEMENT !");
      } else {
        showLog("🍎😱 " + user + " donne à manger : ÉTOUFFEMENT !");
      }
    }

    else if (matchesCommand(message, "sandwich")) {
      state.hp = Math.min(100, state.hp + 10);
      showLog("🥪 " + user + " offre un sandwich : +10 PV !");
    }

    else if (matchesCommand(message, "cacahuetes")) {
      state.hp = Math.min(100, state.hp + 3);
      showLog("🥜 " + user + " donne des cacahuètes : +3 PV !");
    }

    else {
      state.hp = Math.min(100, state.hp + 5);
      showLog("🍎 " + user + " nourrit la patiente : +5 PV !");
    }

    updatePatient();
    return;
  }

  // ========================================
  // 💧 EAU / PERFUSION
  // ========================================

  if (matchesCommand(message, "eau") || matchesCommand(message, "perfusion")) {
    const perfusion = matchesCommand(message, "perfusion");

    if (state.arret) {
      showLog("🚨 Réanimez la patiente en priorité !");
    }

    else if (!perfusion && (state.ettouffement || state.intubee)) {
      showLog("🚨 Impossible de faire boire la patiente ! Utilisez !perfusion");
    }

    else {
      state.hydro = Math.min(HYDRO_MAX, state.hydro + 20);

      showLog(
        "💧 " + user +
        (perfusion ? " pose une perfusion" : " hydrate la patiente") +
        " : +20 hydratation !"
      );
    }
  }

  // ========================================
  // 💊 DIURÉTIQUE
  // ========================================

  else if (matchesCommand(message, "diuretique")) {
    if (state.arret) {
      showLog("🚨 Réanimez la patiente en priorité !");
    }

    else {
      state.hydro = Math.max(0, state.hydro - 20);

      showLog("💊 " + user + " administre un diurétique : -20 hydratation !");
    }
  }

  // ========================================
  // 🌡️ PARACÉTAMOL
  // ========================================

  else if (matchesCommand(message, "doliprane")) {
    if (state.arret) {
      showLog("🚨 Réanimez la patiente en priorité !");
    }

    else {
      state.temp = Math.max(36, state.temp - 1.5);
      showLog("🌡️ " + user + " administre du paracétamol : -1,5 °C !");
    }
  }

  // ========================================
  // 🧴 CRÈME / ANTIHISTAMINIQUE
  // ========================================

  else if (matchesCommand(message, "creme")) {
    if (state.arret) {
      showLog("🚨 Réanimez la patiente en priorité !");
    }

    else if (!state.eruption) {
      showLog("ℹ️ Aucune éruption à traiter !");
    }

    else {
      state.eruption = false;
      showLog("🧴 " + user + " traite l'éruption cutanée !");
    }
  }

  // ========================================
  // 🫁 INTUBATION
  // ========================================

  else if (matchesCommand(message, "intuber")) {
    if (state.arret || state.ettouffement) {
      showLog("🚨 Stabilisez la patiente avant l'intubation !");
    }

    else if (state.intubee) {
      showLog("🫁 La patiente est déjà intubée !");
    }

    else if (state.hp < 40) {
      state.intubee = true;
      showLog("🫁 " + user + " intube la patiente !");
    }

    else {
      showLog("ℹ️ Il faut moins de 40 PV pour intuber la patiente !");
    }
  }

  // ========================================
  // 😴 SÉDATION
  // ========================================

  else if (matchesCommand(message, "sedater")) {
    if (state.arret || state.ettouffement) {
      showLog("🚨 Stabilisez la patiente avant la sédation !");
    }

    else if (!state.intubee) {
      showLog("ℹ️ Il faut intuber la patiente avant de la sédater !");
    }

    else if (state.sedatee) {
      showLog("😴 La patiente est déjà sédatée !");
    }

    else {
      state.sedatee = true;
      showLog("😴 " + user + " sédate la patiente !");
    }
  }

  // ========================================
  // 🌞 RÉVEIL
  // ========================================

  else if (matchesCommand(message, "reveiller")) {
    if (state.arret || state.ettouffement) {
      showLog("🚨 Stabilisez la patiente avant le réveil !");
    }

    else if (!state.sedatee) {
      showLog("ℹ️ La patiente n'est pas sédatée !");
    }

    else {
      state.sedatee = false;
      showLog("🌞 " + user + " réveille la patiente !");
    }
  }

  // ========================================
  // 🫁 EXTUBATION
  // ========================================

  else if (matchesCommand(message, "extuber")) {
    if (state.arret || state.ettouffement) {
      showLog("🚨 Stabilisez la patiente avant l'extubation !");
    }

    else if (!state.intubee) {
      showLog("🫁 La patiente n'est pas intubée !");
    }

    else if (state.sedatee) {
      showLog("😴 Réveillez-la d'abord avec !reveiller !");
    }

    else if (state.hp < 50) {
      showLog("ℹ️ Il faut au moins 50 PV pour extuber la patiente !");
    }

    else {
      state.intubee = false;
      showLog("🫁 " + user + " extube la patiente !");
    }
  }

  // ========================================
  // 🆘 MANŒUVRE DE HEIMLICH
  // ========================================

  else if (matchesCommand(message, "heimlich")) {
    if (state.arret) {
      showLog("🚨 Réanimez la patiente en priorité !");
    }

    else if (!state.ettouffement) {
      showLog("ℹ️ La patiente ne s'étouffe pas !");
    }

    else {
      state.ettouffement = false;
      state.hp = Math.min(100, state.hp + 15);

      showLog("🆘 " + user + " réalise la manœuvre de Heimlich : +15 PV !");
    }
  }

  // ========================================
  // ❤️ RÉANIMATION
  // ========================================

  else if (matchesCommand(message, "cpr")) {
    if (!state.arret) {
      showLog("ℹ️ La patiente n'est pas en arrêt cardiaque !");
    }

    else {
      state.arret = false;
      state.ettouffement = false;
      state.hp = Math.max(30, state.hp);
      state.hydro = Math.max(30, state.hydro);
      state.temp = Math.max(37, Math.min(38, state.temp));

      showLog("❤️ " + user + " réanime la patiente ! Elle est stabilisée !");
    }
  }

  // Mise à jour après chaque commande.
  updatePatient();
});

// ==========================================
// INITIALISATION
// ==========================================

buildLcdIcons();
buildHearts();
buildThermometerScale();
buildHydroCells();
startSprite();
updatePatient();
startHeartMonitor();

if (gameInterval !== null) {
  clearInterval(gameInterval);
}

gameInterval = setInterval(gameTick, 15000);
