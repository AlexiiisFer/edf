// Météo de mon logement — serveur de démo (Node.js, sans dépendance)
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "reset";
const PUBLIC_DIR = path.join(__dirname, "public");

// Stockage en mémoire (suffisant pour une démo live)
let participants = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) { reject(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
  });
}

function num(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function computeStats() {
  const list = [...participants.values()];
  const count = list.length;
  const avg = (k) => (count ? list.reduce((s, p) => s + p[k], 0) / count : 0);
  const engaged = list.filter((p) => p.engaged);
  const degreesSaved = engaged.reduce((s, p) => s + p.gain, 0);
  const kwhSaved = engaged.reduce((s, p) => s + (p.clim ? 1.5 : 1.0), 0);
  const pct = (fn) => (count ? Math.round((list.filter(fn).length / count) * 100) : 0);
  const gestureCounts = {};
  engaged.forEach((p) => p.gestures.forEach((g) => (gestureCounts[g] = (gestureCounts[g] || 0) + 1)));
  return {
    count,
    engagedCount: engaged.length,
    avgNoAction: Math.round(avg("tempNo") * 10) / 10,
    avgWithPlan: Math.round(avg("tempPlan") * 10) / 10,
    pctNoShutters: pct((p) => p.shutters === "aucun"),
    pctClim: pct((p) => p.clim),
    pctTopFloor: pct((p) => p.floor === "dernier"),
    pctTooHot: pct((p) => p.tempNo >= 28),
    degreesSaved: Math.round(degreesSaved),
    kwhSaved: Math.round(kwhSaved),
    gestureCounts,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // --- API ---
    if (url.pathname === "/api/submit" && req.method === "POST") {
      const b = await readBody(req);
      const tempNo = num(b.tempNo, 15, 45);
      const tempPlan = num(b.tempPlan, 15, 45);
      if (tempNo === null || tempPlan === null) return sendJson(res, 400, { error: "invalid" });
      const id = crypto.randomUUID();
      participants.set(id, {
        city: String(b.city || "").slice(0, 40),
        floor: String(b.floor || "").slice(0, 20),
        orientation: String(b.orientation || "").slice(0, 20),
        shutters: String(b.shutters || "").slice(0, 20),
        insulation: String(b.insulation || "").slice(0, 20),
        clim: !!b.clim,
        tempNo,
        tempPlan,
        gain: 0,
        gestures: [],
        engaged: false,
      });
      return sendJson(res, 200, { id });
    }

    if (url.pathname === "/api/engage" && req.method === "POST") {
      const b = await readBody(req);
      const p = participants.get(String(b.id || ""));
      if (!p) return sendJson(res, 404, { error: "unknown" });
      p.gestures = Array.isArray(b.gestures) ? b.gestures.slice(0, 10).map((g) => String(g).slice(0, 40)) : [];
      p.gain = num(b.gain, 0, 20) || 0;
      p.engaged = p.gestures.length > 0;
      return sendJson(res, 200, { ok: true, stats: computeStats() });
    }

    if (url.pathname === "/api/stats" && req.method === "GET") {
      return sendJson(res, 200, computeStats());
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      if (url.searchParams.get("token") !== ADMIN_TOKEN) return sendJson(res, 403, { error: "forbidden" });
      participants = new Map();
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === "/health") return sendJson(res, 200, { ok: true });

    // --- Fichiers statiques ---
    let file = url.pathname === "/" ? "/index.html" : url.pathname;
    if (file === "/ecran") file = "/ecran.html";
    const filePath = path.normalize(path.join(PUBLIC_DIR, file));
    if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  } catch (e) {
    sendJson(res, 400, { error: "bad request" });
  }
});

server.listen(PORT, () => console.log(`Météo de mon logement sur http://localhost:${PORT}`));
