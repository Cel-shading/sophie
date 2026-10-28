// ==========================================
// 🧪 ATELIER : CLONE N°3 DE SOPHIE
// Simulateur local du widget so.html / so.css / so.js
// ==========================================

const WIDGET_FILES = ["../so.html", "../so.css", "../so.js"];
const WATCH_DELAY = 1000;
const MAX_JOURNAL = 500;

const LABELS = {
  hp: "Santé (PV)",
  hydro: "Hydratation (%)",
  temp: "Température (°C)",
  anasarque: "Anasarque",
  eruption: "Éruption cutanée",
  ettouffement: "Étouffement",
  intubee: "Intubée",
  sedatee: "Sédatée",
  arret: "Arrêt cardiaque"
};

const RANGES = {
  hp: { min: 0, max: 100, step: 1 },
  hydro: { min: 0, max: 200, step: 1 },
  temp: { min: 30, max: 45, step: 0.1 }
};

const SCENARIOS = [
  { name: "Départ", values: {} },
  { name: "État critique (25 PV)", values: { hp: 25 } },
  { name: "Intubée à 35 PV", values: { hp: 35, intubee: true } },
  { name: "Intubée et sédatée", values: { hp: 35, intubee: true, sedatee: true } },
  { name: "Poussée de fièvre (39,5 °C)", values: { temp: 39.5 } },
  { name: "Fièvre légère (38,2 °C)", values: { temp: 38.2 } },
  { name: "Bord de l'anasarque (140 %)", values: { hydro: 140 } },
  { name: "Déshydratation sévère (10 %)", values: { hydro: 10 } },
  { name: "Éruption cutanée", values: { eruption: true } },
  { name: "Étouffement", values: { ettouffement: true } },
  { name: "Arrêt cardiaque", values: { hp: 0, arret: true } }
];

const RANDOM_VALUES = {
  normal: null,
  toujours: 0,
  jamais: 0.999999
};

const JOURNAL_TYPES = {
  chat: "Chat",
  widget: "Widget",
  statut: "Statut",
  atelier: "Atelier",
  erreur: "Erreur"
};

// Exécuté dans le widget avant so.js : capture les minuteries pour
// piloter le temps depuis l'atelier, et permet de forcer le hasard.
const PRELUDE = `
window.__timers = [];
window.setInterval = function (fn, delay) {
  window.__timers.push({ fn: fn, delay: Number(delay) || 0, elapsed: 0, active: true });
  return window.__timers.length;
};
window.clearInterval = function (id) {
  var timer = window.__timers[id - 1];
  if (timer) timer.active = false;
};
window.__random = null;
(function () {
  var nativeRandom = Math.random;
  Math.random = function () {
    return window.__random === null ? nativeRandom() : window.__random;
  };
})();
window.addEventListener("error", function (event) {
  var where = String(event.filename).indexOf("blob:") === 0
    ? " (so.js, ligne " + event.lineno + ")"
    : "";
  if (parent.atelierError) parent.atelierError(event.message + where);
});
`;

// Exécuté dans le widget après so.js : expose l'état et les fonctions.
const BRIDGE = `
(function () {
  function read(getter, fallback) {
    try { return getter(); } catch (error) { return fallback; }
  }
  window.__atelier = {
    state: read(function () { return state; }, null),
    commands: read(function () { return COMMANDS; }, {}),
    images: read(function () { return IMAGES; }, {}),
    hydroMax: read(function () { return HYDRO_MAX; }, 200),
    update: read(function () { return updatePatient; }, function () {})
  };
  if (parent.atelierReady) parent.atelierReady();
})();
`;

const sim = {
  frame: null,
  win: null,
  bridge: null,
  timers: [],
  sources: null,
  pending: null,
  initialState: {},
  controls: {},
  logObserver: null,
  paused: false,
  speed: 1,
  randomMode: "normal",
  ticks: 0,
  elapsed: 0,
  lastFrame: performance.now(),
  lastStatus: "",
  watching: false
};

function $(id) {
  return document.getElementById(id);
}

// ==========================================
// CHARGEMENT DU WIDGET
// ==========================================

async function readFiles() {
  const [html, css, js] = await Promise.all(
    WIDGET_FILES.map(async (file) => {
      const response = await fetch(file, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(file.replace("../", "") + " : erreur " + response.status);
      }

      return response.text();
    })
  );

  return { html, css, js };
}

