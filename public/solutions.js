// Hypothèses pédagogiques : effet supposé de chaque solution sur la température intérieure (°C), prix indicatif et temps demandé.
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
// price : prix d'achat indicatif (€). effort : 'daily' = un geste chaque jour de chaleur, 'once' = à installer une fois, 'auto' = domotique.
const SOLUTIONS = [
  // Low tech : protéger, ventiler, limiter les apports
  { id: 'shutters', type: 'low', label: 'Volets fermés', detail: 'Dès le matin, côté soleil.', price: 0, effort: 'daily', cooling: 1.5, when: hasExterior },
  { id: 'shade', type: 'low', label: 'Store extérieur', detail: 'Fenêtre la plus exposée.', price: 300, effort: 'daily', cooling: 1.5, when: a => !hasExterior(a) },
  { id: 'night', type: 'low', label: 'Aérer la nuit', detail: 'Quand il fait plus frais.', price: 0, effort: 'daily', cooling: 1 },
  { id: 'heat', type: 'low', label: 'Couper les veilles', detail: 'Veilles coupées, four le soir.', price: 0, effort: 'daily', cooling: .5 },
  { id: 'fan', type: 'low', label: 'Ventilateur', detail: 'Rafraîchit le ressenti.', price: 60, effort: 'once', cooling: 0, comfort: true },
  // High tech : domotique et équipement
  { id: 'sensors', type: 'high', label: 'Capteurs', detail: 'Alerte quand ouvrir ou fermer.', price: 50, effort: 'auto', cooling: .5 },
  { id: 'auto', type: 'high', label: 'Volets auto', detail: 'Se ferment seuls au soleil.', price: 400, effort: 'auto', cooling: 1.5 },
  { id: 'control', type: 'high', label: 'Clim programmée', detail: 'Heures creuses, consigne 26 °C.', price: 80, effort: 'auto', cooling: 0, when: hasClim },
  { id: 'replace', type: 'high', label: 'PAC à la place du mobile', detail: 'Bien plus efficace.', price: 2500, effort: 'once', cooling: 0, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', type: 'high', label: 'Clim PAC air-air', detail: 'À dimensionner par un pro.', price: 2500, effort: 'once', cooling: 0, newAc: true, when: a => !hasClim(a) },
];

// Profils budget et temps disponible (3 niveaux chacun).
const BUDGETS = [
  { id: 'petit', label: 'Petit', hint: '≤ 200 €', max: 200 },
  { id: 'moyen', label: 'Moyen', hint: '≤ 1 000 €', max: 1000 },
  { id: 'large', label: 'Large', hint: '+ de 1 000 €', max: Infinity },
];
const TIMES = [
  { id: 'peu', label: 'Peu', efforts: ['once', 'auto'] },
  { id: 'unpeu', label: 'Un peu', efforts: ['daily', 'once', 'auto'], maxDaily: 2 },
  { id: 'beaucoup', label: 'Beaucoup', efforts: ['daily', 'once', 'auto'] },
];

// Une solution est utilisable si ses prérequis sont remplis par le logement ou par les autres choix.
function usable(s, answers, selected) {
  if (s.id === 'auto') return hasExterior(answers) || selected.has('shade');
  return true;
}

// Propose des choix adaptés au budget et au temps : les plus efficaces d'abord, dans la limite du budget.
function recommend(answers, budgetId = 'moyen', timeId = 'unpeu') {
  const budget = BUDGETS.find(b => b.id === budgetId) || BUDGETS[1];
  const time = TIMES.find(t => t.id === timeId) || TIMES[1];
  const hot = computeProfile(answers).tNo >= 29;
  const value = s => s.cooling + (s.comfort ? .8 : 0) + (s.newAc && hot ? 3 : 0) + (s.id === 'control' ? 1 : 0);
  const pool = availableSolutions(answers).filter(s => time.efforts.includes(s.effort) && value(s) > 0)
    .sort((a, b) => value(b) - value(a) || a.price - b.price);
  const picked = new Set(); let spent = 0, daily = 0;
  for (let pass = 0; pass < 2; pass++) for (const s of pool) {
    if (picked.has(s.id) || spent + s.price > budget.max || !usable(s, answers, picked)) continue;
    if (s.effort === 'daily' && time.maxDaily && daily >= time.maxDaily) continue;
    picked.add(s.id); spent += s.price; if (s.effort === 'daily') daily++;
  }
  return SOLUTIONS.filter(s => picked.has(s.id)).map(s => s.id);
}

// Offres EDF (Tarif Bleu, prix du kWh TTC au 1er août 2026, à vérifier avant usage) et usages d'une clim sur un été.
const OFFERS = {
  base: { label: 'Tarif Bleu · option Base', hp: .2001, hc: .2001 },
  hphc: { label: 'Tarif Bleu · option Heures Creuses', hp: .2142, hc: .1589 },
};
const CLIM_USAGE = {
  days: 40,
  h24: { label: 'Clim en continu, H24 à 22 °C', kw: .9, hpHours: 16, hcHours: 8 },
  offPeak: { label: 'Clim programmée aux heures creuses, 26 °C', kw: .75, hpHours: 0, hcHours: 8 },
  fan: { label: 'Ventilateur', kw: .03, hpHours: 8, hcHours: 0 },
};
// kWh et coût d'un usage avec une offre : heures pleines et heures creuses facturées chacune à leur prix.
function usageCost(u, offer = OFFERS.hphc, days = CLIM_USAGE.days) {
  const hpKwh = u.kw * u.hpHours, hcKwh = u.kw * u.hcHours, perDay = hpKwh * offer.hp + hcKwh * offer.hc;
  return { kwh: (hpKwh + hcKwh) * days, perDay, cost: perDay * days };
}

function availableSolutions(answers) {
  return SOLUTIONS.filter(s => !s.when || s.when(answers));
}

function estimatePlan(answers, ids = []) {
  const profile = computeProfile(answers);
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const actions = availableSolutions(answers).filter(s => selected.has(s.id));
  const effective = actions.filter(s => usable(s, answers, selected));
  const newAc = effective.some(s => s.newAc);
  const lowCooling = Math.min(3, effective.filter(s => s.type === 'low').reduce((n, s) => n + s.cooling, 0));
  const cooling = Math.min(3.5, effective.reduce((n, s) => n + s.cooling, 0));
  const lowTemp = Math.max(Math.min(23, profile.tNo), profile.tNo - lowCooling);
  // 26 °C est une cible illustrative pour une PAC, jamais une garantie de dimensionnement.
  const passive = Math.max(Math.min(23, profile.tNo), profile.tNo - cooling);
  const finalTemp = newAc ? Math.min(passive, 26) : passive;
  return { ids: effective.map(s => s.id), grade: profile.grade, lowGrade: comfortGrade(lowTemp), planGrade: comfortGrade(finalTemp),
    tNo: profile.tNo, tLow: lowTemp, tPlan: finalTemp, gain: profile.tNo - finalTemp, fan: effective.some(s => s.comfort),
    price: effective.reduce((n, s) => n + s.price, 0) };
}

if (typeof module !== 'undefined') {
  // Même modèle pour le serveur et les navigateurs, sans dépendance externe.
  var { computeProfile, comfortGrade } = require('./questions.js');
  module.exports = { SOLUTIONS, BUDGETS, TIMES, recommend, OFFERS, CLIM_USAGE, usageCost, availableSolutions, estimatePlan, hasClim, hasExterior };
}
