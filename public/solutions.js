// Hypothèses pédagogiques modifiables, pas des devis ni un calcul réglementaire.
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
// Coûts pour un petit équipement / une zone du logement, pose indicative incluse.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
const SOLUTIONS = [
  // Low tech : protéger, ventiler, limiter les apports
  { id: 'shutters', type: 'low', label: 'Fermer les volets', detail: 'Dès le matin, côté soleil.', min: 0, max: 0, cooling: 1.5, saving: .12, life: 20, when: hasExterior },
  { id: 'shade', type: 'low', label: 'Store extérieur', detail: 'Fenêtre la plus exposée.', min: 200, max: 1000, cooling: 1.5, saving: .12, life: 15, when: a => !hasExterior(a) },
  { id: 'night', type: 'low', label: 'Aérer la nuit', detail: 'Quand il fait plus frais.', min: 0, max: 0, cooling: 1, saving: .08, life: 20 },
  { id: 'heat', type: 'low', label: 'Moins d’appareils', detail: 'Veilles coupées, four le soir.', min: 0, max: 20, cooling: .5, saving: .04, life: 10 },
  { id: 'fan', type: 'low', label: 'Ventilateur', detail: 'Rafraîchit le ressenti.', min: 40, max: 150, cooling: 0, saving: .08, kwh: 9.6, life: 8, comfort: true },
  // High tech : mesurer, piloter, équiper
  { id: 'sensors', type: 'high', label: 'Capteurs', detail: 'Savoir quand ouvrir.', min: 40, max: 150, cooling: 0, saving: 0, kwh: 2, life: 5 },
  { id: 'auto', type: 'high', label: 'Volets auto', detail: 'Fermeture selon le soleil.', min: 200, max: 600, cooling: .5, saving: .04, kwh: 2, life: 10 },
  { id: 'control', type: 'high', label: 'Piloter la clim', detail: 'Consigne à 26 °C.', min: 80, max: 250, cooling: 0, saving: .15, kwh: 2, life: 5, when: hasClim },
  { id: 'replace', type: 'high', label: 'PAC à la place du mobile', detail: 'Bien plus efficace.', min: 1500, max: 3500, cooling: 0, saving: 0, kwh: 240, upkeep: 60, life: 12, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', type: 'high', label: 'PAC air-air', detail: 'À dimensionner par un pro.', min: 1500, max: 3500, cooling: 0, saving: 0, kwh: 240, upkeep: 60, life: 12, newAc: true, when: a => !hasClim(a) },
];

function availableSolutions(answers) {
  return SOLUTIONS.filter(s => !s.when || s.when(answers));
}

function estimatePlan(answers, ids = [], settings = {}) {
  const profile = computeProfile(answers);
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const actions = availableSolutions(answers).filter(s => selected.has(s.id));
  // Pas d'automatisation fictive sans protection à piloter.
  const effective = actions.filter(s => s.id !== 'auto' || hasExterior(answers) || selected.has('shade'));
  const tariff = Number.isFinite(settings.tariff) ? Math.min(1, Math.max(.05, settings.tariff)) : .25;
  const baselineKwh = hasClim(answers)
    ? (Number.isFinite(settings.baselineKwh) ? Math.min(10000, Math.max(0, settings.baselineKwh)) : 600) : 0;
  const savingFraction = Math.min(.5, 1 - effective.reduce((r, s) => r * (1 - s.saving), 1));
  const newAc = effective.some(s => s.newAc);
  // Le pilotage s'applique à la clim existante ; il est sans objet si elle est remplacée.
  const extraKwh = effective.filter(s => !s.newAc).reduce((n, s) => n + (s.kwh || 0), 0);
  const annualKwh = Math.max(0, (newAc ? 240 : baselineKwh) * (1 - savingFraction) + extraKwh);
  const annualUpkeep = effective.reduce((n, s) => n + (s.upkeep || 0), 0);
  const annualNet = (baselineKwh - annualKwh) * tariff - annualUpkeep;
  const lowCooling = Math.min(3, effective.filter(s => s.type === 'low').reduce((n, s) => n + s.cooling, 0));
  const cooling = Math.min(3.5, effective.reduce((n, s) => n + s.cooling, 0));
  const lowTemp = Math.max(Math.min(23, profile.tNo), profile.tNo - lowCooling);
  // 26 °C est une cible illustrative, jamais une garantie de dimensionnement.
  const passive = Math.max(Math.min(23, profile.tNo), profile.tNo - cooling);
  const finalTemp = newAc ? Math.min(passive, 26) : passive;
  const costMin = effective.reduce((n, s) => n + s.min, 0);
  const costMax = effective.reduce((n, s) => n + s.max, 0);
  function investmentAt(years, key) {
    return effective.reduce((n, s) => n + s[key] * (1 + Math.floor((years - 1) / s.life)), 0);
  }
  const timeline = [1, 5, 10].map(years => ({ years,
    operatingNet: annualNet * years,
    netMin: annualNet * years - investmentAt(years, 'max'),
    netMax: annualNet * years - investmentAt(years, 'min'),
  }));
  // Retour durable sur l'horizon affiché, renouvellements inclus.
  const balances = Array.from({length: 10}, (_, i) => annualNet * (i + 1) - investmentAt(i + 1, 'max'));
  const paybackIndex = effective.length && annualNet > 0 ? balances.findIndex((b, i) => b >= 0 && balances.slice(i).every(v => v >= 0)) : -1;
  return { ids: effective.map(s => s.id), grade: profile.grade, lowGrade: comfortGrade(lowTemp), planGrade: comfortGrade(finalTemp),
    tNo: profile.tNo, tLow: lowTemp, tPlan: finalTemp, gain: profile.tNo - finalTemp,
    fan: effective.some(s => s.comfort), costMin, costMax, tariff, baselineKwh, annualKwh,
    annualUpkeep, annualNet, kwhSaved: baselineKwh - annualKwh, timeline,
    paybackYears: paybackIndex < 0 ? null : paybackIndex + 1,
  };
}

if (typeof module !== 'undefined') {
  // Même modèle pour le serveur et les navigateurs, sans dépendance externe.
  var { computeProfile, comfortGrade } = require('./questions.js');
  module.exports = { SOLUTIONS, availableSolutions, estimatePlan, hasClim, hasExterior };
}
