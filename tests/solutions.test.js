const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimatePlan, availableSolutions, recommend, BUDGETS, TIMES, SOLUTIONS, CLIM_USAGE, usageCost } = require('../public/solutions.js');
const { QUESTIONS, computeProfile, isComplete } = require('../public/questions.js');

const hot = { region: 'sud', logement: 'combles', vitrages: ['ouest'], protections: 'aucune', traversant: 'non', clim: 'pac' };
const noAc = { ...hot, clim: 'aucune' };
const mobile = { ...hot, clim: 'mobile' };
const cool = { region: 'nord', logement: 'appart', vitrages: ['nord'], protections: 'clair', traversant: 'oui', clim: 'aucune' };

test('demo questionnaire: 6 questions with valid unique keys, region first', () => {
  assert.equal(QUESTIONS.length, 6);
  assert.equal(QUESTIONS[0].key, 'region');
  assert.equal(new Set(QUESTIONS.map(q => q.key)).size, QUESTIONS.length);
  assert.ok(isComplete(hot) && !isComplete({}));
});

test('windows: several orientations allowed, the most exposed one counts', () => {
  const { isValidAnswer } = require('../public/questions.js');
  const q = QUESTIONS.find(x => x.key === 'vitrages');
  assert.ok(q.multi && isValidAnswer(q, ['nord', 'ouest']) && !isValidAnswer(q, []) && !isValidAnswer(q, 'ouest') && !isValidAnswer(q, ['nord', 'nord']));
  assert.equal(computeProfile({ ...cool, vitrages: ['nord', 'ouest'] }).tNo, computeProfile({ ...cool, vitrages: ['ouest'] }).tNo);
  assert.ok(computeProfile({ ...cool, vitrages: ['nord'] }).tNo < computeProfile({ ...cool, vitrages: ['ouest'] }).tNo);
});

test('exposure ranks homes: hot home is worse than cool home', () => {
  assert.equal(computeProfile(hot).grade, 'G');
  assert.equal(computeProfile(cool).grade, 'A');
  assert.ok(computeProfile({ ...hot, region: 'nord' }).tNo < computeProfile(hot).tNo, 'region sets outdoor temperature');
});

test('no selection: no change', () => {
  for (const answers of [hot, noAc, mobile, cool, {}]) {
    const p = estimatePlan(answers);
    assert.equal(p.gain, 0);
    assert.equal(p.grade, p.planGrade);
    assert.deepEqual(p.ids, []);
  }
});

test('plan gives temperatures and purchase price only', () => {
  const p = estimatePlan(hot, ['shade', 'night']);
  for (const k of ['costMin', 'costMax', 'annualNet', 'timeline', 'tariff', 'kwhSaved']) assert.ok(!(k in p), k);
  assert.equal(p.gain, 2.5);
  assert.equal(p.price, 300);
});

test('every solution has a numeric installation delay', () => {
  assert.ok(SOLUTIONS.every(s => Number.isFinite(s.days) && typeof s.delay === 'string'));
});

test('recommendations respect budget and available time', () => {
  for (const a of [hot, noAc, mobile, cool]) for (const b of BUDGETS) for (const t of TIMES) {
    const ids = recommend(a, b.id, t.id), p = estimatePlan(a, ids);
    assert.ok(p.price <= b.max, `${b.id} ${t.id}`);
    assert.deepEqual(p.ids, ids, 'every recommendation is usable');
    assert.ok(ids.every(id => SOLUTIONS.find(s => s.id === id).days <= t.maxDays), 'installation delay fits the time profile');
  }
  assert.ok(recommend(noAc, 'large', 'peu').includes('ac'), 'a large budget for a hot home can include a heat pump');
  assert.ok(!recommend(noAc, 'petit', 'beaucoup').includes('ac'));
});

test('air conditioning running 24/7 costs several times more than off-peak use', () => {
  assert.ok(usageCost(CLIM_USAGE.h24).cost / usageCost(CLIM_USAGE.offPeak).cost > 3);
});

test('solutions follow declared equipment', () => {
  const ids = a => availableSolutions(a).map(s => s.id);
  assert.ok(ids(cool).includes('shutters') && !ids(cool).includes('shade') && !ids(cool).includes('control'));
  assert.ok(ids(hot).includes('shade') && !ids(hot).includes('shutters') && ids(hot).includes('control'));
  assert.ok(ids(mobile).includes('replace') && !ids(mobile).includes('ac'));
  assert.ok(ids(noAc).includes('ac') && !ids(noAc).includes('control'));
});

