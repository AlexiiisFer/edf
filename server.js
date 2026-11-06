// Météo de mon logement — session live façon quiz (Node.js, sans dépendance)
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { QUESTIONS } = require("./public/questions.js");

const PORT = process.env.PORT || 3000;
const QUESTION_MS = (Number(process.env.QUESTION_SECONDS) || 15) * 1000;
const RESULT_MS = (Number(process.env.RESULT_SECONDS) || 30) * 1000;
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_PLAYERS = 500;

// phase : lobby → question (q = 0..N-1) → result (chacun voit son résultat) → stats
let session = newSession();
function newSession() {
  return { id: crypto.randomUUID(), phase: "lobby", q: -1, endsAt: 0, players: new Map() };
}

function goTo(phase, q = -1) {
  session.phase = phase;
  session.q = q;
  session.endsAt = phase === "question" ? Date.now() + QUESTION_MS : phase === "result" ? Date.now() + RESULT_MS : 0;
}

function advance() {
  if (session.phase === "lobby") return goTo("question", 0);
  if (session.phase === "question") {
    return session.q + 1 < QUESTIONS.length ? goTo("question", session.q + 1) : goTo("result");
  }
  if (session.phase === "result") return goTo("stats");
}

// Avance automatique : fin du chrono, ou tout le monde a répondu
function tick() {
  const now = Date.now();
  if (session.phase === "question") {
    const key = QUESTIONS[session.q].key;
    const players = [...session.players.values()];
    const allAnswered = players.length > 0 && players.every((p) => p.answers[key] !== undefined);
    if (now >= session.endsAt) advance();
    else if (allAnswered && session.endsAt - now > 2500) session.endsAt = now + 2500; // petite pause avant la suite
  } else if (session.phase === "result" && now >= session.endsAt) {
    advance();
  }
}
setInterval(tick, 500);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const ROUTES = { "/": "/index.html", "/jouer": "/jouer.html", "/stats": "/stats.html" };

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

function publicState(id) {
  tick();
  const players = [...session.players.values()];
  const key = session.q >= 0 ? QUESTIONS[session.q].key : null;
  const me = id ? session.players.get(id) : null;
  return {
    sessionId: session.id,
    phase: session.phase,
    q: session.q,
    total: QUESTIONS.length,
    remaining: session.endsAt ? Math.max(0, session.endsAt - Date.now()) : 0,
    duration: session.phase === "question" ? QUESTION_MS : RESULT_MS,
    connected: players.length,
    answeredQ: key ? players.filter((p) => p.answers[key] !== undefined).length : 0,
    submitted: players.filter((p) => p.submitted).length,
    engaged: players.filter((p) => p.engaged).length,
    known: !!me,
    myAnswer: me && key ? me.answers[key] ?? null : null,
  };
}

function computeStats() {
  const all = [...session.players.values()];
  const list = all.filter((p) => p.submitted);
  const count = list.length;
  const avg = (k) => (count ? list.reduce((s, p) => s + p[k], 0) / count : 0);
  const engaged = list.filter((p) => p.engaged);
  const pct = (fn) => (count ? Math.round((list.filter(fn).length / count) * 100) : 0);
  const gestureCounts = {};
  engaged.forEach((p) => p.gestures.forEach((g) => (gestureCounts[g] = (gestureCounts[g] || 0) + 1)));
  return {
    phase: session.phase,
    connected: all.length,
    count,
    engagedCount: engaged.length,
    avgNoAction: Math.round(avg("tempNo") * 10) / 10,
    avgWithPlan: Math.round(avg("tempPlan") * 10) / 10,
    pctNoShutters: pct((p) => p.answers.shutters === "aucun"),
    pctClim: pct((p) => p.answers.clim === "oui"),
    pctTopFloor: pct((p) => p.answers.floor === "dernier"),
    pctTooHot: pct((p) => p.tempNo >= 28),
    degreesSaved: Math.round(engaged.reduce((s, p) => s + p.gain, 0)),
    kwhSaved: Math.round(engaged.reduce((s, p) => s + (p.answers.clim === "oui" ? 1.5 : 1.0), 0)),
    gestureCounts,
    hottest: count ? Math.max(...list.map((p) => p.tempNo)) : null,
    coolest: count ? Math.min(...list.map((p) => p.tempNo)) : null,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    // --- Téléphones ---
    if (p === "/api/join" && req.method === "POST") {
      if (session.players.size >= MAX_PLAYERS) return sendJson(res, 429, { error: "Session complète" });
      const id = crypto.randomUUID();
      session.players.set(id, { joinedAt: Date.now(), answers: {}, submitted: false, engaged: false, tempNo: 0, tempPlan: 0, gain: 0, gestures: [] });
      return sendJson(res, 200, { id, ...publicState(id) });
    }

    if (p === "/api/state" && req.method === "GET") {
      return sendJson(res, 200, publicState(url.searchParams.get("id") || ""));
    }

    if (p === "/api/answer" && req.method === "POST") {
      const b = await readBody(req);
      const pl = session.players.get(String(b.id || ""));
      if (!pl) return sendJson(res, 404, { error: "unknown" });
      tick();
      const q = QUESTIONS[Number(b.q)];
      if (session.phase !== "question" || Number(b.q) !== session.q || !q) return sendJson(res, 409, { error: "trop tard" });
      if (!q.options.some((o) => o.v === b.value)) return sendJson(res, 400, { error: "invalid" });
      pl.answers[q.key] = b.value;
      return sendJson(res, 200, { ok: true });
    }

    if (p === "/api/submit" && req.method === "POST") {
      const b = await readBody(req);
      const pl = session.players.get(String(b.id || ""));
      if (!pl) return sendJson(res, 404, { error: "unknown" });
      const tempNo = num(b.tempNo, 15, 45);
      const tempPlan = num(b.tempPlan, 15, 45);
      if (tempNo === null || tempPlan === null) return sendJson(res, 400, { error: "invalid" });
      Object.assign(pl, { tempNo, tempPlan, submitted: true });
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

    // --- Écran ---
    if (p === "/api/stats" && req.method === "GET") return sendJson(res, 200, computeStats());
    if (p === "/api/start" && req.method === "POST") { if (session.phase === "lobby") advance(); return sendJson(res, 200, publicState()); }
    if (p === "/api/next" && req.method === "POST") { advance(); return sendJson(res, 200, publicState()); }
    if (p === "/api/reset" && req.method === "POST") { session = newSession(); return sendJson(res, 200, publicState()); }

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
