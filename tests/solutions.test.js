const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimatePlan, availableSolutions } = require('../public/solutions.js');
const { QUESTIONS, computeProfile, isComplete } = require('../public/questions.js');

const hot = { zone: 'urbain', ombrage: 'aucun', abords: 'mineral', construction: 'leger', logement: 'combles', toiture: 'aucune',
  vitrages: 'ouest', protections: 'aucune', velux: 'interieur', traversant: 'non', vmc: 'aucune', brassage: 'aucun', appareils: 'nombreux', clim: 'pac' };
const noAc = { ...hot, clim: 'aucune' };
const mobile = { ...hot, clim: 'mobile' };
const cool = { zone: 'altitude', ombrage: 'masques', abords: 'vegetal', construction: 'lourd', logement: 'appart', toiture: 'dense',
  vitrages: 'nordest', protections: 'clair', velux: 'non', traversant: 'oui', vmc: 'double', brassage: 'plafond', appareils: 'standard', clim: 'aucune' };

test('14 questions, all with valid unique keys', () => {
  assert.equal(QUESTIONS.length, 14);
  assert.equal(new Set(QUESTIONS.map(q => q.key)).size, QUESTIONS.length);
  assert.ok(isComplete(hot) && !isComplete({}));
});

test('exposure ranks homes: hot home is worse than cool home', () => {
  assert.equal(computeProfile(hot).grade, 'G');
  assert.equal(computeProfile(cool).grade, 'A');
  assert.ok(computeProfile(hot, 20).tNo < computeProfile(hot).tNo, 'real forecast overrides canicule scenario');
});

test('no selection: no change, cost or fictitious savings', () => {
  for (const answers of [hot, noAc, mobile, cool, {}]) {
    const p = estimatePlan(answers);
    assert.equal(p.gain, 0);
    assert.equal(p.grade, p.planGrade);
    assert.equal(p.costMax, 0);
    assert.equal(p.annualNet, 0);
    assert.equal(p.paybackYears, null);
  }
});

test('solutions follow declared equipment', () => {
  const ids = a => availableSolutions(a).map(s => s.id);
  assert.ok(ids(cool).includes('bypass') && ids(cool).includes('fanuse') && ids(cool).includes('shutters'));
  assert.ok(!ids(cool).includes('fan') && !ids(cool).includes('shade') && !ids(cool).includes('velux'));
  assert.ok(ids(hot).includes('velux') && ids(hot).includes('shade') && ids(hot).includes('control'));
  assert.ok(ids(mobile).includes('replace') && !ids(mobile).includes('ac'));
  assert.ok(ids(noAc).includes('ac') && !ids(noAc).includes('control'));
});

test('new AC is an investment and additional operating cost without existing cooling', () => {
  const p = estimatePlan(noAc, ['ac']);
  assert.equal(p.baselineKwh, 0);
  assert.equal(p.annualKwh, 240);
  assert.equal(p.annualNet, -120);
  assert.equal(p.timeline[2].netMin, -4700);
  assert.equal(p.paybackYears, null);
});

test('replacing a mobile unit saves energy compared to the declared baseline', () => {
  const p = estimatePlan(mobile, ['replace'], { tariff: .25, baselineKwh: 600 });
  assert.equal(p.annualKwh, 240);
  assert.equal(p.annualNet, 360 * .25 - 60);
});

test('fan improves perceived comfort but not air temperature; replacements included', () => {
  const p = estimatePlan(noAc, ['fan']);
  assert.equal(p.fan, true);
  assert.equal(p.gain, 0);
  assert.equal(p.annualNet, -2.4);
  assert.equal(p.timeline[2].netMin, -324);
});

test('control savings use adjustable tariff and baseline, replacement at year 6', () => {
  const p = estimatePlan(hot, ['control'], { tariff: .25, baselineKwh: 600 });
  assert.ok(Math.abs(p.annualNet - 22) < 1e-8);
  assert.equal(p.timeline[2].netMin, -280);
  assert.ok(estimatePlan(hot, ['control'], { tariff: .30, baselineKwh: 900 }).annualNet > p.annualNet);
});

test('selection deduplicates, excludes incompatible options and requires shade for automation', () => {
  assert.deepEqual(estimatePlan(hot, ['control', 'control']), estimatePlan(hot, ['control']));
  assert.deepEqual(estimatePlan(noAc, ['control']).ids, []);
  assert.deepEqual(estimatePlan(noAc, ['auto']).ids, []);
  assert.deepEqual(estimatePlan(hot, ['ac']).ids, []);
  assert.deepEqual(estimatePlan(noAc, ['shade', 'auto']).ids, ['shade', 'auto']);
  assert.equal(estimatePlan(hot, ['sensors', 'app']).gain, 0);
});

test('sampled questionnaire combinations preserve initial class without actions', () => {
  let seed = 7; const rnd = n => (seed = (seed * 16807) % 2147483647) % n;
  for (let i = 0; i < 3000; i++) {
    const answers = Object.fromEntries(QUESTIONS.map(q => [q.key, q.options[rnd(q.options.length)].v]));
    const p = estimatePlan(answers);
    assert.equal(p.tPlan, p.tNo);
    assert.equal(p.grade, p.planGrade);
    const all = estimatePlan(answers, availableSolutions(answers).map(s => s.id));
    assert.ok(all.tPlan <= p.tNo);
  }
});
