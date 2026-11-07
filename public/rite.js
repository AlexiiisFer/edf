// Correspondance entre le questionnaire et les entrées de l'outil RITE du Cerema (approche simplifiée, fichier V24.2).
// RITE ne couvre que les logements en immeuble collectif : pour une maison, pas de calcul RITE.
// Les données non demandées gardent des valeurs par défaut courantes (bâti ancien peu isolé, T3).
const RITE_DEPT = { nord: 44, idf: 75, est: 67, rhone: 69, sud: 13 };
// Façade la plus exposée en premier.
const RITE_ORIENT = [['ouest', 'Ouest'], ['sud', 'Sud'], ['est', 'Est'], ['nord', 'Nord']];
const RITE_PROTECT = { clair: 'Volet roulant', sombre: 'Volet battant', toile: 'Store extérieur', aucune: 'Aucune' };
const RITE_TYPO = { T1: 'T1', T2: 'T2', T3: 'T3', T4: 'T4', T5: 'T5 ou plus' };
const RITE_MURS = { bonne: '1-Mur bien isolé en ITI   (R=4-équivalent CEE)', faible: '2-Mur faiblement isolé en ITI (R=1.5)', aucune: '5-Mur sans isolation' };
const RITE_TOIT = { bonne: '1bis-Plancher lourd bien isolé (R=5-équivalent CEE)', faible: '2-Plancher lourd faiblement isolé (R=2,5)', aucune: '2-Plancher lourd faiblement isolé (R=2,5)' };
const RITE_MENUIS = { baie: 'Coulissant 2 vantaux', portefenetre: 'Porte fenêtre 2 battants', fenetre: 'Fenêtre 2 battants' };
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
  roofinsul: { 'Général!F27': '1bis-Plancher lourd bien isolé (R=5-équivalent CEE)' },
  ite: { 'Général!G35': '3-Mur bien isolé en ITE  (R=4-équivalent CEE)' },
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
    'Général!C11': a.dept && /^\d+$/.test(a.dept) ? Number(a.dept) : (RITE_DEPT[a.region] || 75),
    'Général!C18': a.logement === 'combles' ? 'Sous toiture' : 'Etage courant',
    'Général!C20': a.traversant === 'oui' ? '3-traversant sans pignon' : '1-mono orienté',
    'Méthode simplifiée!C25': prot, 'Méthode simplifiée!D25': prot, 'Méthode simplifiée!E25': prot,
    'Méthode simplifiée!C27': orient,
    'Méthode simplifiée!C33': a.brasseur === 'oui' ? 'Oui' : 'Non',
    'Méthode simplifiée!C38': a.volets === 'matin' ? 'Exemplaire' : 'Standard',
    // Fenêtres ouvertes la nuit seulement si l'occupant aère déjà ; sinon c'est le geste « aérer la nuit » qui l'apporte.
    'Méthode simplifiée!C40': a.aeration === 'oui' && a.nuitOuverte !== 'non' ? 'Normale' : 'Contrainte',
  };
  if (RITE_TYPO[a.typo]) inputs['Général!C16'] = RITE_TYPO[a.typo];
  if (RITE_MURS[a.murs]) inputs['Général!G35'] = RITE_MURS[a.murs];
  if (a.logement === 'combles' && RITE_TOIT[a.toiture]) inputs['Général!F27'] = RITE_TOIT[a.toiture];
  if (RITE_MENUIS[a.menuiserie]) inputs['Méthode simplifiée!C23'] = RITE_MENUIS[a.menuiserie];
  if (a.inertie === 'lourde') inputs['Général!G62'] = 'Carreaux de plâtre/brique';
  for (const id of ids) {
    // Impossible d'ouvrir la nuit (bruit, sécurité) : l'aération nocturne ne change rien.
    if ((id === 'night' || id === 'chimney') && a.nuitOuverte === 'non') continue;
    Object.assign(inputs, RITE_SOLUTIONS[id] || {});
  }
  return inputs;
}

// Libellé RITE (repères de la notice Cerema).
function riteLevel(dh) {
  if (dh == null) return null;
  return dh <= 350 ? 'confortable' : dh <= 1000 ? 'inconfort probable' : 'inconfortable';
}

if (typeof module !== 'undefined') module.exports = { RITE_SOLUTIONS, riteApplicable, riteInputs, riteLevel };
