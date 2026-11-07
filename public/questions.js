// Questionnaire partagé entre l'écran, les téléphones et le serveur.
// 5 sections, 16 questions, chacun répond à son rythme sur son téléphone.
const SECTIONS = [
  { id: 'env', n: 1, title: 'Environnement et implantation', e: '🌳' },
  { id: 'bati', n: 2, title: 'Enveloppe et inertie thermique', e: '🧱' },
  { id: 'vitres', n: 3, title: 'Ouvertures et apports solaires', e: '🪟' },
  { id: 'air', n: 4, title: 'Ventilation et évacuation de la chaleur', e: '🌬️' },
  { id: 'equip', n: 5, title: 'Équipements et apports internes', e: '🔌' },
];

const QUESTIONS = [
  // 1. Environnement
  { key: 'zone', section: 'env', n: '1.1', title: 'Dans quelle zone se situe le logement ?', options: [
    { v: 'urbain', e: '🏙️', label: 'Zone urbaine dense', hint: 'Centre-ville, effet d’îlot de chaleur' },
    { v: 'periurbain', e: '🏘️', label: 'Zone périurbaine ou lotissement' },
    { v: 'rural', e: '🌾', label: 'Zone rurale ou isolée' },
    { v: 'altitude', e: '⛰️', label: 'Altitude supérieure à 400 m' },
  ]},
  { key: 'ombrage', section: 'env', n: '1.2', title: 'Quel ombrage naturel autour du logement en été ?', options: [
    { v: 'masques', e: '🌳', label: 'Masques solaires importants', hint: 'Grands arbres au sud/ouest, bâtiments qui bloquent le soleil de l’après-midi' },
    { v: 'partiel', e: '⛅', label: 'Ombrage partiel' },
    { v: 'aucun', e: '☀️', label: 'Aucun ombrage', hint: 'Exposé au soleil toute la journée' },
  ]},
  { key: 'abords', section: 'env', n: '1.3', title: 'L’environnement immédiat favorise-t-il la fraîcheur ?', options: [
    { v: 'vegetal', e: '🌿', label: 'Oui : végétation, pelouse ou point d’eau' },
    { v: 'mineral', e: '🧱', label: 'Non : surfaces minérales', hint: 'Terrasse béton, cour en enrobé, rue goudronnée' },
  ]},
  // 2. Enveloppe
  { key: 'construction', section: 'bati', n: '2.1', title: 'Quel type de construction ?', options: [
    { v: 'lourd', e: '🪨', label: 'Bâtiment lourd', hint: 'Pierre, pisé, brique pleine, béton banché : stocke la fraîcheur' },
    { v: 'moyen', e: '🧱', label: 'Bâtiment moyen', hint: 'Parpaing, brique creuse avec isolation intérieure' },
    { v: 'leger', e: '🪵', label: 'Bâtiment léger', hint: 'Ossature bois, préfabriqué léger' },
  ]},
  { key: 'logement', section: 'bati', n: '2.2', title: 'Quel type de logement ?', options: [
    { v: 'plainpied', e: '🏡', label: 'Maison de plain-pied' },
    { v: 'etages', e: '🏠', label: 'Maison à étages' },
    { v: 'appart', e: '🏢', label: 'Appartement en rez-de-chaussée ou intermédiaire' },
    { v: 'combles', e: '🔺', label: 'Appartement sous les toits / combles', hint: 'Le plus vulnérable' },
  ]},
  { key: 'toiture', section: 'bati', n: '2.3', title: 'Comment la toiture est-elle isolée ?', options: [
    { v: 'dense', e: '🌲', label: 'Isolant dense ou biosourcé', hint: 'Fibre de bois, ouate, chanvre : plus de 8 h de déphasage' },
    { v: 'leger', e: '🧶', label: 'Isolant classique léger', hint: 'Laine de verre ou de roche, polystyrène : moins de 5 h' },
    { v: 'aucune', e: '🕳️', label: 'Non isolée ou isolation très ancienne' },
    { v: 'nsp', e: '🤷', label: 'Je ne sais pas' },
  ]},
  // 3. Ouvertures
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
  { key: 'velux', section: 'vitres', n: '3.3', title: 'Avez-vous des fenêtres de toit (type Velux) ?', options: [
    { v: 'non', e: '✖️', label: 'Non' },
    { v: 'volets', e: '✅', label: 'Oui, avec volets roulants extérieurs' },
    { v: 'interieur', e: '⚠️', label: 'Oui, stores intérieurs ou sans protection' },
  ]},
  // 4. Ventilation
  { key: 'traversant', section: 'air', n: '4.1', title: 'Pouvez-vous créer un courant d’air la nuit ?', options: [
    { v: 'oui', e: '↔️', label: 'Oui : logement traversant ou tirage thermique', hint: 'Fenêtres sur façades opposées, ou en bas et en hauteur' },
    { v: 'non', e: '🔒', label: 'Non : mono-orienté ou impossible d’ouvrir la nuit', hint: 'Bruit, insécurité, pas de moustiquaires' },
  ]},
  { key: 'vmc', section: 'air', n: '4.2', title: 'Quel système de ventilation mécanique (VMC) ?', options: [
    { v: 'double', e: '🔁', label: 'VMC double flux avec by-pass estival' },
    { v: 'simple', e: '➡️', label: 'VMC simple flux ou grilles d’aération' },
    { v: 'aucune', e: '🚫', label: 'Aucune ventilation mécanique' },
  ]},
  { key: 'brassage', section: 'air', n: '4.3', title: 'Avez-vous des brasseurs d’air ?', options: [
    { v: 'plafond', e: '🌀', label: 'Ventilateurs de plafond' },
    { v: 'pied', e: '💨', label: 'Ventilateurs sur pied mobiles' },
    { v: 'aucun', e: '🚫', label: 'Aucun brasseur d’air' },
  ]},
  // 5. Équipements
  { key: 'appareils', section: 'equip', n: '5.1', title: 'Vos appareils génèrent-ils beaucoup de chaleur ?', options: [
    { v: 'nombreux', e: '🖥️', label: 'Nombreux appareils en continu', hint: 'Congélateur en plus, serveur, grands écrans, box TV' },
    { v: 'standard', e: '🔌', label: 'Équipement standard, éteint hors usage' },
  ]},
  { key: 'clim', section: 'equip', n: '5.2', title: 'Avez-vous une climatisation ?', options: [
    { v: 'pac', e: '❄️', label: 'Pompe à chaleur réversible fixe' },
    { v: 'mobile', e: '🧊', label: 'Climatiseur mobile', hint: 'Tuyau par la fenêtre : peu efficace, fait entrer l’air chaud' },
    { v: 'aucune', e: '🍃', label: 'Aucune climatisation' },
  ]},
];

