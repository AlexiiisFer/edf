// Pré-remplissage du questionnaire à partir d'un DPE de l'ADEME (base « DPE logements existants »).
// Les champs absents ou incertains restent à demander à l'utilisateur.
const DPE_FIELDS = ['identifiant_ban', 'adresse_ban', 'complement_adresse_logement', 'numero_etage_appartement', 'type_batiment',
  'typologie_logement', 'surface_habitable_logement', 'logement_traversant', 'protection_solaire_exterieure', 'type_generateur_froid',
  'indicateur_confort_ete', 'etiquette_dpe', 'date_etablissement_dpe', 'code_departement_ban', 'numero_dpe',
  'presence_brasseur_air', 'inertie_lourde', 'classe_inertie_batiment', 'qualite_isolation_murs',
  'qualite_isolation_plancher_haut_comble_perdu', 'qualite_isolation_plancher_haut_comble_amenage', 'qualite_isolation_plancher_haut_toit_terrasse'];
const QUALITE = { 'très bonne': 'bonne', 'bonne': 'bonne', 'moyenne': 'faible', 'insuffisante': 'aucune' };

const DEPT_REGION = (() => {
  const m = {};
  const set = (r, list) => list.split(' ').forEach(d => { m[d] = r; });
  set('idf', '75 77 78 91 92 93 94 95');
  set('sud', '04 05 06 09 11 12 13 2A 2B 30 31 32 34 46 48 64 65 66 81 82 83 84');
  set('rhone', '01 03 07 15 26 38 42 43 63 69 73 74');
  set('est', '08 10 21 25 39 51 52 54 55 57 58 67 68 70 71 88 89 90');
  return m;
})();

function regionFromDept(dept) {
  const d = String(dept || '').padStart(2, '0').toUpperCase();
  return DEPT_REGION[d] || (d ? 'nord' : undefined);
}

// Transforme une ligne DPE en réponses connues + questions restantes à poser.
function answersFromDpe(row = {}) {
  const answers = {};
  const region = regionFromDept(row.code_departement_ban);
  if (region) answers.region = region;
  if (row.logement_traversant === 1 || row.logement_traversant === 0) answers.traversant = row.logement_traversant ? 'oui' : 'non';
  if (row.protection_solaire_exterieure === 0) answers.protections = 'aucune';
  const dept = String(row.code_departement_ban || '').toUpperCase();
  if (/^(\d{2,3}|2A|2B)$/.test(dept)) answers.dept = dept;
  const typo = /T(\d)/i.exec(row.typologie_logement || '');
  if (typo) answers.typo = 'T' + Math.min(5, Math.max(1, Number(typo[1])));
  if (QUALITE[row.qualite_isolation_murs]) answers.murs = QUALITE[row.qualite_isolation_murs];
  const toit = row.qualite_isolation_plancher_haut_comble_perdu || row.qualite_isolation_plancher_haut_comble_amenage || row.qualite_isolation_plancher_haut_toit_terrasse;
  if (QUALITE[toit]) answers.toiture = QUALITE[toit];
  if (row.presence_brasseur_air === 1 || row.presence_brasseur_air === 0) answers.brasseur = row.presence_brasseur_air ? 'oui' : 'non';
  if (row.inertie_lourde === 1 || /lourde/i.test(row.classe_inertie_batiment || '')) answers.inertie = 'lourde';
  else if (row.inertie_lourde === 0) answers.inertie = 'legere';
  // Climatisation : un générateur de froid est déclaré dans le DPE.
  if (row.type_generateur_froid) answers.clim = /mobile|split mobile/i.test(row.type_generateur_froid) ? 'mobile' : 'pac';
  else if (row.etiquette_dpe) answers.clim = 'aucune';
  return answers;
}

// Résumé lisible d'une ligne DPE pour le choix du logement.
function dpeLabel(row = {}) {
  const parts = [];
  if (row.complement_adresse_logement) parts.push(row.complement_adresse_logement.trim());
  else if (row.numero_etage_appartement) parts.push(`Étage ${row.numero_etage_appartement}`);
  if (row.typologie_logement) parts.push(row.typologie_logement);
  if (row.surface_habitable_logement) parts.push(`${Math.round(row.surface_habitable_logement)} m²`);
  return parts.join(' · ') || (row.type_batiment === 'maison' ? 'Maison' : 'Logement');
}

if (typeof module !== 'undefined') module.exports = { DPE_FIELDS, regionFromDept, answersFromDpe, dpeLabel };
