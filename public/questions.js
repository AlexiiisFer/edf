// Questionnaire partagé entre l'écran, les téléphones et le serveur.
// Version démo : 6 questions, chacun répond à son rythme sur son téléphone.
const SECTIONS = [
  { id: 'env', n: 1, title: 'Région', e: '📍' },
  { id: 'bati', n: 2, title: 'Logement', e: '🏠' },
  { id: 'vitres', n: 3, title: 'Fenêtres', e: '🪟' },
  { id: 'air', n: 4, title: 'Ventilation', e: '🌬️' },
  { id: 'equip', n: 5, title: 'Équipements', e: '❄️' },
];

// Version démo : la région d'abord, puis 5 questions clés.
const QUESTIONS = [
  { key: 'region', section: 'env', title: 'Votre région ?', options: [
    { v: 'nord', e: '🌧️', label: 'Nord / Ouest' },
    { v: 'idf', e: '🗼', label: 'Île-de-France' },
    { v: 'est', e: '🍷', label: 'Est / Bourgogne' },
    { v: 'rhone', e: '🦁', label: 'Rhône-Alpes' },
    { v: 'sud', e: '☀️', label: 'Sud' },
  ]},
  { key: 'logement', section: 'bati', title: 'Votre logement ?', options: [
    { v: 'plainpied', e: '🏡', label: 'Maison de plain-pied' },
    { v: 'etages', e: '🏠', label: 'Maison à étages' },
    { v: 'appart', e: '🏢', label: 'Appartement' },
    { v: 'combles', e: '🔺', label: 'Sous les toits' },
  ]},
  { key: 'vitrages', section: 'vitres', title: 'Vos fenêtres donnent surtout…', options: [
    { v: 'nordest', e: '🌅', label: 'Au nord ou à l’est' },
    { v: 'sud', e: '☀️', label: 'Au sud' },
    { v: 'ouest', e: '🌇', label: 'À l’ouest' },
  ]},
  { key: 'protections', section: 'vitres', title: 'Protections extérieures ?', options: [
    { v: 'clair', e: '⬜', label: 'Volets clairs' },
    { v: 'sombre', e: '⬛', label: 'Volets sombres' },
    { v: 'toile', e: '⛱️', label: 'Stores ou débord de toit' },
    { v: 'aucune', e: '🚫', label: 'Aucune' },
  ]},
  { key: 'traversant', section: 'air', title: 'Courant d’air possible la nuit ?', options: [
    { v: 'oui', e: '↔️', label: 'Oui' },
    { v: 'non', e: '🔒', label: 'Non' },
  ]},
  { key: 'clim', section: 'equip', title: 'Une climatisation ?', options: [
    { v: 'pac', e: '❄️', label: 'Oui, fixe (PAC)' },
    { v: 'mobile', e: '🧊', label: 'Oui, mobile' },
    { v: 'aucune', e: '🍃', label: 'Non' },
  ]},
];

// Réponses types quand une question est sautée (scénario de démonstration).
const DEFAULTS = { region: 'idf', logement: 'appart', vitrages: 'sud', protections: 'clair', traversant: 'non', clim: 'aucune' };

// Scénario canicule : maximum extérieur selon la région (°C), valeurs de démonstration.
const REGION_OUT = { nord: 32, idf: 35, est: 35, rhone: 36, sud: 37 };
const CANICULE_OUT = 35;
// Écart intérieur/extérieur (°C) selon chaque réponse. Valeurs pédagogiques, pas une étude thermique.
const EFFECTS = {
  logement: { plainpied: 0, etages: .5, appart: -.5, combles: 3 },
  vitrages: { nordest: -1.5, sud: .5, ouest: 2 },
  protections: { clair: -1.5, sombre: 0, toile: -1, aucune: 2 },
  traversant: { oui: -1.5, non: 1 },
};

// Classes pédagogiques, sans lien avec les seuils réglementaires du DPE.
function comfortGrade(t) { return 'ABCDEFG'[[24, 26, 28, 30, 32, 34].filter(limit => t > limit).length]; }
function isComplete(answers = {}) { return QUESTIONS.every(q => q.options.some(o => o.v === answers[q.key])); }

// out (facultatif) : température extérieure maximale réelle, par exemple issue d'une prévision météo.
function computeProfile(answers = {}, out) {
  const A = k => answers[k] || DEFAULTS[k];
  const outMax = Number.isFinite(out) ? out : (REGION_OUT[A('region')] || CANICULE_OUT);
  let delta = -6;
  for (const [k, table] of Object.entries(EFFECTS)) {
    delta += table[A(k)] || 0;
  }
  const t = Math.min(42, Math.max(18, Math.round(outMax + delta)));
  return { out: outMax, tNo: t, grade: comfortGrade(t), complete: isComplete(answers) };
}

if (typeof module !== 'undefined') module.exports = { SECTIONS, QUESTIONS, DEFAULTS, REGION_OUT, computeProfile, comfortGrade, isComplete };
