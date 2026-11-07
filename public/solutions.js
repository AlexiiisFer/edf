// Hypothèses pédagogiques : effet supposé de chaque solution sur la température intérieure (°C), prix indicatif,
// délai de mise en place et temps demandé. Ni devis ni étude thermique.
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
const isHouse = a => a.logement === 'plainpied' || a.logement === 'etages';
// type : 'low' = geste manuel, 'high' = équipement à acheter ou installer.
// price / priceMax : fourchette indicative (€), par m² si unit = 'm²' (qty = surface supposée pour le budget).
// quote : prix sur étude. delay : délai de mise en place. effort : 'daily' geste quotidien, 'once' installation, 'auto' automatique.
const SOLUTIONS = [
  // Gestes manuels
  { id: 'shutters', type: 'low', label: 'Volets fermés', detail: 'Dès le matin, côté soleil.', price: 0, delay: 'tout de suite', effort: 'daily', cooling: 1.5, when: hasExterior },
  { id: 'night', type: 'low', label: 'Aérer la nuit', detail: 'Quand il fait plus frais dehors.', price: 0, delay: 'tout de suite', effort: 'daily', cooling: 1 },
  { id: 'chimney', type: 'low', label: 'Effet cheminée', detail: 'Ouvrir en bas et en haut : l’air chaud sort par le haut.', price: 0, delay: '3 min', effort: 'daily', cooling: .5, when: a => a.logement === 'etages' || a.traversant === 'oui' },
  { id: 'heat', type: 'low', label: 'Couper les veilles', detail: 'Veilles coupées, four le soir.', price: 0, delay: 'tout de suite', effort: 'daily', cooling: .5 },
  // Équipements
  { id: 'paint', type: 'high', label: 'Volets clairs', detail: 'Repeindre les volets sombres, qui chauffent.', price: 50, priceMax: 150, delay: '1 jour', effort: 'once', cooling: 1, when: a => a.protections === 'sombre' },
  { id: 'shade', type: 'high', label: 'Store extérieur', detail: 'Fenêtre la plus exposée.', price: 300, delay: '1 jour', effort: 'daily', cooling: 1.5, when: a => !hasExterior(a) },
  { id: 'fan', type: 'high', label: 'Brasseur d’air', detail: 'Ventilateur de plafond : + de confort ressenti.', price: 70, priceMax: 200, delay: '1 jour', effort: 'once', cooling: 0, comfort: true },
  { id: 'mist', type: 'high', label: 'Brumisateur', detail: 'Évaporation d’eau pour rafraîchir l’air.', price: 80, delay: '1 jour', effort: 'once', cooling: .5, comfort: true },
  { id: 'screen', type: 'high', label: 'Écran d’alertes', detail: 'Alerte et conseils : quand fermer volets et fenêtres.', price: 70, priceMax: 100, delay: '3 semaines', effort: 'auto', cooling: .5 },
  { id: 'auto', type: 'high', label: 'Volets auto', detail: 'Se ferment seuls selon la chaleur.', price: 400, delay: '1 semaine', effort: 'auto', cooling: 1.5 },
  { id: 'saferoom', type: 'high', label: 'Pièce refuge', detail: 'Garder une pièce fraîche en priorité (rideaux, ventilateur).', price: 200, delay: '5 h', effort: 'once', cooling: 1 },
  { id: 'saferoomPlus', type: 'high', label: 'Pièce refuge équipée', detail: 'Une pièce isolée et rafraîchie.', price: 1800, delay: '3 jours', effort: 'once', cooling: 2 },
  { id: 'glass', type: 'high', label: 'Vitrage intelligent', detail: 'Se teinte au soleil, limite la clim.', price: 350, priceMax: 950, delay: '1 à 2 jours', effort: 'auto', cooling: 1.5 },
  { id: 'coolroof', type: 'high', label: 'Cool roof', detail: 'Peinture réfléchissante sur le toit.', price: 35, priceMax: 60, unit: 'm²', qty: 20, delay: '3 à 7 jours', effort: 'once', cooling: 1.5, when: isHouse },
  { id: 'solarChimney', type: 'high', label: 'Cheminée solaire', detail: 'Évacue l’air chaud par le toit.', price: 120, delay: '2 semaines', effort: 'auto', cooling: 1, when: isHouse },
  { id: 'green', type: 'high', label: 'Mur végétal', detail: 'Ombrage et fraîcheur, pousse en 1 à 3 ans.', price: 150, priceMax: 350, unit: 'm²', qty: 4, delay: '1 à 3 ans', effort: 'once', cooling: 1, when: isHouse },
  { id: 'water', type: 'high', label: 'Point d’eau', detail: 'Bassin ou cascade au jardin.', price: 1300, delay: '6 mois à 1 an', effort: 'once', cooling: .5, when: isHouse },
  { id: 'canadian', type: 'high', label: 'Puits canadien', detail: 'L’air entre par le sol, plus frais.', price: 5000, priceMax: 10000, delay: '2 semaines', effort: 'auto', cooling: 2, when: isHouse },
  { id: 'twin', type: 'high', label: 'Jumeau numérique', detail: 'Plans, matériaux, soleil : prédit la pièce qui résiste le mieux.', price: 0, quote: true, delay: 'à l’étude', effort: 'auto', cooling: 0 },
  { id: 'adiabatic', type: 'high', label: 'Rafraîchisseur adiabatique', detail: 'Clim à l’eau qui consomme moins.', price: 200, priceMax: 600, delay: '1 jour', effort: 'once', cooling: 1.5 },
  { id: 'control', type: 'high', label: 'Clim programmée', detail: 'Heures creuses, consigne 26 °C.', price: 80, delay: '1 jour', effort: 'auto', cooling: 0, when: hasClim },
  { id: 'replace', type: 'high', label: 'PAC à la place du mobile', detail: 'Bien plus efficace.', price: 2500, delay: '1 à 2 jours', effort: 'once', cooling: 0, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', type: 'high', label: 'Clim PAC air-air', detail: 'À dimensionner par un pro.', price: 2500, delay: '1 à 2 jours', effort: 'once', cooling: 0, newAc: true, when: a => !hasClim(a) },
];
// Coût indicatif d'une solution pour le budget (bas et haut de fourchette).
const costMin = s => s.price * (s.qty || 1);
const costMax = s => (s.priceMax ?? s.price) * (s.qty || 1);

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
    .sort((a, b) => value(b) - value(a) || costMin(a) - costMin(b));
  const picked = new Set(); let spent = 0, daily = 0;
  for (let pass = 0; pass < 2; pass++) for (const s of pool) {
    if (picked.size >= 6) break;
    if (picked.has(s.id) || spent + costMin(s) > budget.max || !usable(s, answers, picked)) continue;
    if (s.effort === 'daily' && time.maxDaily && daily >= time.maxDaily) continue;
    picked.add(s.id); spent += costMin(s); if (s.effort === 'daily') daily++;
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
    price: effective.reduce((n, s) => n + costMin(s), 0), priceMax: effective.reduce((n, s) => n + costMax(s), 0) };
}

if (typeof module !== 'undefined') {
  // Même modèle pour le serveur et les navigateurs, sans dépendance externe.
  var { computeProfile, comfortGrade } = require('./questions.js');
  module.exports = { costMin, costMax, SOLUTIONS, BUDGETS, TIMES, recommend, OFFERS, CLIM_USAGE, usageCost, availableSolutions, estimatePlan, hasClim, hasExterior };
}