function buildDocument(sources, scriptUrl) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>:root { color-scheme: dark; } html, body { margin: 0; background: transparent; } body { padding: 16px; }</style>
<style>${sources.css}</style>
<script>${PRELUDE}</script>
</head>
<body>
${sources.html}
<script src="${scriptUrl}"></script>
<script>${BRIDGE}</script>
</body>
</html>`;
}

async function loadWidget(reason, sources) {
  if (!sources) {
    try {
      sources = await readFiles();
    } catch (error) {
      setFilesStatus("Fichiers introuvables", true);
      log("erreur", error.message + ". Lancez l'atelier avec « node atelier/serveur.js ».");
      return;
    }
  }

  sim.sources = sources;
  sim.bridge = null;

  // so.js est chargé depuis un Blob pour que les erreurs
  // indiquent les numéros de ligne du fichier.
  const scriptUrl = URL.createObjectURL(
    new Blob([sources.js], { type: "text/javascript" })
  );

  sim.pending = { reason, scriptUrl };
  sim.frame.srcdoc = buildDocument(sources, scriptUrl);
}

// Appelé par le widget dès que so.js a été exécuté,
// sans attendre le chargement des images.
window.atelierReady = () => {
  if (!sim.pending) return;

  URL.revokeObjectURL(sim.pending.scriptUrl);
  connectWidget(sim.pending.reason);
  sim.pending = null;
};

function connectWidget(reason) {
  sim.win = sim.frame.contentWindow;
  sim.timers = sim.win.__timers || [];
  sim.ticks = 0;
  sim.elapsed = 0;
  sim.lastStatus = "";

  const bridge = sim.win.__atelier;

  if (!bridge || !bridge.state) {
    setFilesStatus("Le widget n'a pas démarré", true);
    log("erreur", "so.js n'a pas pu démarrer : voir les erreurs ci-dessus.");
    return;
  }

  sim.bridge = bridge;
  sim.initialState = { ...bridge.state };

  applyRandom();
  buildParameters();
  buildCommands();
  watchWidgetLog();

  setFilesStatus("so.html · so.css · so.js chargés");
  log("atelier", reason);
}

function setFilesStatus(text, isError = false) {
  const status = $("etat-fichiers");
  status.textContent = text;
  status.classList.toggle("erreur", isError);
}

function watchWidgetLog() {
  if (sim.logObserver) sim.logObserver.disconnect();
  sim.logObserver = null;

  const box = sim.win.document.getElementById("log-box");
  if (!box) return;

  sim.logObserver = new MutationObserver(logWidgetMessages);
  sim.logObserver.observe(box, { childList: true });
}

function logWidgetMessages(mutations) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) log("widget", node.textContent);
    }
  }
}

async function watchFiles() {
  if (sim.watching || !sim.sources || !$("auto-recharge").checked) return;

  sim.watching = true;

  try {
    const sources = await readFiles();
    const changed =
      sources.html !== sim.sources.html ||
      sources.css !== sim.sources.css ||
      sources.js !== sim.sources.js;

    if (changed) {
      await loadWidget("Fichiers modifiés : widget rechargé.", sources);
    }
  } catch (error) {
    setFilesStatus("Serveur injoignable", true);
  } finally {
    sim.watching = false;
  }
}

// ==========================================
// TEMPS
// ==========================================

function mainTimer() {
  return sim.timers.find((timer) => timer.active && timer.delay > 0);
}

function advance(ms) {
  if (!sim.bridge) return;

  const main = mainTimer();

  for (const timer of sim.timers) {
    if (!timer.active || timer.delay <= 0) continue;

    timer.elapsed += ms;

    while (timer.active && timer.elapsed >= timer.delay) {
      timer.elapsed -= timer.delay;
      if (timer === main) sim.ticks++;
      runTimer(timer);
    }
  }

  sim.elapsed += ms;
}

function runTimer(timer) {
  try {
    timer.fn();
  } catch (error) {
    log("erreur", describeError(error));
  }
}

function stepTicks(count) {
  for (let i = 0; i < count; i++) {
    const main = mainTimer();
    if (!main) break;
    advance(main.delay - main.elapsed);
  }

  refresh();
}

function loop(now) {
  const delta = Math.min(now - sim.lastFrame, 250);
  sim.lastFrame = now;

  if (!sim.paused) advance(delta * sim.speed);

  refresh();
  requestAnimationFrame(loop);
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");

  return (hours ? hours + ":" : "") + minutes + ":" + seconds;
}

// ==========================================
// AFFICHAGE
// ==========================================

function refresh() {
  if (!sim.bridge) return;

  // Les messages du widget passent avant le changement de statut qu'ils expliquent.
  if (sim.logObserver) logWidgetMessages(sim.logObserver.takeRecords());

  const state = sim.bridge.state;

  for (const [key, control] of Object.entries(sim.controls)) {
    control.sync(state[key]);
  }

  const doc = sim.win.document;
  const status = doc.getElementById("patient-status");
  const image = doc.getElementById("patient-img");
  const statusText = status ? status.textContent.trim() : "—";

  if (statusText !== sim.lastStatus) {
    sim.lastStatus = statusText;
    log("statut", statusText);
  }

  $("resume-statut").textContent = statusText;
  $("resume-image").textContent = imageName(image);

  const main = mainTimer();
  $("progression-barre").style.width = main
    ? (main.elapsed / main.delay) * 100 + "%"
    : "0%";

  $("tours").textContent = "Tour " + sim.ticks;
  $("temps-simule").textContent = formatTime(sim.elapsed);

  fitFrame(doc);
}

function imageName(image) {
  if (!image || !image.getAttribute("src")) return "—";

  const images = sim.bridge.images;
  const key = Object.keys(images).find((name) => images[name] === image.src);

  return key || "Inconnue";
}

function fitFrame(doc) {
  const content = doc.body && doc.body.firstElementChild;
  if (!content) return;

  const height = Math.ceil(content.getBoundingClientRect().height) + 32 + "px";

  if (sim.frame.style.height !== height) {
    sim.frame.style.height = height;
  }
}

// ==========================================
// PARAMÈTRES
// ==========================================

function buildParameters() {
  const numbers = $("parametres-nombres");
  const flags = $("parametres-etats");
  const state = sim.bridge.state;

  numbers.innerHTML = "";
  flags.innerHTML = "";
  sim.controls = {};

  for (const key of Object.keys(state)) {
    if (typeof state[key] === "number") {
      sim.controls[key] = numberControl(numbers, key);
    } else if (typeof state[key] === "boolean") {
      sim.controls[key] = toggleControl(flags, key);
    }
  }
}

function numberControl(container, key) {
  const range = { ...(RANGES[key] || { min: 0, max: 100, step: 1 }) };
  if (key === "hydro") range.max = sim.bridge.hydroMax;

  const decimals = range.step < 1 ? 1 : 0;
  const label = LABELS[key] || key;

  const row = document.createElement("div");
  row.className = "param";
  row.innerHTML = `
    <label for="param-${key}"></label>
    <input type="range" id="param-${key}" min="${range.min}" max="${range.max}" step="${range.step}">
    <input type="number" min="${range.min}" max="${range.max}" step="${range.step}">`;
  container.appendChild(row);

  const [slider, input] = row.querySelectorAll("input");
  row.querySelector("label").textContent = label;
  input.setAttribute("aria-label", label);

  const apply = (value, final) => {
    if (Number.isNaN(value)) return;
    setStateValue(key, value);
    if (final) log("atelier", label + " = " + Number(sim.bridge.state[key]).toFixed(decimals));
  };

  slider.addEventListener("input", () => apply(Number(slider.value), false));
  slider.addEventListener("change", () => apply(Number(slider.value), true));
  input.addEventListener("change", () => apply(Number(input.value), true));

  return {
    sync(value) {
      if (document.activeElement !== slider) slider.value = value;
      if (document.activeElement !== input) input.value = Number(value).toFixed(decimals);
    }
  };
}

function toggleControl(container, key) {
  const label = LABELS[key] || key;

  const row = document.createElement("label");
  row.className = "bascule";
  row.innerHTML = `
    <input type="checkbox">
    <span class="bascule-piste" aria-hidden="true"></span>
    <span></span>`;
  row.lastElementChild.textContent = label;
  container.appendChild(row);

  const box = row.querySelector("input");

  box.addEventListener("change", () => {
    setStateValue(key, box.checked);
    log("atelier", label + (box.checked ? " activé" : " désactivé"));
  });

  return {
    sync(value) {
      box.checked = Boolean(value);
    }
  };
}

function setStateValue(key, value) {
  if (!sim.bridge) return;

  sim.bridge.state[key] = value;
  updateWidget();
  refresh();
}

function updateWidget() {
  try {
    sim.bridge.update();
  } catch (error) {
    log("erreur", describeError(error));
  }
}

function applyRandom() {
  if (sim.win) sim.win.__random = RANDOM_VALUES[sim.randomMode];

  for (const button of document.querySelectorAll("#hasard button")) {
    button.setAttribute("aria-pressed", String(button.dataset.hasard === sim.randomMode));
  }
}

function buildScenarios() {
  const container = $("scenarios");

  for (const scenario of SCENARIOS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = scenario.name;

    button.addEventListener("click", () => {
      if (!sim.bridge) return;

      Object.assign(sim.bridge.state, sim.initialState, scenario.values);
      updateWidget();
      log("atelier", "Scénario : " + scenario.name);
      refresh();
    });

    container.appendChild(button);
  }
}

// ==========================================
// CHAT
// ==========================================

function sendMessage(text) {
  if (!sim.bridge) return;

  const name = $("pseudo").value.trim() || "Viewer";
  log("chat", name + " : " + text);

  const event = new sim.win.CustomEvent("onEventReceived", {
    detail: {
      listener: "message",
      event: {
        data: { text: text, displayName: name, nick: name.toLowerCase() }
      }
    }
  });

  sim.win.dispatchEvent(event);
  refresh();
}

function buildCommands() {
  const container = $("commandes");
  container.innerHTML = "";

  for (const aliases of Object.values(sim.bridge.commands)) {
    if (!Array.isArray(aliases) || !aliases.length) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "commande";
    button.title = aliases.join("  ");
    button.textContent = aliases[0];

    if (aliases.length > 1) {
      const more = document.createElement("small");
      more.textContent = "+" + (aliases.length - 1) + " alias";
      button.appendChild(more);
    }

    button.addEventListener("click", () => {
      const count = Number($("repetition").value);
      for (let i = 0; i < count; i++) sendMessage(aliases[0]);
    });

    container.appendChild(button);
  }
}

// ==========================================
// JOURNAL
// ==========================================

function log(type, text) {
  const list = $("journal");

  const item = document.createElement("li");
  item.className = "entree " + type;

  const time = document.createElement("span");
  time.className = "entree-temps";
  time.textContent = formatTime(sim.elapsed) + " · tour " + sim.ticks;

  const tag = document.createElement("span");
  tag.className = "entree-type";
  tag.textContent = JOURNAL_TYPES[type] || type;

  const body = document.createElement("span");
  body.className = "entree-texte";
  body.textContent = text;

  item.append(time, tag, body);
  list.prepend(item);

  while (list.children.length > MAX_JOURNAL) {
    list.lastElementChild.remove();
  }
}

function describeError(error) {
  const message = error && error.message ? error.message : String(error);
  const line = String(error && error.stack).match(/blob:[^\s)]+:(\d+):\d+/);

  return message + (line ? " (so.js, ligne " + line[1] + ")" : "");
}

window.atelierError = (message) => log("erreur", message);

// ==========================================
// INITIALISATION
// ==========================================

function bindControls() {
  $("form-chat").addEventListener("submit", (event) => {
    event.preventDefault();

    const message = $("message");
    const text = message.value.trim();
    if (!text) return;

    sendMessage(text);
    message.value = "";
  });

  $("lecture").addEventListener("click", () => {
    sim.paused = !sim.paused;
    $("lecture").textContent = sim.paused ? "▶ Lecture" : "⏸ Pause";
  });

  $("vitesse").addEventListener("change", (event) => {
    sim.speed = Number(event.target.value);
  });

  $("tour-1").addEventListener("click", () => stepTicks(1));
  $("tour-10").addEventListener("click", () => stepTicks(10));

  $("hasard").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-hasard]");
    if (!button) return;

    sim.randomMode = button.dataset.hasard;
    applyRandom();
    log("atelier", "Hasard : " + button.textContent);
  });

  $("recharger").addEventListener("click", () => loadWidget("Widget rechargé."));

  $("effacer-journal").addEventListener("click", () => {
    $("journal").innerHTML = "";
  });

  $("copier-journal").addEventListener("click", async () => {
    const lines = [...$("journal").children]
      .reverse()
      .map((item) => [...item.children].map((part) => part.textContent).join("  "));

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      log("atelier", "Journal copié.");
    } catch (error) {
      log("erreur", "Impossible de copier le journal.");
    }
  });
}

sim.frame = $("widget");
bindControls();
buildScenarios();

if (location.protocol === "file:") {
  setFilesStatus("Ouvert sans serveur", true);
  log("erreur", "Le navigateur bloque la lecture des fichiers locaux. Lancez « node atelier/serveur.js » puis ouvrez http://localhost:3003/");
} else {
  loadWidget("Widget chargé.");
}

requestAnimationFrame(loop);
setInterval(watchFiles, WATCH_DELAY);
