// Correspondance entre le questionnaire et les entrées de l'outil RITE du Cerema (approche simplifiée, fichier V24.2).
// RITE ne couvre que les logements en immeuble collectif : pour une maison, pas de calcul RITE.
// Les données non demandées gardent des valeurs par défaut courantes (bâti ancien peu isolé, T3).
const RITE_DEPT = { nord: 44, idf: 75, est: 67, rhone: 69, sud: 13 };
// Façade la plus exposée en premier.
const RITE_ORIENT = [['ouest', 'Ouest'], ['sud', 'Sud'], ['est', 'Est'], ['nord', 'Nord']];
const RITE_PROTECT = { clair: 'Volet roulant', sombre: 'Volet battant', toile: 'Store extérieur', aucune: 'Aucune' };
const RITE_DEFAULTS = {
  'Général!C16': 'T3',
  'Général!F27': '2-Plancher lourd faiblement isolé (R=2,5)',
  'Général!G35': '2-Mur faiblement isolé en ITI (R=1.5)',
  'Général!G42': '2-Plancher lourd faiblement isolé (R=2.5)',
  'Général!G52': '1-Lourd',
  'Général!G62': 'Plaque de plâtre',
  'Méthode simplifiée!C23': 'Porte fenêtre 2 battants',
  'Méthode simplifiée!D23': 'Fenêtre 2 battants',
  'Méthode simplifiée!E23': 'Fenêtre 2 battants',
};
// Effet de chaque solution sur les entrées RITE (les autres solutions ne sont pas modélisées par RITE).
const RITE_SOLUTIONS = {
  shutters: { 'Méthode simplifiée!C38': 'Exemplaire' },
  auto: { 'Méthode simplifiée!C38': 'Exemplaire' },
  shade: { 'Méthode simplifiée!C25': 'Store extérieur', 'Méthode simplifiée!D25': 'Store extérieur', 'Méthode simplifiée!E25': 'Store extérieur' },
  night: { 'Méthode simplifiée!C40': 'Normale' },
  chimney: { 'Méthode simplifiée!C40': 'Normale' },
  fan: { 'Méthode simplifiée!C33': 'Oui' },
};

function riteApplicable(answers = {}) {
  return answers.logement === 'appart' || answers.logement === 'combles';
}

// Entrées RITE du logement avec les solutions choisies.
function riteInputs(answers = {}, ids = []) {
  const a = answers;
  const v = [].concat(a.vitrages || []);
  const orient = (RITE_ORIENT.find(([k]) => v.includes(k)) || ['', 'Sud'])[1];
  const prot = RITE_PROTECT[a.protections] || 'Volet roulant';
  const inputs = {
    ...RITE_DEFAULTS,
    'Général!C11': RITE_DEPT[a.region] || 75,
    'Général!C18': a.logement === 'combles' ? 'Sous toiture' : 'Etage courant',
    'Général!C20': a.traversant === 'oui' ? '3-traversant sans pignon' : '1-mono orienté',
    'Méthode simplifiée!C25': prot, 'Méthode simplifiée!D25': prot, 'Méthode simplifiée!E25': prot,
    'Méthode simplifiée!C27': orient,
    'Méthode simplifiée!C33': a.brassage === 'oui' ? 'Oui' : 'Non',
    'Méthode simplifiée!C38': 'Standard',
    // Sans le geste « aérer la nuit », on considère que les fenêtres restent peu ouvertes.
    'Méthode simplifiée!C40': 'Contrainte',
  };
  for (const id of ids) Object.assign(inputs, RITE_SOLUTIONS[id] || {});
  return inputs;
}

// Libellé RITE (repères de la notice Cerema).
function riteLevel(dh) {
  if (dh == null) return null;
  return dh <= 350 ? 'confortable' : dh <= 1000 ? 'inconfort probable' : 'inconfortable';
}

if (typeof module !== 'undefined') module.exports = { RITE_SOLUTIONS, riteApplicable, riteInputs, riteLevel };
