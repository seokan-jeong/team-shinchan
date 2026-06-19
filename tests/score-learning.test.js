'use strict';
// Golden-vector test for src/score-learning.js (DEC-1 / R-2 drift gate).
// The golden vector is CONSTRUCTED from load-kb §2c (which has no explicit numeric example) and is
// documented identically here and in score-learning.js's header comment. If the JS formula and the
// load-kb §2c prose ever diverge, this test fails mechanically.
// Run: node --test tests/score-learning.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { scoreLearning, normaliseTag } = require('../src/score-learning.js');

test('GOLDEN VECTOR: preference+convention+1-tag-overlap on planning stage scores exactly 12', () => {
  const entry = { tier: 'preference', category: 'convention', tags: ['architecture', 'agents'], date: '2026-03-03' };
  const ctx = { stage: 'planning', keywords: ['architecture', 'plan'] };
  // 3*3 (preference) + 1*2 (convention∈planning) + 1*1 ('architecture' overlap) = 12
  assert.strictEqual(scoreLearning(entry, ctx), 12);
});

test('tool tier scores 0 weight when stage !== execution (§2c)', () => {
  const entry = { tier: 'tool', category: 'pattern', tags: ['docker'], date: '2026-01-01' };
  const planningCtx = { stage: 'planning', keywords: ['docker'] };
  // tier_weight 0 (tool outside execution) + 0 (pattern not in planning prefs? it IS) ...
  // planning prefs = [pattern, convention] -> stage match +2 ; tag overlap 'docker' +1 -> 0+2+1 = 3
  assert.strictEqual(scoreLearning(entry, planningCtx), 3);
  const execCtx = { stage: 'execution', keywords: ['docker'] };
  // tier_weight 1*3=3 + (pattern∈execution prefs)*2=2 + overlap 1 = 6
  assert.strictEqual(scoreLearning(entry, execCtx), 6);
});

test('missing tier defaults to procedural (weight 2) [§2b]', () => {
  const entry = { category: 'pattern', tags: [], date: '2026-01-01' }; // no tier
  const ctx = { stage: 'planning', keywords: [] };
  // procedural 2*3=6 + 0 (pattern∈planning)*... pattern IS in planning prefs -> +2 -> 8
  assert.strictEqual(scoreLearning(entry, ctx), 8);
});

test('CONST-4: bare and #-prefixed tags both overlap', () => {
  const entry = { tier: 'tool', category: 'x', tags: ['#Frontend'], date: '2026-01-01' };
  const ctx = { stage: 'execution', keywords: ['frontend'] };
  // tool@execution 1*3=3 + 0 stage + 1 overlap(#Frontend ~ frontend) = 4
  assert.strictEqual(scoreLearning(entry, ctx), 4);
  assert.strictEqual(normaliseTag('#Frontend'), 'frontend');
});

test('REVIEW-LOW: duplicate tags on an entry count at most once (no score inflation)', () => {
  const ctx = { stage: 'planning', keywords: ['architecture'] };
  const dup = scoreLearning({ tier: 'procedural', category: 'pattern', tags: ['architecture', 'architecture'] }, ctx);
  const single = scoreLearning({ tier: 'procedural', category: 'pattern', tags: ['architecture'] }, ctx);
  assert.strictEqual(dup, single, 'a duplicated tag must not inflate the overlap score');
});
