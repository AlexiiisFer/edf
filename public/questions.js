// Questions partagées entre l'écran et les téléphones
const QUESTIONS = [
  { key: "city", title: "Où habitez-vous ?", options: [
    { v: "dijon", e: "🍷", label: "Dijon / Bourgogne" },
    { v: "lyon", e: "🦁", label: "Lyon / Rhône-Alpes" },
    { v: "paris", e: "🗼", label: "Paris / IDF" },
    { v: "marseille", e: "⛵", label: "Sud" },
    { v: "nord", e: "🌧️", label: "Nord / Ouest" },
  ]},
  { key: "floor", title: "Votre logement est…", options: [
    { v: "maison", e: "🏡", label: "Une maison" },
    { v: "rdc", e: "⬇️", label: "Appart. rez-de-chaussée" },
    { v: "milieu", e: "↕️", label: "Appart. étage intermédiaire" },
    { v: "dernier", e: "⬆️", label: "Appart. dernier étage" },
  ]},
  { key: "orientation", title: "Vos fenêtres principales donnent…", options: [
    { v: "sud", e: "☀️", label: "Au sud" },
    { v: "ouest", e: "🌇", label: "À l'ouest" },
    { v: "est", e: "🌅", label: "À l'est" },
    { v: "nord", e: "🌥️", label: "Au nord" },
  ]},
  { key: "shutters", title: "Volets ou stores extérieurs ?", options: [
    { v: "exterieur", e: "✅", label: "Oui, volets / stores" },
    { v: "rideaux", e: "🧵", label: "Seulement des rideaux" },
    { v: "aucun", e: "❌", label: "Rien du tout" },
  ]},
  { key: "clim", title: "Vous avez une climatisation ?", options: [
    { v: "oui", e: "❄️", label: "Oui" },
    { v: "envie", e: "🤔", label: "Non, mais j'y pense" },
    { v: "non", e: "🚫", label: "Non" },
  ]},
];
// Hypothèses d'impact (estimations de démo)
const IMPACT = {
  kwhPerDay: { oui: 3, envie: 5, non: 1 }, // kWh de clim évités / jour chaud si on suit le plan
  hotDays: 40,          // jours de forte chaleur par été
  eurPerKwh: 0.20,      // prix de l'électricité (€/kWh)
  gCo2PerKwh: 60,       // contenu carbone électricité France (g CO2/kWh)
  climPurchase: 1500,   // achat + pose d'une clim évités (€)
};
function impactFor(clim) {
  const kwh = (IMPACT.kwhPerDay[clim] ?? 1) * IMPACT.hotDays;
  return { kwh, eur: Math.round(kwh * IMPACT.eurPerKwh), co2: Math.round(kwh * IMPACT.gCo2PerKwh / 1000) };
}
const DEFAULTS = { city: "dijon", floor: "milieu", orientation: "sud", shutters: "rideaux", clim: "non" };
// Échelle pédagogique du scénario fictif : A ≤24, B ≤26, C ≤28,
// D ≤30, E ≤32, F ≤34, G >34 °C. Ce classement n'est pas un DPE.
function comfortGrade(t) { return 'ABCDEFG'[[24,26,28,30,32,34].filter(limit => t > limit).length]; }
const OUT_MAX = { dijon: 34, lyon: 35, paris: 33, marseille: 35, nord: 30 };
function computeProfile(answers = {}) {
  const A = k => answers[k] || DEFAULTS[k];
  const out = OUT_MAX[A("city")] || 33;
  let t = out - 6;
  t += { maison: 0, rdc: -1.5, milieu: 0.5, dernier: 2.5 }[A("floor")] || 0;
  t += { sud: 2, ouest: 2.5, est: 1, nord: -0.5 }[A("orientation")] || 0;
  t += { exterieur: 0, rideaux: 1.5, aucun: 2.5 }[A("shutters")] || 0;
  t = Math.round(t);
  const g = [];
  if (A("shutters") === "exterieur") g.push({ id: "volets", h: "9h", txt: "Fermez les volets côté soleil avant qu'il tape", gain: 3 });
  else g.push({ id: "occulter", h: "9h", txt: "Fermez rideaux épais ou tendez un drap clair devant les fenêtres exposées", gain: A("shutters") === "rideaux" ? 1.5 : 2 });
  g.push({ id: "fermer", h: "11h", txt: "Gardez les fenêtres fermées : dehors il fait plus chaud que dedans", gain: 1 });
  g.push({ id: "appareils", h: "14h", txt: "Évitez four, sèche-linge et halogènes aux heures chaudes", gain: 1 });
  g.push({ id: "ventil", h: "22h30", txt: "Ouvrez tout en grand et créez un courant d'air jusqu'au matin", gain: A("floor") === "dernier" ? 2.5 : 2 });
  g.push({ id: "brasseur", h: "Journée", txt: "Un ventilateur de plafond : -3°C ressentis pour ~10× moins qu'une clim", gain: 0 });
  const plan = Math.max(23, Math.round(t - g.reduce((s, x) => s + x.gain, 0)));
  return { out, tNo: t, tPlan: plan, gain: t - plan, gestures: g, grade: comfortGrade(t), planGrade: comfortGrade(plan), complete: QUESTIONS.every(q => q.options.some(o => o.v === answers[q.key])) };
}

if (typeof module !== "undefined") module.exports = { QUESTIONS, DEFAULTS, IMPACT, impactFor, computeProfile, comfortGrade };
