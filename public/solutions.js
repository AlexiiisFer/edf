// Hypothèses pédagogiques : effet supposé de chaque solution sur la température intérieure (°C), prix indicatif,
// délai de mise en place et temps demandé. Ni devis ni étude thermique.
// Les solutions proposées dépendent des équipements déclarés dans le questionnaire.
const hasExterior = a => ['clair', 'sombre', 'toile'].includes(a.protections);
const hasClim = a => a.clim === 'pac' || a.clim === 'mobile';
const isHouse = a => a.logement === 'plainpied' || a.logement === 'etages';
// cerema : niveau de coût du guide Cerema 2025 « Améliorer le confort d'été en logements collectifs » (€ à €€€).
// type : 'low' = geste manuel, 'high' = équipement à acheter ou installer.
// price / priceMax : fourchette indicative (€), par m² si unit = 'm²' (qty = surface supposée pour le budget).
// quote : prix sur étude. delay : délai de mise en place. effort : 'daily' geste quotidien, 'once' installation, 'auto' automatique.
const SOLUTIONS = [
  // Gestes manuels
  { id: 'shutters', info: 'Fermer volets ou stores côté soleil avant qu’il ne tape, dès le matin à l’est et l’après-midi à l’ouest. C’est le geste le plus efficace : il bloque la chaleur avant qu’elle n’entre.', type: 'low', label: 'Volets fermés', detail: 'Dès le matin, côté soleil.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: 1.5, when: a => hasExterior(a) && a.volets !== 'matin' },
  { id: 'night', info: 'Ouvrir en grand quand il fait plus frais dehors que dedans (souvent après 22 h), puis refermer au lever du soleil. Les murs se rafraîchissent pour la journée suivante.', type: 'low', label: 'Aérer la nuit', detail: 'Quand il fait plus frais dehors.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: 1, when: a => a.aeration !== 'oui' && a.nuitOuverte !== 'non' },
  { id: 'chimney', info: 'Ouvrir une fenêtre en bas et une en haut (étage, puits de lumière) : l’air chaud monte et sort, l’air frais entre par le bas. Quelques minutes suffisent le soir.', type: 'low', label: 'Effet cheminée', detail: 'Ouvrir en bas et en haut : l’air chaud sort par le haut.', price: 0, delay: '3 min', days: 0, effort: 'daily', cooling: .5, when: a => (a.logement === 'etages' || a.traversant === 'oui') && a.nuitOuverte !== 'non' },
  { id: 'heat', info: 'Les lampes, appareils en veille et le four dégagent de la chaleur. Éteindre ce qui ne sert pas et cuisiner le soir réduit les apports internes.', type: 'low', label: 'Éteindre les lumières', detail: 'Lumières éteintes en journée, four le soir.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: .5 },
  { id: 'closeday', info: 'Dès que l’extérieur devient plus chaud que l’intérieur, fermer les fenêtres pour garder la fraîcheur accumulée la nuit.', type: 'low', label: 'Fermer les fenêtres le jour', detail: 'Garder la fraîcheur de la nuit à l’intérieur.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: .5 },
  { id: 'curtains', info: 'Des rideaux épais et clairs côté soleil limitent un peu la chaleur qui entre. Moins efficace qu’une protection extérieure, mais gratuit.', type: 'low', label: 'Tirer les rideaux côté soleil', detail: 'En plus des volets, ou à défaut.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: .5 },
  { id: 'cooking', info: 'Le four et les plaques chauffent toute la pièce. En canicule, privilégier les plats froids ou une cuisson courte, de préférence le soir.', type: 'low', label: 'Cuisiner sans four', detail: 'Repas froids ou cuisson courte aux heures chaudes.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: .5 },
  { id: 'laundry', info: 'Le linge qui sèche à l’intérieur ajoute de l’humidité et le sèche-linge de la chaleur : l’air paraît plus lourd. Mieux vaut sécher dehors ou à l’ombre.', type: 'low', label: 'Sécher le linge dehors', detail: 'Pas de sèche-linge ni d’étendage dans le séjour.', price: 0, delay: 'immédiat', days: 0, effort: 'daily', cooling: .3 },
  // Équipements
  { id: 'paint', info: 'Des volets sombres absorbent le soleil et rayonnent la chaleur vers la fenêtre. Une teinte claire réfléchit davantage.', cerema: '€€', type: 'high', label: 'Volets clairs', detail: 'Repeindre les volets sombres, qui chauffent.', price: 50, priceMax: 150, delay: '1 jour', days: 1, effort: 'once', cooling: 1, when: a => a.protections === 'sombre' },
  { id: 'shade', aide: 'mpr', info: 'Un store ou volet extérieur arrête le soleil avant la vitre, bien plus efficace qu’un rideau intérieur. À poser sur la fenêtre la plus exposée.', cerema: '€€', type: 'high', label: 'Store extérieur', detail: 'Fenêtre la plus exposée.', price: 300, delay: '1 jour', days: 1, effort: 'daily', cooling: 1.5, when: a => !hasExterior(a) },
  { id: 'fan', aide: 'mpr', info: 'Un ventilateur de plafond brasse l’air : on ressent 2 à 3 °C de moins pour très peu d’électricité. Il ne refroidit pas l’air, il rafraîchit la peau.', cerema: '€€', type: 'high', label: 'Brasseur d’air', detail: 'Ventilateur de plafond : + de confort ressenti.', price: 70, priceMax: 200, delay: '1 jour', days: 1, effort: 'once', cooling: 0, comfort: true, when: a => a.brasseur !== 'oui' },
  { id: 'mist', info: 'La brumisation évapore de fines gouttes d’eau qui rafraîchissent l’air autour, surtout utile en climat sec et en extérieur ou sur un balcon.', type: 'high', label: 'Brumisateur', detail: 'Évaporation d’eau pour rafraîchir l’air.', price: 80, delay: '1 jour', days: 1, effort: 'once', cooling: .5, comfort: true },
  { id: 'screen', info: 'Un petit écran ou une alerte sur le téléphone indique quand fermer volets et fenêtres et quand aérer, à partir de la température intérieure et extérieure.', type: 'high', label: 'Écran d’alertes', detail: 'Alerte et conseils : quand fermer volets et fenêtres.', price: 70, priceMax: 100, delay: '3 semaines', days: 21, effort: 'auto', cooling: .5 },
  { id: 'auto', aide: 'mpr', info: 'Les volets se ferment seuls selon le soleil ou la température, même en votre absence : le bon geste est fait au bon moment.', cerema: '€€', type: 'high', label: 'Volets auto', detail: 'Se ferment seuls selon la chaleur.', price: 400, delay: '1 semaine', days: 7, effort: 'auto', cooling: 1.5 },
  { id: 'saferoom', info: 'Choisir une pièce, souvent la plus fraîche, et la protéger en priorité (rideaux, ventilateur) pour s’y réfugier pendant les heures les plus chaudes.', type: 'high', label: 'Pièce refuge', detail: 'Garder une pièce fraîche en priorité (rideaux, ventilateur).', price: 200, delay: '5 h', days: 0, effort: 'once', cooling: 1 },
  { id: 'saferoomPlus', info: 'Une pièce isolée, protégée et rafraîchie (par exemple avec une petite clim bien réglée) pour garantir un refuge frais en canicule.', type: 'high', label: 'Pièce refuge équipée', detail: 'Une pièce isolée et rafraîchie.', price: 1800, delay: '3 jours', days: 3, effort: 'once', cooling: 2 },
  { id: 'glass', info: 'Un vitrage qui se teinte au soleil laisse passer la lumière mais bloque une grande partie de la chaleur, et limite le recours à la clim.', cerema: '€', type: 'high', label: 'Vitrage intelligent', detail: 'Se teinte au soleil, limite la clim.', price: 350, priceMax: 950, delay: '1 à 2 jours', days: 2, effort: 'auto', cooling: 1.5 },
  { id: 'coolroof', info: 'Une peinture très claire sur le toit réfléchit le rayonnement solaire : le toit chauffe beaucoup moins et la chaleur transmise aux pièces dessous baisse.', cerema: '€€€', type: 'high', label: 'Cool roof', detail: 'Peinture réfléchissante sur le toit.', price: 35, priceMax: 60, unit: 'm²', qty: 20, delay: '3 à 7 jours', days: 7, effort: 'once', cooling: 1.5, when: isHouse },
  { id: 'solarChimney', info: 'Un conduit chauffé par le soleil crée un tirage qui aspire l’air chaud de la maison vers le haut et le fait sortir.', type: 'high', label: 'Cheminée solaire', detail: 'Évacue l’air chaud par le toit.', price: 120, delay: '2 semaines', days: 14, effort: 'auto', cooling: 1, when: isHouse },
  { id: 'green', info: 'Des plantes grimpantes ou un mur végétal font de l’ombre et rafraîchissent par évaporation. L’effet arrive progressivement, en 1 à 3 ans.', cerema: '€€', type: 'high', label: 'Mur végétal', detail: 'Ombrage et fraîcheur, pousse en 1 à 3 ans.', price: 150, priceMax: 350, unit: 'm²', qty: 4, delay: '1 à 3 ans', days: 1095, effort: 'once', cooling: 1, when: isHouse },
  { id: 'water', info: 'Un bassin ou une cascade rafraîchit l’air aux abords par évaporation et crée un coin frais au jardin.', cerema: '€€', type: 'high', label: 'Point d’eau', detail: 'Bassin ou cascade au jardin.', price: 1300, delay: '6 mois à 1 an', days: 365, effort: 'once', cooling: .5, when: isHouse },
  { id: 'canadian', info: 'L’air neuf passe par des tuyaux enterrés, où le sol à 2 m est plus frais : il arrive dans la maison plusieurs degrés en dessous de l’air extérieur.', type: 'high', label: 'Puits canadien', detail: 'L’air entre par le sol, plus frais.', price: 5000, priceMax: 10000, delay: '2 semaines', days: 14, effort: 'auto', cooling: 2, when: isHouse },
  { id: 'twin', info: 'Une copie numérique du logement (plans, matériaux, exposition) qui simule la chaleur pièce par pièce pour cibler les travaux les plus utiles.', type: 'high', label: 'Jumeau numérique', detail: 'Plans, matériaux, soleil : prédit la pièce qui résiste le mieux.', price: 0, quote: true, delay: 'à l’étude', days: 60, effort: 'auto', cooling: 0 },
  { id: 'adiabatic', info: 'Un rafraîchisseur fait passer l’air à travers des filtres humides : l’eau qui s’évapore refroidit l’air, pour bien moins d’électricité qu’une clim.', type: 'high', label: 'Rafraîchisseur adiabatique', detail: 'Clim à l’eau qui consomme moins.', price: 200, priceMax: 600, delay: '1 jour', days: 1, effort: 'once', cooling: 1.5 },
  { id: 'roofinsul', aide: 'edf', info: 'Un isolant épais sous la toiture freine la chaleur du toit, première source de surchauffe sous les toits. Utile aussi l’hiver.', cerema: 'non chiffré', type: 'high', label: 'Isoler le toit', detail: 'Isolant épais sous la toiture : moins de chaleur sous les toits.', price: 50, priceMax: 100, unit: 'm²', qty: 50, delay: '2 à 5 jours', days: 5, effort: 'once', cooling: 1.5, when: a => a.logement !== 'appart' && a.toiture !== 'bonne' },
  { id: 'ite', aide: 'mpr', info: 'L’isolation par l’extérieur enveloppe les murs : ils gardent leur fraîcheur et ne restituent plus la chaleur du soleil la nuit. En immeuble, décision de copropriété.', cerema: 'non chiffré', type: 'high', label: 'Isoler les murs par l’extérieur', detail: 'Isolation extérieure (ITE), à voter en copropriété.', price: 150, priceMax: 250, unit: 'm²', qty: 30, delay: '3 à 6 semaines', days: 42, effort: 'once', cooling: 1, when: a => a.murs !== 'bonne' },
  { id: 'control', info: 'Programmer la clim aux heures creuses et à 26 °C, et la couper en votre absence : même confort ou presque, pour beaucoup moins cher.', type: 'high', label: 'Clim programmée', detail: 'Heures creuses, consigne 26 °C.', price: 80, delay: '1 jour', days: 1, effort: 'auto', cooling: 0, when: hasClim },
  { id: 'replace', aide: 'edf', info: 'Un climatiseur mobile rejette une partie de sa chaleur dans la pièce. Une PAC air-air fixe est bien plus efficace et silencieuse.', type: 'high', label: 'PAC à la place du mobile', detail: 'Bien plus efficace.', price: 2500, delay: '1 à 2 jours', days: 2, effort: 'once', cooling: 0, newAc: true, when: a => a.clim === 'mobile' },
  { id: 'ac', aide: 'edf', info: 'Une pompe à chaleur air-air rafraîchit l’été et chauffe l’hiver. À dimensionner par un professionnel, et à utiliser après les gestes de protection.', type: 'high', label: 'Clim PAC air-air', detail: 'À dimensionner par un pro.', price: 2500, delay: '1 à 2 jours', days: 2, effort: 'once', cooling: 0, newAc: true, when: a => !hasClim(a) },
];
// Coût indicatif d'une solution pour le budget (bas et haut de fourchette).
const costMin = s => s.price * (s.qty || 1);
const costMax = s => (s.priceMax ?? s.price) * (s.qty || 1);

// Aides possibles (sous conditions, montants non garantis) : à vérifier sur les sites officiels avant usage.
const AIDES = {
  edf: { label: 'Prime énergie EDF', detail: 'Certificats d’économies d’énergie (CEE), artisan RGE, sous conditions.', url: 'https://particulier.edf.fr/fr/accueil/aides-financement.html' },
  mpr: { label: 'MaPrimeRénov’', detail: 'Dans le cadre d’une rénovation globale, avec un conseiller France Rénov’.', url: 'https://france-renov.gouv.fr/' },
};

// Profils budget et temps disponible (3 niveaux chacun).
// « Sans » : pas de filtre, toutes les solutions sont affichées.
const BUDGETS = [
  { id: 'sans', label: 'Sans', max: Infinity },
  { id: 'petit', label: 'Petit', hint: '≤ 200 €', max: 200 },
  { id: 'moyen', label: 'Moyen', hint: '≤ 1 000 €', max: 1000 },
  { id: 'large', label: 'Large', hint: '+ de 1 000 €', max: Infinity },
];
// Temps : selon le délai d'installation (days = délai maximal en jours).
const TIMES = [
  { id: 'sans', label: 'Sans', maxDays: Infinity },
  { id: 'peu', label: 'Peu', hint: '≤ 2 jours', maxDays: 2 },
  { id: 'unpeu', label: 'Un peu', hint: '≤ 1 mois', maxDays: 31 },
  { id: 'beaucoup', label: 'Beaucoup', hint: 'sans limite', maxDays: Infinity },
];
const fitsTime = (s, time) => s.days <= time.maxDays;

// Une solution est utilisable si ses prérequis sont remplis par le logement ou par les autres choix.
function usable(s, answers, selected) {
  if (s.id === 'auto') return hasExterior(answers) || selected.has('shade');
  return true;
}

// Propose des choix adaptés au budget et au temps : les plus efficaces d'abord, dans la limite du budget.
function recommend(answers, budgetId = 'moyen', timeId = 'unpeu') {
  const budget = BUDGETS.find(b => b.id === budgetId) || BUDGETS[1];
  const time = TIMES.find(t => t.id === timeId) || TIMES[1];
  const hot = computeProfile(answers).tNo >= 29;
  const value = s => s.cooling + (s.comfort ? .8 : 0) + (s.newAc && hot ? 3 : 0) + (s.id === 'control' ? 1 : 0);
  const pool = availableSolutions(answers).filter(s => fitsTime(s, time) && value(s) > 0)
    .sort((a, b) => value(b) - value(a) || costMin(a) - costMin(b));
  const picked = new Set(); let spent = 0;
  for (let pass = 0; pass < 2; pass++) for (const s of pool) {
    if (picked.size >= 6) break;
    if (picked.has(s.id) || spent + costMin(s) > budget.max || !usable(s, answers, picked)) continue;
    picked.add(s.id); spent += costMin(s);
  }
  return SOLUTIONS.filter(s => picked.has(s.id)).map(s => s.id);
}

// Offres EDF (Tarif Bleu, prix du kWh TTC au 1er août 2026, à vérifier avant usage) et usages d'une clim sur un été.
const OFFERS = {
  base: { label: 'Tarif Bleu · option Base', hp: .2001, hc: .2001 },
  hphc: { label: 'Tarif Bleu · option Heures Creuses', hp: .2142, hc: .1589 },
};
const CLIM_USAGE = {
  days: 40,
  h24: { label: 'Clim en continu, H24 à 22 °C', kw: .9, hpHours: 16, hcHours: 8 },
  offPeak: { label: 'Clim programmée aux heures creuses, 26 °C', kw: .75, hpHours: 0, hcHours: 8 },
  fan: { label: 'Ventilateur', kw: .03, hpHours: 8, hcHours: 0 },
};
// kWh et coût d'un usage avec une offre : heures pleines et heures creuses facturées chacune à leur prix.
function usageCost(u, offer = OFFERS.hphc, days = CLIM_USAGE.days) {
  const hpKwh = u.kw * u.hpHours, hcKwh = u.kw * u.hcHours, perDay = hpKwh * offer.hp + hcKwh * offer.hc;
  return { kwh: (hpKwh + hcKwh) * days, perDay, cost: perDay * days };
}

function availableSolutions(answers) {
  return SOLUTIONS.filter(s => !s.when || s.when(answers));
}

function estimatePlan(answers, ids = []) {
  const profile = computeProfile(answers);
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const actions = availableSolutions(answers).filter(s => selected.has(s.id));
  const effective = actions.filter(s => usable(s, answers, selected));
  const newAc = effective.some(s => s.newAc);
  const lowCooling = Math.min(3, effective.filter(s => s.type === 'low').reduce((n, s) => n + s.cooling, 0));
  const cooling = Math.min(3.5, effective.reduce((n, s) => n + s.cooling, 0));
  const lowTemp = Math.max(Math.min(23, profile.tNo), profile.tNo - lowCooling);
  // 26 °C est une cible illustrative pour une PAC, jamais une garantie de dimensionnement.
  const passive = Math.max(Math.min(23, profile.tNo), profile.tNo - cooling);
  const finalTemp = newAc ? Math.min(passive, 26) : passive;
  return { ids: effective.map(s => s.id), grade: profile.grade, lowGrade: comfortGrade(lowTemp), planGrade: comfortGrade(finalTemp),
    tNo: profile.tNo, tLow: lowTemp, tPlan: finalTemp, gain: profile.tNo - finalTemp, fan: effective.some(s => s.comfort),
    price: effective.reduce((n, s) => n + costMin(s), 0), priceMax: effective.reduce((n, s) => n + costMax(s), 0) };
}

if (typeof module !== 'undefined') {
  // Même modèle pour le serveur et les navigateurs, sans dépendance externe.
  var { computeProfile, comfortGrade } = require('./questions.js');
  module.exports = { AIDES, fitsTime, costMin, costMax, SOLUTIONS, BUDGETS, TIMES, recommend, OFFERS, CLIM_USAGE, usageCost, availableSolutions, estimatePlan, hasClim, hasExterior };
}
