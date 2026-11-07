const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimatePlan } = require('../public/solutions.js');
const { QUESTIONS } = require('../public/questions.js');
const hot = { city: 'lyon', floor: 'dernier', orientation: 'ouest', shutters: 'aucun', clim: 'oui' };
const noAc = { ...hot, clim: 'non' };

test('no selection: no change, cost or fictitious savings, even for a cool home', () => {
  for (const answers of [hot, noAc, {city:'nord',floor:'rdc',orientation:'nord',shutters:'exterieur',clim:'non'}]) {
    const p = estimatePlan(answers);
    assert.equal(p.gain, 0);
    assert.equal(p.grade, p.planGrade);
    assert.equal(p.costMax, 0);
    assert.equal(p.annualNet, 0);
    assert.equal(p.paybackYears, null);
  }
});

test('new AC is an investment and additional operating cost without existing cooling', () => {
  const p = estimatePlan(noAc, ['ac']);
  assert.equal(p.baselineKwh, 0);
  assert.equal(p.annualKwh, 240);
  assert.equal(p.annualNet, -120);
  assert.equal(p.timeline[2].netMin, -4700);
  assert.equal(p.paybackYears, null);
});

test('fan improves perceived comfort but not air temperature; replacements included', () => {
  const p = estimatePlan(noAc, ['fan']);
  assert.equal(p.fan, true);
  assert.equal(p.gain, 0);
  assert.equal(p.annualNet, -2.4);
  assert.equal(p.timeline[2].netMin, -324); // 2 × 150 + 10 × 2.4
});

test('control savings use adjustable tariff and baseline, replacement at year 6', () => {
  const p = estimatePlan(hot, ['control'], { tariff: .25, baselineKwh: 600 });
  assert.ok(Math.abs(p.annualNet - 22) < 1e-8);
  assert.equal(p.timeline[2].netMin, -280);
  assert.ok(estimatePlan(hot, ['control'], { tariff: .30, baselineKwh: 900 }).annualNet > p.annualNet);
});

test('selection deduplicates, excludes incompatible options and requires shade for automation', () => {
  assert.deepEqual(estimatePlan(hot,['control','control']), estimatePlan(hot,['control']));
  assert.deepEqual(estimatePlan(noAc,['control']).ids, []);
  assert.deepEqual(estimatePlan(noAc,['auto']).ids, []);
  assert.deepEqual(estimatePlan(hot,['ac']).ids, []);
  assert.deepEqual(estimatePlan(noAc,['shade','auto']).ids, ['shade','auto']);
  assert.equal(estimatePlan(hot,['sensors']).gain, 0);
});

test('all questionnaire combinations preserve initial class without actions', () => {
  function check(i, answers) {
    if (i === QUESTIONS.length) {
      const p = estimatePlan(answers);
      assert.equal(p.tPlan, p.tNo);
      assert.equal(p.grade, p.lowGrade);
      assert.equal(p.grade, p.planGrade);
      return;
    }
    for (const option of QUESTIONS[i].options) check(i+1, {...answers, [QUESTIONS[i].key]: option.v});
  }
  check(0, {});
});