// Réponses types quand une question est sautée (scénario de démonstration).
const DEFAULTS = { zone: 'periurbain', ombrage: 'partiel', abords: 'mineral', construction: 'moyen', logement: 'appart', toiture: 'nsp',
  vitrages: 'sud', protections: 'clair', velux: 'non', traversant: 'non', vmc: 'simple', brassage: 'aucun', appareils: 'standard', clim: 'aucune' };

// Scénario canicule de référence : 35 °C dehors, ajusté selon la zone.
const CANICULE_OUT = 35;
const ZONE_OUT = { urbain: 2, periurbain: 0, rural: -1, altitude: -3 };
// Écart intérieur/extérieur (°C) selon chaque réponse. Valeurs pédagogiques, pas une étude thermique.
const EFFECTS = {
  ombrage: { masques: -1.5, partiel: 0, aucun: 1.5 },
  abords: { vegetal: -.5, mineral: .5 },
  construction: { lourd: -1.5, moyen: 0, leger: 1.5 },
  logement: { plainpied: 0, etages: .5, appart: -.5, combles: 2.5 },
  toiture: { dense: -1, leger: .5, aucune: 2, nsp: .5 },
  vitrages: { nordest: -1, sud: .5, ouest: 1.5 },
  protections: { clair: -1, sombre: 0, toile: -.5, aucune: 1.5 },
  velux: { non: 0, volets: 0, interieur: 1 },
  traversant: { oui: -1, non: .5 },
  vmc: { double: -.5, simple: 0, aucune: .5 },
  appareils: { nombreux: 1, standard: 0 },
};

// Classes pédagogiques, sans lien avec les seuils réglementaires du DPE.
function comfortGrade(t) { return 'ABCDEFG'[[24, 26, 28, 30, 32, 34].filter(limit => t > limit).length]; }
function isComplete(answers = {}) { return QUESTIONS.every(q => q.options.some(o => o.v === answers[q.key])); }

// out (facultatif) : température extérieure maximale réelle, par exemple issue d'une prévision météo.
function computeProfile(answers = {}, out) {
  const A = k => answers[k] || DEFAULTS[k];
  const outMax = Number.isFinite(out) ? out : CANICULE_OUT + (ZONE_OUT[A('zone')] || 0);
  let delta = -7;
  for (const [k, table] of Object.entries(EFFECTS)) {
    let d = table[A(k)] || 0;
    // La toiture pèse peu pour un appartement intermédiaire.
    if (k === 'toiture' && A('logement') === 'appart') d /= 4;
    delta += d;
  }
  const t = Math.min(42, Math.max(18, Math.round(outMax + delta)));
  return { out: outMax, tNo: t, grade: comfortGrade(t), complete: isComplete(answers) };
}

if (typeof module !== 'undefined') module.exports = { SECTIONS, QUESTIONS, DEFAULTS, CANICULE_OUT, computeProfile, comfortGrade, isComplete };
