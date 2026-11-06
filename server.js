// Météo de mon logement — serveur de session live (Node.js, sans dépendance)
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "reset";
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_PLAYERS = 500;

// État de la session (en mémoire)
let session = newSession();
function newSession() {
  return { id: crypto.randomUUID(), phase: "lobby", startedAt: null, players: new Map() };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const ROUTES = { "/": "/index.html", "/jouer": "/jouer.html", "/stats": "/stats.html", "/ecran": "/stats.html" };

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

function playerList() {
  return [...session.players.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({ done: p.answered, engaged: p.engaged }));
}

function computeStats() {
  const all = [...session.players.values()];
  const list = all.filter((p) => p.answered);
  const count = list.length;
  const avg = (k) => (count ? list.reduce((s, p) => s + p[k], 0) / count : 0);
  const engaged = list.filter((p) => p.engaged);
  const pct = (fn) => (count ? Math.round((list.filter(fn).length / count) * 100) : 0);
  const gestureCounts = {};
  engaged.forEach((p) => p.gestures.forEach((g) => (gestureCounts[g] = (gestureCounts[g] || 0) + 1)));
  const hottest = list.slice().sort((a, b) => b.tempNo - a.tempNo)[0];
  return {
    phase: session.phase,
    connected: all.length,
    count,
    engagedCount: engaged.length,
    avgNoAction: Math.round(avg("tempNo") * 10) / 10,
    avgWithPlan: Math.round(avg("tempPlan") * 10) / 10,
    pctNoShutters: pct((p) => p.shutters === "aucun"),
    pctClim: pct((p) => p.clim),
    pctTopFloor: pct((p) => p.floor === "dernier"),
    pctTooHot: pct((p) => p.tempNo >= 28),
    degreesSaved: Math.round(engaged.reduce((s, p) => s + p.gain, 0)),
    kwhSaved: Math.round(engaged.reduce((s, p) => s + (p.clim ? 1.5 : 1.0), 0)),
    gestureCounts,
    hottest: hottest ? { temp: hottest.tempNo } : null,
    coolest: list.length ? Math.min(...list.map((p) => p.tempNo)) : null,
  };
}

function isAdmin(url) {
  return url.searchParams.get("token") === ADMIN_TOKEN;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    // --- API participants ---
    if (p === "/api/join" && req.method === "POST") {
      const b = await readBody(req);
      const name = "";
      if (session.players.size >= MAX_PLAYERS) return sendJson(res, 429, { error: "Session complète" });
      if (session.phase === "ended") return sendJson(res, 409, { error: "Session terminée" });
      const id = crypto.randomUUID();
      session.players.set(id, {
        name, joinedAt: Date.now(), answered: false, engaged: false,
        city: "", floor: "", orientation: "", shutters: "", clim: false,
        tempNo: 0, tempPlan: 0, gain: 0, gestures: [],
      });
      return sendJson(res, 200, { id, sessionId: session.id, phase: session.phase });
    }

    if (p === "/api/state" && req.method === "GET") {
      const id = url.searchParams.get("id") || "";
      return sendJson(res, 200, {
        sessionId: session.id,
        phase: session.phase,
        known: session.players.has(id),
        connected: session.players.size,
      });
    }

    if (p === "/api/submit" && req.method === "POST") {
      const b = await readBody(req);
      const pl = session.players.get(String(b.id || ""));
      if (!pl) return sendJson(res, 404, { error: "unknown" });
      const tempNo = num(b.tempNo, 15, 45);
      const tempPlan = num(b.tempPlan, 15, 45);
      if (tempNo === null || tempPlan === null) return sendJson(res, 400, { error: "invalid" });
      Object.assign(pl, {
        city: String(b.city || "").slice(0, 20),
        floor: String(b.floor || "").slice(0, 20),
        orientation: String(b.orientation || "").slice(0, 20),
        shutters: String(b.shutters || "").slice(0, 20),
        clim: !!b.clim, tempNo, tempPlan, answered: true,
      });
      return sendJson(res, 200, { ok: true });
    }

    if (p === "/api/engage" && req.method === "POST") {
      const b = await readBody(req);
      const pl = session.players.get(String(b.id || ""));
      if (!pl) return sendJson(res, 404, { error: "unknown" });
      pl.gestures = Array.isArray(b.gestures) ? b.gestures.slice(0, 10).map((g) => String(g).slice(0, 30)) : [];
      pl.gain = num(b.gain, 0, 20) || 0;
      pl.engaged = pl.gestures.length > 0;
      const s = computeStats();
      return sendJson(res, 200, { ok: true, degreesSaved: s.degreesSaved, kwhSaved: s.kwhSaved });
    }

    // --- API écran (lecture) ---
    if (p === "/api/lobby" && req.method === "GET") {
      return sendJson(res, 200, { sessionId: session.id, phase: session.phase, players: playerList() });
    }
    if (p === "/api/stats" && req.method === "GET") {
      return sendJson(res, 200, computeStats());
    }

    // --- API animateur (protégée par ADMIN_TOKEN) ---
    if (p.startsWith("/api/admin/") && req.method === "POST") {
      if (!isAdmin(url)) return sendJson(res, 403, { error: "Mot de passe incorrect" });
      if (p === "/api/admin/check") return sendJson(res, 200, { ok: true });
      if (p === "/api/admin/start") { session.phase = "running"; session.startedAt = Date.now(); return sendJson(res, 200, { ok: true }); }
      if (p === "/api/admin/end") { session.phase = "ended"; return sendJson(res, 200, { ok: true }); }
      if (p === "/api/admin/reset") { session = newSession(); return sendJson(res, 200, { ok: true }); }
      return sendJson(res, 404, { error: "unknown" });
    }

    if (p === "/health") return sendJson(res, 200, { ok: true });

    // --- Fichiers statiques ---
    const file = ROUTES[p] || p;
    const filePath = path.normalize(path.join(PUBLIC_DIR, file));
    if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(data);
    });
  } catch (e) {
    sendJson(res, 400, { error: "bad request" });
  }
});

server.listen(PORT, () => console.log(`Météo de mon logement sur http://localhost:${PORT}`));
