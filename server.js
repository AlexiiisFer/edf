// Météo de mon logement — session live façon quiz (Node.js, sans dépendance)
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { QUESTIONS, SECTIONS, computeProfile, isComplete } = require("./public/questions.js");

const { estimatePlan, availableSolutions } = require("./public/solutions.js");

const PORT = process.env.PORT || 3000;
// Durée laissée à la salle pour le questionnaire (chacun avance à son rythme).
const QUESTION_MS = (Number(process.env.QUESTIONNAIRE_SECONDS) || 45) * 1000;
// Durée totale entre « Commencer » et l'affichage automatique des statistiques.
const TOTAL_MS = Math.max(QUESTION_MS + 10000, (Number(process.env.TOTAL_SECONDS) || 120) * 1000);
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_PLAYERS = 500;

// phase : lobby → question (questionnaire libre sur téléphone) → result (chacun fait son plan) → stats
let session = newSession();
function newSession() {
  return { id: crypto.randomUUID(), phase: "lobby", q: -1, endsAt: 0, startedAt: 0, players: new Map() };
}

function goTo(phase, q = -1) {
  session.phase = phase;
  session.q = q;
  if (phase === "question") session.startedAt = Date.now();
  // Questionnaire : QUESTION_MS ; choix des solutions : jusqu'à TOTAL_MS après le lancement.
  session.endsAt = phase === "question" ? Date.now() + QUESTION_MS : phase === "result" ? session.startedAt + TOTAL_MS : 0;
}

function advance() {
  if (session.phase === "lobby") return goTo("question", 0);
  if (session.phase === "question") return goTo("result");
  if (session.phase === "result") return goTo("stats");
}

