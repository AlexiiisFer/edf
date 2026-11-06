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
if (typeof module !== "undefined") module.exports = { QUESTIONS, DEFAULTS, IMPACT, impactFor };
