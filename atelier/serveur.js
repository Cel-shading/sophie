// ==========================================
// 🧪 ATELIER : CLONE N°3 DE SOPHIE - SERVEUR LOCAL
// Lancement : node atelier/serveur.js
// ==========================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3003;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let url;

  try {
    url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (error) {
    return send(res, 400, "Requête invalide");
  }

  if (url === "/") {
    return send(res, 302, "", { Location: "/atelier/" });
  }

  const file = path.join(ROOT, url);
  const relative = path.relative(ROOT, file);

  // On ne sert que les fichiers du projet.
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return send(res, 403, "Accès refusé");
  }

  fs.stat(file, (statError, stats) => {
    if (statError) return send(res, 404, "Introuvable : " + url);

    if (stats.isDirectory()) {
      if (!url.endsWith("/")) return send(res, 301, "", { Location: url + "/" });
      return serveFile(res, path.join(file, "index.html"));
    }

    serveFile(res, file);
  });
});

function serveFile(res, file) {
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, "Introuvable");

    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("Le port " + PORT + " est déjà utilisé. Essayez : PORT=3004 node atelier/serveur.js");
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("🧪 Atelier : Clone n°3 de Sophie");
  console.log("   http://localhost:" + PORT + "/");
  console.log("   Ctrl+C pour arrêter.");
});