// Avance automatique : fin du chrono, ou tout le monde a terminé le questionnaire
function tick() {
  const now = Date.now();
  if (session.phase === "question") {
    const players = [...session.players.values()];
    const allAnswered = players.length > 0 && players.every((p) => isComplete(p.answers));
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
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
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
  const me = id ? session.players.get(id) : null;
  return {
    sessionId: session.id,
    phase: session.phase,
    q: session.q,
    total: QUESTIONS.length,
    remaining: session.endsAt ? Math.max(0, session.endsAt - Date.now()) : 0,
    duration: session.phase === "question" ? QUESTION_MS : 0,
    statsIn: ["question", "result"].includes(session.phase) ? Math.max(0, session.startedAt + TOTAL_MS - Date.now()) : 0,
    connected: players.length,
    completed: players.filter((p) => isComplete(p.answers)).length,
    sectionsDone: SECTIONS.map((s) => players.filter((p) => QUESTIONS.filter((q) => q.section === s.id).every((q) => p.answers[q.key] !== undefined)).length),
    submitted: players.filter((p) => p.submitted).length,
    engaged: players.filter((p) => p.engaged).length,
    known: !!me,
    participantNumber: me ? me.number : null,
    answers: me ? me.answers : undefined,
    profile: me && (session.phase === "result" || session.phase === "stats") ? computeProfile(me.answers) : null,
    plan: me?.plan || null,
  };
}

function computeStats() {
  const all = [...session.players.values()];
  const list = all.filter(p => Object.keys(p.answers).length > 0).map(p => {
    const profile = computeProfile(p.answers);
    const plan = p.plan || estimatePlan(p.answers);
    return { ...p, tempNo: profile.tNo, tempPlan: plan.tPlan, profile: { ...profile, planGrade: plan.planGrade }, plan };
  });
  const count = list.length;
  const avg = (k) => (count ? list.reduce((s, p) => s + p[k], 0) / count : 0);
  const engaged = list.filter((p) => p.submitted);
  const pct = (fn) => (count ? Math.round((list.filter(fn).length / count) * 100) : 0);
  const gestureCounts = {};
  engaged.forEach((p) => p.gestures.forEach((g) => (gestureCounts[g] = (gestureCounts[g] || 0) + 1)));
  return {
    phase: session.phase,
    connected: all.length,
    count,
    engagedCount: engaged.length,
    pendingCount: all.length - count,
    validatedCount: list.filter(p => p.plan && p.submitted).length,
    lowGradeCounts: Object.fromEntries([..."ABCDEFG"].map(g => [g, list.filter(p => p.plan.lowGrade === g).length])),
    gradeCounts: Object.fromEntries([..."ABCDEFG"].map(g => [g, list.filter(p => p.profile.grade === g).length])),
    planGradeCounts: Object.fromEntries([..."ABCDEFG"].map(g => [g, list.filter(p => p.profile.planGrade === g).length])),
    profiles: all.map(p => {
      const profile = Object.keys(p.answers).length ? computeProfile(p.answers) : null;
      const plan = p.plan || (profile ? estimatePlan(p.answers) : null);
      return { number: p.number, grade: profile?.grade || null, lowGrade: plan?.lowGrade || null, planGrade: plan?.planGrade || null, validated: !!p.plan, complete: profile?.complete || false };
    }),
    avgNoAction: Math.round(avg("tempNo") * 10) / 10,
    avgWithPlan: Math.round(avg("tempPlan") * 10) / 10,
    pctNoShutters: pct((p) => p.answers.protections === "aucune"),
    pctClim: pct((p) => p.answers.clim === "pac" || p.answers.clim === "mobile"),
    pctTopFloor: pct((p) => p.answers.logement === "combles"),
    pctTooHot: pct((p) => p.tempNo >= 28),
    degreesSaved: Math.round(engaged.reduce((s, p) => s + p.plan.gain, 0)),
    gestureCounts,
    // Réponses de la salle par question, pour les chiffres en direct de l'écran projeté.
    answerCounts: Object.fromEntries(QUESTIONS.map((q) => [q.key, Object.fromEntries(q.options.map((o) => [o.v, all.filter((p) => p.answers[q.key] === o.v).length]))])),
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
      session.players.set(id, { number: session.players.size + 1, joinedAt: Date.now(), answers: {}, submitted: false, engaged: false, tempNo: 0, tempPlan: 0, gain: 0, gestures: [] });
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
      const q = QUESTIONS.find((x) => x.key === b.key);
      if (session.phase === "lobby") return sendJson(res, 409, { error: "Le questionnaire n’a pas commencé" });
      if (!q || !q.options.some((o) => o.v === b.value)) return sendJson(res, 400, { error: "invalid" });
      pl.answers[q.key] = b.value;
      return sendJson(res, 200, { ok: true });
    }

    if (p === "/api/engage" && req.method === "POST") {
      const b = await readBody(req);
      const pl = session.players.get(String(b.id || ""));
      if (!pl) return sendJson(res, 404, { error: "Participant inconnu" });
      if (session.phase === "lobby") return sendJson(res, 409, { error: "Le questionnaire n’a pas commencé" });
      if (!Object.keys(pl.answers).length) return sendJson(res, 400, { error: "Répondez au moins à une question avant de valider" });
      const valid = new Set(availableSolutions(pl.answers).map(s => s.id));
      if (!Array.isArray(b.actions) || b.actions.length > 20 || b.actions.some(id => !valid.has(id))) return sendJson(res, 400, { error: "Actions invalides" });
      const plan = estimatePlan(pl.answers, b.actions);
      Object.assign(pl, { plan, gestures: plan.ids, gain: plan.gain, engaged: plan.ids.length > 0, submitted: true, tempNo: plan.tNo, tempPlan: plan.tPlan });
      return sendJson(res, 200, { ok: true, plan });
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
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream", "Cache-Control": filePath.endsWith(".woff2") ? "public, max-age=604800" : "no-cache" });
      res.end(data);
    });
  } catch (e) {
    sendJson(res, 400, { error: "bad request" });
  }
});

server.listen(PORT, () => console.log(`Météo de mon logement sur http://localhost:${PORT}`));