test('a heat pump caps the illustrative temperature at 26 °C; fan only improves perceived comfort', () => {
  assert.equal(estimatePlan(noAc, ['ac']).tPlan, 26);
  const f = estimatePlan(noAc, ['fan']);
  assert.equal(f.fan, true);
  assert.equal(f.gain, 0);
});

test('selection deduplicates, excludes incompatible options and requires shade for automation', () => {
  assert.deepEqual(estimatePlan(hot, ['control', 'control']), estimatePlan(hot, ['control']));
  assert.deepEqual(estimatePlan(noAc, ['control']).ids, []);
  assert.deepEqual(estimatePlan(noAc, ['auto']).ids, []);
  assert.deepEqual(estimatePlan(hot, ['ac']).ids, []);
  assert.deepEqual(estimatePlan(noAc, ['shade', 'auto']).ids, ['shade', 'auto']);
});

test('all questionnaire combinations: no action keeps the class, all actions never make it worse', () => {
  function check(i, answers) {
    if (i === QUESTIONS.length) {
      const p = estimatePlan(answers);
      assert.equal(p.tPlan, p.tNo);
      assert.equal(p.grade, p.planGrade);
      assert.ok(estimatePlan(answers, availableSolutions(answers).map(s => s.id)).tPlan <= p.tNo);
      return;
    }
    const q = QUESTIONS[i];
    const values = q.multi ? [...q.options.map(o => [o.v]), q.options.map(o => o.v)] : q.options.map(o => o.v);
    for (const v of values) check(i + 1, { ...answers, [q.key]: v });
  }
  check(0, {});
});

test('DPE prefill: region, through-flow, sun protection and air conditioning', () => {
  const { answersFromDpe, regionFromDept, dpeLabel } = require('../public/dpe.js');
  const { isValidAnswer } = require('../public/questions.js');
  assert.equal(regionFromDept('75'), 'idf');
  assert.equal(regionFromDept('13'), 'sud');
  assert.equal(regionFromDept('69'), 'rhone');
  assert.equal(regionFromDept('67'), 'est');
  assert.equal(regionFromDept('29'), 'nord');
  const a = answersFromDpe({ code_departement_ban: '69', logement_traversant: 0, protection_solaire_exterieure: 0, etiquette_dpe: 'C' });
  assert.deepEqual(a, { region: 'rhone', traversant: 'non', protections: 'aucune', clim: 'aucune' });
  for (const [k, v] of Object.entries(a)) assert.ok(isValidAnswer(QUESTIONS.find(q => q.key === k), v), k);
  assert.equal(answersFromDpe({ type_generateur_froid: 'PAC air/air' }).clim, 'pac');
  assert.equal(dpeLabel({ complement_adresse_logement: '2e étage', surface_habitable_logement: 64.4 }), '2e étage · 64 m²');
});

test('RITE inputs: apartments only, values from the RITE lists, solutions change the right cells', () => {
  const { riteApplicable, riteInputs, riteLevel, RITE_SOLUTIONS } = require('../public/rite.js');
  assert.ok(riteApplicable(hot) && !riteApplicable({ ...hot, logement: 'plainpied' }));
  const base = riteInputs(hot);
  assert.equal(base['Général!C11'], 13);
  assert.equal(base['Général!C18'], 'Sous toiture');
  assert.equal(base['Méthode simplifiée!C27'], 'Ouest');
  assert.equal(base['Méthode simplifiée!C25'], 'Aucune');
  assert.equal(base['Méthode simplifiée!C40'], 'Contrainte');
  assert.equal(riteInputs(hot, ['night'])['Méthode simplifiée!C40'], 'Normale');
  assert.equal(riteInputs(hot, ['fan'])['Méthode simplifiée!C33'], 'Oui');
  assert.equal(riteInputs({ ...cool, vitrages: ['nord', 'ouest'] })['Méthode simplifiée!C27'], 'Ouest');
  for (const id of Object.keys(RITE_SOLUTIONS)) assert.ok(SOLUTIONS.some(s => s.id === id), id);
  assert.equal(riteLevel(300), 'confortable'); assert.equal(riteLevel(700), 'inconfort probable'); assert.equal(riteLevel(1500), 'inconfortable');
});
