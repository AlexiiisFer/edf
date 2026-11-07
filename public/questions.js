// Questionnaire partagé entre l'écran, les téléphones et le serveur.
// 5 thèmes, 6 questions clés (version démo), chacun répond à son rythme sur son téléphone.
const SECTIONS = [
  { id: 'env', n: 1, title: 'Environnement et implantation', e: '🌳' },
  { id: 'bati', n: 2, title: 'Enveloppe et inertie thermique', e: '🧱' },
  { id: 'vitres', n: 3, title: 'Ouvertures et apports solaires', e: '🪟' },
  { id: 'air', n: 4, title: 'Ventilation et évacuation de la chaleur', e: '🌬️' },
  { id: 'equip', n: 5, title: 'Équipements et apports internes', e: '🔌' },
];

// Version démo : 6 questions clés, une par thème (+ la climatisation).
const QUESTIONS = [
  { key: 'zone', section: 'env', n: '1.1', title: 'Dans quelle zone se situe le logement ?', options: [
    { v: 'urbain', e: '🏙️', label: 'Zone urbaine dense', hint: 'Centre-ville, effet d’îlot de chaleur' },
    { v: 'periurbain', e: '🏘️', label: 'Zone périurbaine ou lotissement' },
    { v: 'rural', e: '🌾', label: 'Zone rurale ou isolée' },
    { v: 'altitude', e: '⛰️', label: 'Altitude supérieure à 400 m' },
  ]},
  { key: 'logement', section: 'bati', n: '2.2', title: 'Quel type de logement ?', options: [
    { v: 'plainpied', e: '🏡', label: 'Maison de plain-pied' },
    { v: 'etages', e: '🏠', label: 'Maison à étages' },
    { v: 'appart', e: '🏢', label: 'Appartement en rez-de-chaussée ou intermédiaire' },
    { v: 'combles', e: '🔺', label: 'Appartement sous les toits / combles', hint: 'Le plus vulnérable' },
  ]},
  { key: 'vitrages', section: 'vitres', n: '3.1', title: 'Où sont vos principales surfaces vitrées ?', options: [
    { v: 'nordest', e: '🌅', label: 'Majoritairement au nord et à l’est' },
    { v: 'sud', e: '☀️', label: 'Majoritairement au sud', hint: 'Soleil haut, gérable par débords de toit' },
    { v: 'ouest', e: '🌇', label: 'Majoritairement à l’ouest', hint: 'Soleil rasant d’après-midi, très impactant' },
  ]},
  { key: 'protections', section: 'vitres', n: '3.2', title: 'Quelles protections solaires extérieures ?', options: [
    { v: 'clair', e: '⬜', label: 'Volets ou brise-soleil de couleur claire' },
    { v: 'sombre', e: '⬛', label: 'Volets de couleur sombre', hint: 'Absorbent et rayonnent la chaleur' },
    { v: 'toile', e: '⛱️', label: 'Stores bannes ou casquettes solaires', hint: 'Débords de toit, pergolas végétalisées' },
    { v: 'aucune', e: '🚫', label: 'Aucune protection extérieure', hint: 'Seulement stores ou rideaux intérieurs' },
  ]},
  { key: 'traversant', section: 'air', n: '4.1', title: 'Pouvez-vous créer un courant d’air la nuit ?', options: [
    { v: 'oui', e: '↔️', label: 'Oui : logement traversant ou tirage thermique', hint: 'Fenêtres sur façades opposées, ou en bas et en hauteur' },
    { v: 'non', e: '🔒', label: 'Non : mono-orienté ou impossible d’ouvrir la nuit', hint: 'Bruit, insécurité, pas de moustiquaires' },
  ]},
  { key: 'clim', section: 'equip', n: '5.2', title: 'Avez-vous une climatisation ?', options: [
    { v: 'pac', e: '❄️', label: 'Pompe à chaleur réversible fixe' },
    { v: 'mobile', e: '🧊', label: 'Climatiseur mobile', hint: 'Tuyau par la fenêtre : peu efficace, fait entrer l’air chaud' },
    { v: 'aucune', e: '🍃', label: 'Aucune climatisation' },
  ]},
];

// Réponses types quand une question est sautée (scénario de démonstration).
const DEFAULTS = { zone: 'periurbain', logement: 'appart', vitrages: 'sud', protections: 'clair', traversant: 'non', clim: 'aucune' };

// Scénario canicule de référence : 35 °C dehors, ajusté selon la zone.
const CANICULE_OUT = 35;
const ZONE_OUT = { urbain: 2, periurbain: 0, rural: -1, altitude: -3 };
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
  const outMax = Number.isFinite(out) ? out : CANICULE_OUT + (ZONE_OUT[A('zone')] || 0);
  let delta = -5;
  for (const [k, table] of Object.entries(EFFECTS)) {
    delta += table[A(k)] || 0;
  }
  const t = Math.min(42, Math.max(18, Math.round(outMax + delta)));
  return { out: outMax, tNo: t, grade: comfortGrade(t), complete: isComplete(answers) };
}

if (typeof module !== 'undefined') module.exports = { SECTIONS, QUESTIONS, DEFAULTS, CANICULE_OUT, computeProfile, comfortGrade, isComplete };
