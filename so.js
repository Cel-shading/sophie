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

// Urgences, recharges et surdosage, en secondes de jeu.
const ARRET_DELAI = 60;
const MACE_REQUIS = 3;
const DECES_DUREE = 30;
const RECHARGES = {
  nourriture: 20,
  eau: 20,
  doliprane: 30,
  diuretique: 30
};
const SURDOSE_DOSES = 3;
const SURDOSE_FENETRE = 120;
const SURDOSE_PV = 10;

// Aggravation des problèmes non soignés, en tours de 15 s.
const AGGRAVATION_TOURS = 2;
const AGGRAVATION_MAX = 10;

// Risque, à chaque tour, qu'une patiente intubée éveillée arrache son tube.
const AGITATION_RISQUE = 0.1;
const AGITATION_PV = 10;

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
  arret: false,
  delaiArret: ARRET_DELAI,
  decedee: false
};

const ETAT_INITIAL = { ...state };

// Déroulement de la partie, compté en secondes de jeu.
const game = {
  clock: 0,
  survival: 0,
  record: readRecord(),
  deathTime: 0,
  cprUsers: [],
  cooldowns: {},
  doses: [],
  symptoms: {}
};

let gameInterval = null;
let clockInterval = null;

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
    "!cacahuetes", "!cacahuete", "!cacahouete",
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
// RECHARGES ET SURDOSAGE
// ==========================================

// Une recharge est commune à tout le chat : le premier viewer
// refusé est prévenu, les suivants sont ignorés sans message.
function isOnCooldown(type, message) {
  const cooldown = game.cooldowns[type];

  if (!cooldown || game.clock >= cooldown.end) return false;

  if (!cooldown.warned) {
    cooldown.warned = true;
    showLog("⏳ " + message + " (encore " + (cooldown.end - game.clock) + " s)");
  }

  return true;
}

function startCooldown(type) {
  game.cooldowns[type] = { end: game.clock + RECHARGES[type], warned: false };
}

// Renvoie true si cette dose de paracétamol est un surdosage.
function addDose() {
  game.doses = game.doses.filter((time) => game.clock - time < SURDOSE_FENETRE);
  game.doses.push(game.clock);

  return game.doses.length >= SURDOSE_DOSES;
}

// ==========================================
// DURÉE DE SURVIE ET RECORD
// ==========================================

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours) return hours + " h " + String(minutes).padStart(2, "0");
  if (minutes) return minutes + " min";
  return seconds + " s";
}

// Le record est gardé par le navigateur (la source OBS) quand c'est possible.
function readRecord() {
  try {
    return Number(localStorage.getItem("patiente-record")) || 0;
  } catch (error) {
    return 0;
  }
}

