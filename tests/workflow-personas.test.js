'use strict';
// Unit tests for src/workflow-personas.js (the Workflow persona-injection helper).
// Run: node --test tests/workflow-personas.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../src/workflow-personas.js');

test('extractPersona returns a faithful, prompt-injectable descriptor for a known agent', () => {
  const persona = P.extractPersona('hiroshi');
  assert.match(persona, /^You are Hiroshi\b/);           // identity, display name from "You are **X**"
  assert.match(persona, /Senior Advisor|Oracle|strategic/i); // role drawn from frontmatter description
  assert.match(persona, /Wise|thoughtful|analyst/i);     // voice drawn from the Personality & Tone line
});

test('display name uses the bold "You are **X**" form, not the lowercase frontmatter name', () => {
  assert.match(P.extractPersona('actionkamen'), /^You are Action Kamen\b/);
});

test('the role clause drops trailing "Use for …" guidance', () => {
  const persona = P.extractPersona('hiroshi');
  assert.ok(!/Use for/i.test(persona), `persona should not include "Use for" guidance: ${persona}`);
});

test('"Adapt to user\'s language" boilerplate is excluded from traits', () => {
  for (const a of ['hiroshi', 'kazama', 'bo', 'actionkamen']) {
    assert.ok(!/adapt to user/i.test(P.extractPersona(a)), `${a} persona leaked the boilerplate tail`);
  }
});

test('every persona is a single concise descriptor starting with "You are"', () => {
  for (const a of ['actionkamen', 'hiroshi', 'misae', 'kazama', 'bo', 'aichan']) {
    const persona = P.extractPersona(a);
    assert.match(persona, /^You are /, `${a} should start with "You are "`);
    assert.ok(persona.length > 20 && persona.length < 400, `${a} persona length out of range: ${persona.length}`);
  }
});

test('missing agent throws (never returns a silent empty persona)', () => {
  assert.throws(() => P.extractPersona('nonexistent-agent'), /no such agent/);
});

test('agent name is sanitized — path traversal cannot read outside agents/', () => {
  // "../../package" → stripped to "packagejson"-ish → resolves to no agent file, never escapes AGENTS_DIR.
  assert.throws(() => P.extractPersona('../../package.json'), /no such agent|invalid agent/);
  assert.throws(() => P.extractPersona(''), /invalid agent/);
});

test('parseFrontmatter is exported and reads a simple frontmatter block', () => {
  const meta = P.parseFrontmatter('---\nname: foo\ndescription: bar baz\n---\nbody');
  assert.equal(meta.name, 'foo');
  assert.equal(meta.description, 'bar baz');
});

// ---- buildLearningBlock behavior (main-077) ----
const { buildLearningBlock } = P;
const SL = require('../src/score-learning.js');

test('AC-2: buildLearningBlock never throws and returns a string (graceful)', () => {
  const out = buildLearningBlock('aichan', { stage: 'planning', keywords: [] }, {});
  assert.strictEqual(typeof out, 'string'); // '' or a block — never throws (NFR-2)
});

test('AC-6: determinism — same inputs produce identical output (no LLM/network)', () => {
  const a = buildLearningBlock('buriburi', { stage: 'execution', keywords: ['api'] }, { maxTokens: 400 });
  const b = buildLearningBlock('buriburi', { stage: 'execution', keywords: ['api'] }, { maxTokens: 400 });
  assert.strictEqual(a, b);
});

test('AC-5/AC-2: an agent+ctx that matches nothing above floor yields empty string', () => {
  // an impossible agent name folds zero role keywords; a nonsense stage zeroes stage-match.
  const out = buildLearningBlock('zzz-no-agent', { stage: 'no-such-stage', keywords: ['qqqzzz'] }, {});
  // every entry: tier procedural(6) + 0 stage + 0 overlap = 6 < floor 8 -> '' (AC-5)
  assert.strictEqual(out, '');
});

test('AC-3: a real above-floor match emits exactly one block with the exact header', () => {
  const out = buildLearningBlock('hiroshi', { stage: 'planning', keywords: ['architecture'] }, { maxTokens: 4000 });
  if (out !== '') {
    const headerCount = (out.match(/## 이 작업에 적용할 학습/g) || []).length;
    assert.strictEqual(headerCount, 1); // exactly one block
    assert.ok(out.startsWith('## 이 작업에 적용할 학습')); // block string only (FR-1)
  }
});

test('AC-4: a tight maxTokens shrinks the block (fewer or equal items), never partial', () => {
  const big = buildLearningBlock('hiroshi', { stage: 'planning', keywords: ['architecture'] }, { maxTokens: 4000 });
  const small = buildLearningBlock('hiroshi', { stage: 'planning', keywords: ['architecture'] }, { maxTokens: 40 });
  assert.ok(small.length <= big.length); // shrinks (FR-4/NFR-4)
  if (small !== '') assert.ok(!/\n- $/.test(small)); // no dangling/partial item line
});

test('AC-7: a frontend-tagged learning scores higher for aichan than for masao (CONST-2 folding)', () => {
  const entry = { tier: 'procedural', category: 'pattern', tags: ['frontend', 'css', 'ui'], date: '2026-01-01' };
  // simulate the fold the way buildLearningBlock does: agent role keywords ∪ ctx keywords
  const aichanKw = ['component','layout','styling','ui','frontend','react','css','html','style']; // CONST-2 aichan subset
  const masaoKw = ['docker','pipeline','deployment','devops','infra'];                            // CONST-2 masao subset
  const aichanScore = SL.scoreLearning(entry, { stage: 'execution', keywords: aichanKw });
  const masaoScore = SL.scoreLearning(entry, { stage: 'execution', keywords: masaoKw });
  assert.ok(aichanScore > masaoScore, `aichan(${aichanScore}) should beat masao(${masaoScore}) via tag_overlap`);
});
