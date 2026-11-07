// Hypothèses pédagogiques modifiables, pas des devis ni un calcul réglementaire.
// Coûts pour un petit équipement / une zone du logement, pose indicative incluse.
const SOLUTIONS = [
  { id: 'shutters', type: 'low', label: 'Utiliser les volets existants', detail: 'Fermer avant le soleil ; aucun nouvel équipement.', min: 0, max: 0, cooling: 1.5, saving: .12, life: 20, when: a => a.shutters === 'exterieur' },
  { id: 'shade', type: 'low', label: 'Ajouter une protection solaire extérieure', detail: 'Une baie équipée ; vérifier copropriété, autorisations et pose.', min: 200, max: 1000, cooling: 1.5, saving: .12, life: 15, when: a => a.shutters !== 'exterieur' },
  { id: 'night', type: 'low', label: 'Ventiler au bon moment', detail: 'Seulement si dehors est plus frais, sans compromettre sécurité ou qualité de l’air.', min: 0, max: 0, cooling: 1, saving: .08, life: 20 },
  { id: 'heat', type: 'low', label: 'Limiter les apports de chaleur', detail: 'Décaler four et appareils aux heures moins chaudes. Économies directes des appareils non chiffrées.', min: 0, max: 0, cooling: .5, saving: .04, life: 20 },
  { id: 'fan', type: 'low', label: 'Ajouter un ventilateur sobre', detail: 'Améliore le ressenti, sans abaisser la température de la pièce. Hypothèse : 30 W × 8 h × 40 jours.', min: 40, max: 150, cooling: 0, saving: .08, kwh: 9.6, life: 8, comfort: true },
  { id: 'sensors', type: 'high', label: 'Comparer les températures avec des capteurs', detail: 'Deux capteurs et des alertes. La mesure seule ne garantit aucune économie.', min: 40, max: 150, cooling: 0, saving: 0, kwh: 2, life: 5 },
  { id: 'auto', type: 'high', label: 'Automatiser les protections solaires', detail: 'Une ouverture compatible, fermeture selon le soleil. Nécessite des protections existantes ou sélectionnées.', min: 200, max: 600, cooling: .5, saving: .04, kwh: 2, life: 10 },
  { id: 'control', type: 'high', label: 'Piloter la climatisation existante', detail: 'Commande compatible selon présence et consigne. Vérifier la compatibilité avant achat.', min: 80, max: 250, cooling: 0, saving: .15, kwh: 2, life: 5, when: a => a.clim === 'oui' },
  { id: 'ac', type: 'high', label: 'Installer une PAC air-air réversible', detail: 'Un monosplit posé, à dimensionner par un professionnel. Hypothèse été : 0,75 kW × 8 h × 40 jours, entretien 60 €/an. Chauffage non évalué.', min: 1500, max: 3500, cooling: 0, saving: 0, kwh: 240, upkeep: 60, life: 12, when: a => a.clim !== 'oui' },
];

function availableSolutions(answers) {
  return SOLUTIONS.filter(s => !s.when || s.when(answers));
}

function estimatePlan(answers, ids = [], settings = {}) {
  const profile = computeProfile(answers);
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const actions = availableSolutions(answers).filter(s => selected.has(s.id));
  // Pas d'automatisation fictive sans protection à piloter.
  const effective = actions.filter(s => s.id !== 'auto' || answers.shutters === 'exterieur' || selected.has('shade'));
  const tariff = Number.isFinite(settings.tariff) ? Math.min(1, Math.max(.05, settings.tariff)) : .25;
  const baselineKwh = answers.clim === 'oui'
    ? (Number.isFinite(settings.baselineKwh) ? Math.min(10000, Math.max(0, settings.baselineKwh)) : 600) : 0;
  const savingFraction = Math.min(.5, 1 - effective.reduce((r, s) => r * (1 - s.saving), 1));
  const newAc = effective.some(s => s.id === 'ac');
  const extraKwh = effective.filter(s => s.id !== 'ac').reduce((n, s) => n + (s.kwh || 0), 0);
  const annualKwh = Math.max(0, (newAc ? 240 : baselineKwh) * (1 - savingFraction) + extraKwh);
  const annualUpkeep = effective.reduce((n, s) => n + (s.upkeep || 0), 0);
  const annualNet = (baselineKwh - annualKwh) * tariff - annualUpkeep;
  const lowCooling = Math.min(3, effective.filter(s => s.type === 'low').reduce((n, s) => n + s.cooling, 0));
  const cooling = Math.min(3.5, effective.reduce((n, s) => n + s.cooling, 0));
  const lowTemp = Math.max(Math.min(23, profile.tNo), profile.tNo - lowCooling);
  // 26 °C est une cible illustrative, jamais une garantie de dimensionnement.
  const finalTemp = newAc ? Math.min(Math.max(Math.min(23, profile.tNo), profile.tNo - cooling), 26) : Math.max(Math.min(23, profile.tNo), profile.tNo - cooling);
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
  module.exports = { SOLUTIONS, availableSolutions, estimatePlan };
}
