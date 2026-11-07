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
// Scénario fictif de démonstration, indépendant d'une météo réelle.
const DEFAULTS = { city: "dijon", floor: "milieu", orientation: "sud", shutters: "rideaux", clim: "non" };
// Classes pédagogiques, sans lien avec les seuils réglementaires du DPE.
function comfortGrade(t) { return 'ABCDEFG'[[24, 26, 28, 30, 32, 34].filter(limit => t > limit).length]; }
const OUT_MAX = { dijon: 34, lyon: 35, paris: 33, marseille: 35, nord: 30 };
function computeProfile(answers = {}) {
  const A = k => answers[k] || DEFAULTS[k];
  const out = OUT_MAX[A("city")] || 33;
  let t = out - 6;
  t += { maison: 0, rdc: -1.5, milieu: .5, dernier: 2.5 }[A("floor")] || 0;
  t += { sud: 2, ouest: 2.5, est: 1, nord: -.5 }[A("orientation")] || 0;
  t += { exterieur: 0, rideaux: 1.5, aucun: 2.5 }[A("shutters")] || 0;
  t = Math.round(t);
  return { out, tNo: t, grade: comfortGrade(t), complete: QUESTIONS.every(q => q.options.some(o => o.v === answers[q.key])) };
}
if (typeof module !== "undefined") module.exports = { QUESTIONS, DEFAULTS, computeProfile, comfortGrade };
