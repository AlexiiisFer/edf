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
  // Plusieurs réponses possibles : la façade la plus exposée compte.
  { key: 'vitrages', section: 'vitres', multi: true, title: 'Vos fenêtres donnent au…', options: [
    { v: 'nord', e: '⬆️', label: 'Nord' },
    { v: 'sud', e: '⬇️', label: 'Sud' },
    { v: 'est', e: '➡️', label: 'Est' },
    { v: 'ouest', e: '⬅️', label: 'Ouest' },
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

// Questions complémentaires : posées après un DPE (groupe « dpe ») ou dans « Affiner » sans DPE (groupe « refine »).
// Elles précisent les entrées du calcul RITE ; when() masque celles qui ne concernent pas le logement.
const isTop = a => a.logement === 'combles' || a.logement === 'plainpied' || a.logement === 'etages';
const EXTRA_QUESTIONS = [
  { key: 'toit', groups: ['dpe', 'refine'], title: 'Couleur de votre toit ?', when: isTop, options: [
    { v: 'clair', e: '⬜', label: 'Clair' }, { v: 'moyen', e: '🟫', label: 'Moyen' }, { v: 'sombre', e: '⬛', label: 'Sombre' }, { v: 'nsp', e: '🤷', label: 'Je ne sais pas' },
  ]},
  { key: 'chambre', groups: ['dpe', 'refine'], title: 'Votre chambre donne au…', options: [
    { v: 'nord', e: '⬆️', label: 'Nord' }, { v: 'sud', e: '⬇️', label: 'Sud' }, { v: 'est', e: '➡️', label: 'Est' }, { v: 'ouest', e: '⬅️', label: 'Ouest' },
  ]},
  { key: 'nuitOuverte', groups: ['dpe', 'refine'], title: 'Pouvez-vous laisser ouvert la nuit ?', options: [
    { v: 'oui', e: '🪟', label: 'Oui' }, { v: 'non', e: '🔒', label: 'Non (bruit, sécurité)' },
  ]},
  { key: 'volets', groups: ['dpe', 'refine'], title: 'Quand fermez-vous vos volets ?', when: a => a.protections !== 'aucune', options: [
    { v: 'matin', e: '🌅', label: 'Dès le matin, côté soleil' }, { v: 'chaleur', e: '🌡️', label: 'Quand il fait chaud' }, { v: 'rarement', e: '🚫', label: 'Rarement' },
  ]},
  { key: 'aeration', groups: ['dpe', 'refine'], title: 'Aérez-vous la nuit ?', when: a => a.nuitOuverte !== 'non', options: [
    { v: 'oui', e: '🌙', label: 'Oui, quand il fait plus frais' }, { v: 'non', e: '✖️', label: 'Non' },
  ]},
  { key: 'typo', groups: ['refine'], title: 'Combien de pièces ?', options: [
    { v: 'T1', e: '1️⃣', label: 'T1' }, { v: 'T2', e: '2️⃣', label: 'T2' }, { v: 'T3', e: '3️⃣', label: 'T3' }, { v: 'T4', e: '4️⃣', label: 'T4' }, { v: 'T5', e: '5️⃣', label: 'T5 ou plus' },
  ]},
  { key: 'murs', groups: ['refine'], title: 'Les murs sont isolés ?', options: [
    { v: 'bonne', e: '🧱', label: 'Bien isolés' }, { v: 'faible', e: '🧶', label: 'Peu isolés' }, { v: 'aucune', e: '🕳️', label: 'Pas isolés' }, { v: 'nsp', e: '🤷', label: 'Je ne sais pas' },
  ]},
  { key: 'toiture', groups: ['refine'], title: 'Le toit est isolé ?', when: isTop, options: [
    { v: 'bonne', e: '🧱', label: 'Bien isolé' }, { v: 'faible', e: '🧶', label: 'Peu isolé' }, { v: 'aucune', e: '🕳️', label: 'Pas isolé' }, { v: 'nsp', e: '🤷', label: 'Je ne sais pas' },
  ]},
  { key: 'menuiserie', groups: ['refine'], title: 'Grande fenêtre du séjour ?', options: [
    { v: 'baie', e: '🪟', label: 'Baie coulissante' }, { v: 'portefenetre', e: '🚪', label: 'Porte-fenêtre' }, { v: 'fenetre', e: '🔲', label: 'Fenêtre' },
  ]},
  { key: 'brasseur', groups: ['refine'], title: 'Un ventilateur de plafond ?', options: [
    { v: 'oui', e: '🌀', label: 'Oui' }, { v: 'non', e: '✖️', label: 'Non' },
  ]},
];
// Données reprises du DPE, jamais demandées : département et inertie.
const HIDDEN_ANSWERS = { dept: v => /^(\d{2,3}|2A|2B)$/.test(String(v)), inertie: v => v === 'lourde' || v === 'legere' };
function findQuestion(key) { return QUESTIONS.find(q => q.key === key) || EXTRA_QUESTIONS.find(q => q.key === key); }
function validAnswer(key, value) {
  if (HIDDEN_ANSWERS[key]) return HIDDEN_ANSWERS[key](value);
  const q = findQuestion(key);
  return !!q && isValidAnswer(q, value);
}

// Réponses types quand une question est sautée (scénario de démonstration).
const DEFAULTS = { region: 'idf', logement: 'appart', vitrages: ['sud'], protections: 'clair', traversant: 'non', clim: 'aucune' };

// Scénario canicule : maximum extérieur selon la région (°C), valeurs de démonstration.
const REGION_OUT = { nord: 32, idf: 35, est: 35, rhone: 36, sud: 37 };
const CANICULE_OUT = 35;
// Écart intérieur/extérieur (°C) selon chaque réponse. Valeurs pédagogiques, pas une étude thermique.
// Effets des réponses complémentaires (°C), seulement si elles sont connues.
const EXTRA_EFFECTS = {
  toit: { clair: -.5, moyen: 0, sombre: 1, nsp: 0 },
  chambre: { nord: -.5, sud: 0, est: 0, ouest: .5 },
  murs: { bonne: -.5, faible: 0, aucune: .5, nsp: 0 },
  toiture: { bonne: -1, faible: 0, aucune: 1.5, nsp: 0 },
  volets: { matin: -1, chaleur: 0, rarement: .5 },
  aeration: { oui: -1, non: 0 },
};
const EFFECTS = {
  logement: { plainpied: 0, etages: .5, appart: -.5, combles: 3 },
  vitrages: { nord: -1.5, est: -.5, sud: .5, ouest: 2 },
  protections: { clair: -1.5, sombre: 0, toile: -1, aucune: 2 },
  traversant: { oui: -1.5, non: 1 },
};

// Classes pédagogiques, sans lien avec les seuils réglementaires du DPE.
function comfortGrade(t) { return 'ABCDEFG'[[24, 26, 28, 30, 32, 34].filter(limit => t > limit).length]; }
// Une réponse est valide si elle fait partie des options (ou, pour une question à choix multiple, une liste non vide d'options).
function isValidAnswer(q, v) {
  if (q.multi) return Array.isArray(v) && v.length > 0 && v.length <= q.options.length && new Set(v).size === v.length && v.every(x => q.options.some(o => o.v === x));
  return q.options.some(o => o.v === v);
}
function isComplete(answers = {}) { return QUESTIONS.every(q => isValidAnswer(q, answers[q.key])); }

// out (facultatif) : température extérieure maximale réelle, par exemple issue d'une prévision météo.
function computeProfile(answers = {}, out) {
  const A = k => answers[k] || DEFAULTS[k];
  const outMax = Number.isFinite(out) ? out : (REGION_OUT[A('region')] || CANICULE_OUT);
  let delta = -6;
  for (const [k, table] of Object.entries(EFFECTS)) {
    const v = A(k);
    delta += Array.isArray(v) ? Math.max(...v.map(x => table[x] || 0)) : (table[v] || 0);
  }
  for (const [k, table] of Object.entries(EXTRA_EFFECTS)) {
    const q = EXTRA_QUESTIONS.find(x => x.key === k);
    if (answers[k] !== undefined && (!q.when || q.when(answers))) delta += table[answers[k]] || 0;
  }
  const t = Math.min(42, Math.max(18, Math.round(outMax + delta)));
  return { out: outMax, tNo: t, grade: comfortGrade(t), complete: isComplete(answers) };
}

if (typeof module !== 'undefined') module.exports = { SECTIONS, QUESTIONS, EXTRA_QUESTIONS, findQuestion, validAnswer, DEFAULTS, REGION_OUT, isValidAnswer, computeProfile, comfortGrade, isComplete };