function saveRecord() {
  try {
    localStorage.setItem("patiente-record", String(game.record));
  } catch (error) {
    // Pas de stockage : le record repart de zéro au prochain chargement.
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
    // Pendant un arrêt cardiaque, seule la réanimation compte ;
    // après le décès, toutes les icônes s'éteignent.
    const active = !state.decedee && (!state.arret || icon.id === "cpr");

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
const SPRITE_WIDTH = 76;
const SPRITE_HEIGHT = 68;

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

  toggleClass("hp-hearts", "critique", state.hp <= 30 || state.arret);
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

  // PRIORITÉ 0 : DÉCÈS
  // Textes courts : l'écran affiche environ 25 caractères.
  if (state.decedee) {
    statusText = "💀 DÉCÉDÉE — suivante " +
      Math.max(0, DECES_DUREE - game.deathTime) + " s";
    imageUrl = IMAGES.ARRET_ASYSTOLIE;
    statusClass = "critical";
  }

  // PRIORITÉ 1 : ARRÊT CARDIAQUE
  else if (state.arret) {
    statusText = "🚨 ARRÊT — !mace " +
      game.cprUsers.length + "/" + MACE_REQUIS + " · " + state.delaiArret + " s";
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

function reanimate() {
  state.arret = false;
  state.ettouffement = false;
  state.hp = Math.max(30, state.hp);
  state.hydro = Math.max(30, state.hydro);
  state.temp = Math.max(37, Math.min(38, state.temp));
  state.delaiArret = ARRET_DELAI;
  game.cprUsers = [];
}

// ==========================================
// DÉCÈS ET NOUVELLE PATIENTE
// ==========================================

function declareDeath() {
  state.decedee = true;
  state.arret = true;
  game.deathTime = 0;
  game.record = Math.max(game.record, game.survival);
  saveRecord();

  showLog(
    "💀 La patiente est décédée après " + formatDuration(game.survival) +
    " de soins. Record : " + formatDuration(game.record) + "."
  );

  updatePatient();
}

function newPatient() {
  Object.assign(state, ETAT_INITIAL);
  game.survival = 0;
  game.deathTime = 0;
  game.cprUsers = [];
  game.cooldowns = {};
  game.doses = [];
  game.symptoms = {};

  showLog("🏥 Une nouvelle patiente arrive : prenez-en soin !");
  updatePatient();
}

// ==========================================
// HORLOGE DE JEU : TOUTES LES SECONDES
// ==========================================

// Compte la survie, les recharges et le délai pour réanimer.
function clockTick() {
  game.clock++;

  if (state.decedee) {
    game.deathTime++;

    if (game.deathTime >= DECES_DUREE) {
      newPatient();
    } else {
      updatePatient();
    }

    return;
  }

  game.deathTime = 0;
  game.survival++;

  if (!state.arret) {
    state.delaiArret = ARRET_DELAI;
    game.cprUsers = [];
    return;
  }

  state.delaiArret = Math.max(0, state.delaiArret - 1);

  if (state.delaiArret <= 0) {
    declareDeath();
  } else {
    updatePatient();
  }
}

// ==========================================
// ÉVOLUTION AUTOMATIQUE : TOUTES LES 15 S
// ==========================================

// Problèmes qui font perdre des PV tant qu'ils ne sont pas soignés,
// avec la perte du premier tour.
const SYMPTOMS = {
  fievre: { label: "La fièvre", on: () => state.temp >= 38, base: () => 1 },
  eruption: { label: "L'éruption", on: () => state.eruption, base: () => 1 },
  anasarque: { label: "L'anasarque", on: () => state.anasarque, base: () => 1 },
  deshydratation: {
    label: "La déshydratation",
    on: () => state.hydro <= 25,
    base: () => (state.hydro <= 0 ? 3 : 1)
  }
};

// PV perdus par tour pour un problème : 1 point de plus tous les
// AGGRAVATION_TOURS tours sans soin, jusqu'à AGGRAVATION_MAX.
function severity(name, tours = game.symptoms[name] || 0) {
  if (!tours) return 0;

  return Math.min(
    AGGRAVATION_MAX,
    SYMPTOMS[name].base() + Math.floor((tours - 1) / AGGRAVATION_TOURS)
  );
}

// L'hyperthermie assèche la patiente d'autant que la fièvre lui coûte de PV.
function hyperthermiaLoss() {
  return state.temp >= 39 ? severity("fievre") : 0;
}

// Compte les tours passés avec chaque problème, et prévient le chat
// quand l'un d'eux atteint la moitié puis le maximum de l'aggravation.
function updateSymptoms() {
  const alerts = [Math.ceil(AGGRAVATION_MAX / 2), AGGRAVATION_MAX];

  for (const [name, symptom] of Object.entries(SYMPTOMS)) {
    const tours = symptom.on() ? (game.symptoms[name] || 0) + 1 : 0;
    const before = severity(name);
    const after = severity(name, tours);

    game.symptoms[name] = tours;

    if (after > before && alerts.includes(after)) {
      const water = name === "fievre" ? hyperthermiaLoss() : 0;

      showLog(
        "⚠️ " + symptom.label + " s'aggrave : -" + after + " PV" +
        (water ? " et -" + water + " hydratation" : "") + " par tour !"
      );
    }
  }
}

function symptomLoss() {
  return Object.keys(SYMPTOMS).reduce((loss, name) => loss + severity(name), 0);
}

function gameTick() {
  if (state.arret || state.decedee) {
    updatePatient();
    return;
  }

  updateSymptoms();

  // Diminution naturelle de l'hydratation, plus rapide
  // sous sédation et en hyperthermie.
  state.hydro = Math.max(
    0,
    state.hydro - (state.sedatee ? 2 : 1) - hyperthermiaLoss()
  );

  // Perte progressive de santé, récupération sous intubation,
  // plus rapide si la patiente est sédatée.
  if (state.intubee) {
    state.hp = Math.min(100, state.hp + (state.sedatee ? 2 : 1));
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

  // Intubée mais éveillée, elle peut s'agiter et arracher son tube.
  if (state.intubee && !state.sedatee && Math.random() < AGITATION_RISQUE) {
    state.intubee = false;
    state.hp = Math.max(0, state.hp - AGITATION_PV);
    showLog(
      "😣 La patiente s'agite et arrache son tube : -" + AGITATION_PV +
      " PV ! Sédatez-la avec !hypnovel après l'intubation."
    );
  }

  state.hp = Math.max(0, state.hp - symptomLoss());

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

  // Plus aucun soin possible : une nouvelle patiente va arriver.
  if (state.decedee) return;

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

    else if (!isOnCooldown("nourriture", "La patiente digère encore")) {
      startCooldown("nourriture");

      if (Math.random() < 1 / 15) {
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

    else if (state.ettouffement) {
      showLog("🚨 Elle s'étouffe : !heimlich d'abord !");
    }

    else if (perfusion && !state.intubee) {
      showLog("ℹ️ Pas besoin de perfusion, elle peut boire : !eau");
    }

    else if (!perfusion && state.intubee) {
      showLog("🫁 Patiente intubée : utilisez !perfusion");
    }

    else if (!isOnCooldown("eau", "La patiente vient d'être hydratée")) {
      startCooldown("eau");
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

    else if (!isOnCooldown("diuretique", "Diurétique déjà donné")) {
      startCooldown("diuretique");
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

    else if (!isOnCooldown("doliprane", "Paracétamol déjà donné")) {
      startCooldown("doliprane");
      state.temp = Math.max(36, state.temp - 1.5);

      if (addDose()) {
        state.hp = Math.max(0, state.hp - SURDOSE_PV);
        showLog("☠️ " + user + " : surdosage de paracétamol, -" + SURDOSE_PV + " PV !");
      } else {
        showLog("🌡️ " + user + " administre du paracétamol : -1,5 °C !");
      }
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
      showLog("🫁 " + user + " intube la patiente : sédatez-la avec !hypnovel !");
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
      showLog("😴 " + user + " sédate la patiente : +2 PV par tour !");
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

  // Il faut MACE_REQUIS viewers différents ; un viewer
  // qui masse une deuxième fois est ignoré.
  else if (matchesCommand(message, "cpr")) {
    if (!state.arret) {
      showLog("ℹ️ La patiente n'est pas en arrêt cardiaque !");
    }

    else if (!game.cprUsers.includes(user)) {
      game.cprUsers.push(user);

      const progress = " (" + game.cprUsers.length + "/" + MACE_REQUIS + ")";

      if (game.cprUsers.length < MACE_REQUIS) {
        showLog("❤️ " + user + " fait un massage cardiaque" + progress + " !");
      } else {
        reanimate();
        showLog("❤️ " + user + " termine la réanimation" + progress + " : elle est sauvée !");
      }
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

if (gameInterval !== null) {
  clearInterval(gameInterval);
}

if (clockInterval !== null) {
  clearInterval(clockInterval);
}

gameInterval = setInterval(gameTick, 15000);
clockInterval = setInterval(clockTick, 1000);
