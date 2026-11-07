// Hypothèses pédagogiques modifiables, pas des devis ni un calcul réglementaire.
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
// Coûts pour un petit équipement / une zone du logement, pose indicative incluse.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
const SOLUTIONS = [
  // Low tech : protéger, ventiler, limiter les apports
  { id: 'shutters', type: 'low', label: 'Fermer vos protections avant le soleil', detail: 'Vos volets ou stores existent déjà : les fermer côté soleil dès le matin. Aucun achat.', min: 0, max: 0, cooling: 1.5, saving: .12, life: 20, when: hasExterior },
  { id: 'shade', type: 'low', label: 'Ajouter une protection solaire extérieure', detail: 'Store, volet ou brise-soleil pour une baie exposée ; vérifier copropriété et autorisations.', min: 200, max: 1000, cooling: 1.5, saving: .12, life: 15, when: a => !hasExterior(a) },
  { id: 'night', type: 'low', label: 'Surventiler la nuit', detail: 'Ouvrir en grand quand dehors est plus frais, fermer au lever du soleil. Seulement si sécurité et qualité de l’air le permettent.', min: 0, max: 0, cooling: 1, saving: .08, life: 20 },
  { id: 'heat', type: 'low', label: 'Limiter les apports internes', detail: 'Couper les appareils en veille (multiprise à interrupteur), décaler four et lave-linge aux heures fraîches.', min: 0, max: 20, cooling: .5, saving: .04, life: 10 },
  { id: 'fan', type: 'low', label: 'Ajouter un ventilateur sobre', detail: 'Améliore le ressenti, sans abaisser la température de la pièce. Hypothèse : 30 W × 8 h × 40 jours.', min: 40, max: 150, cooling: 0, saving: .08, kwh: 9.6, life: 8, comfort: true },
  // High tech : mesurer, piloter, équiper
  { id: 'app', type: 'high', label: 'Alertes canicule et suivi de la clim dans l’appli', detail: 'Intégration envisagée avec EDF & moi : alerte météo à J-3, rappels de gestes, suivi Linky de la consommation de climatisation. Aucun gain chiffré.', min: 0, max: 0, cooling: 0, saving: 0, life: 20 },
  { id: 'sensors', type: 'high', label: 'Comparer les températures avec des capteurs', detail: 'Deux capteurs intérieur/extérieur et des alertes pour savoir quand ouvrir. La mesure seule ne garantit aucune économie.', min: 40, max: 150, cooling: 0, saving: 0, kwh: 2, life: 5 },
  { id: 'auto', type: 'high', label: 'Automatiser les protections solaires', detail: 'Fermeture selon le soleil et la météo prévue. Nécessite des protections existantes ou sélectionnées.', min: 200, max: 600, cooling: .5, saving: .04, kwh: 2, life: 10 },
  { id: 'control', type: 'high', label: 'Piloter la climatisation existante', detail: 'Commande connectée : consigne à 26 °C, arrêt en cas d’absence. Vérifier la compatibilité avant achat.', min: 80, max: 250, cooling: 0, saving: .15, kwh: 2, life: 5, when: hasClim },
  { id: 'replace', type: 'high', label: 'Remplacer le climatiseur mobile par une PAC air-air', detail: 'Un monosplit posé, bien plus efficace qu’un mobile. À dimensionner par un professionnel. Hypothèse été : 240 kWh, entretien 60 €/an.', min: 1500, max: 3500, cooling: 0, saving: 0, kwh: 240, upkeep: 60, life: 12, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', type: 'high', label: 'Installer une PAC air-air réversible', detail: 'Un monosplit posé, à dimensionner par un professionnel. Hypothèse été : 0,75 kW × 8 h × 40 jours, entretien 60 €/an. Chauffage non évalué.', min: 1500, max: 3500, cooling: 0, saving: 0, kwh: 240, upkeep: 60, life: 12, newAc: true, when: a => !hasClim(a) },
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
