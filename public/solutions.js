// Hypothèses pédagogiques : effet supposé de chaque solution sur la température intérieure (°C).
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
const SOLUTIONS = [
  // Low tech : protéger, ventiler, limiter les apports
  { id: 'shutters', type: 'low', label: 'Fermer les volets', detail: 'Dès le matin, côté soleil.', cooling: 1.5, when: hasExterior },
  { id: 'shade', type: 'low', label: 'Store extérieur', detail: 'Fenêtre la plus exposée.', cooling: 1.5, when: a => !hasExterior(a) },
  { id: 'night', type: 'low', label: 'Aérer la nuit', detail: 'Quand il fait plus frais.', cooling: 1 },
  { id: 'heat', type: 'low', label: 'Moins d’appareils', detail: 'Veilles coupées, four le soir.', cooling: .5 },
  { id: 'fan', type: 'low', label: 'Ventilateur', detail: 'Rafraîchit le ressenti.', cooling: 0, comfort: true },
  // High tech : mesurer, piloter, équiper
  { id: 'sensors', type: 'high', label: 'Capteurs', detail: 'Savoir quand ouvrir.', cooling: 0 },
  { id: 'auto', type: 'high', label: 'Volets auto', detail: 'Fermeture selon le soleil.', cooling: .5 },
  { id: 'control', type: 'high', label: 'Piloter la clim', detail: 'Consigne à 26 °C.', cooling: 0, when: hasClim },
  { id: 'replace', type: 'high', label: 'PAC à la place du mobile', detail: 'Bien plus efficace.', cooling: 0, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', type: 'high', label: 'PAC air-air', detail: 'À dimensionner par un pro.', cooling: 0, newAc: true, when: a => !hasClim(a) },
];

function availableSolutions(answers) {
  return SOLUTIONS.filter(s => !s.when || s.when(answers));
}

function estimatePlan(answers, ids = []) {
  const profile = computeProfile(answers);
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const actions = availableSolutions(answers).filter(s => selected.has(s.id));
  // Pas d'automatisation fictive sans protection à piloter.
  const effective = actions.filter(s => s.id !== 'auto' || hasExterior(answers) || selected.has('shade'));
  const newAc = effective.some(s => s.newAc);
  const lowCooling = Math.min(3, effective.filter(s => s.type === 'low').reduce((n, s) => n + s.cooling, 0));
  const cooling = Math.min(3.5, effective.reduce((n, s) => n + s.cooling, 0));
  const lowTemp = Math.max(Math.min(23, profile.tNo), profile.tNo - lowCooling);
  // 26 °C est une cible illustrative pour une PAC, jamais une garantie de dimensionnement.
  const passive = Math.max(Math.min(23, profile.tNo), profile.tNo - cooling);
  const finalTemp = newAc ? Math.min(passive, 26) : passive;
  return { ids: effective.map(s => s.id), grade: profile.grade, lowGrade: comfortGrade(lowTemp), planGrade: comfortGrade(finalTemp),
    tNo: profile.tNo, tLow: lowTemp, tPlan: finalTemp, gain: profile.tNo - finalTemp, fan: effective.some(s => s.comfort) };
}

if (typeof module !== 'undefined') {
  // Même modèle pour le serveur et les navigateurs, sans dépendance externe.
  var { computeProfile, comfortGrade } = require('./questions.js');
  module.exports = { SOLUTIONS, availableSolutions, estimatePlan, hasClim, hasExterior };
}
