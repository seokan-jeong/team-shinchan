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
