'use strict';
// score-learning.js — SINGLE SOURCE OF TRUTH for the load-kb §2c relevance formula.
// Mirrors hooks/load-kb.md §2c VERBATIM (DEC-1). Do NOT fork or re-derive elsewhere.
//
//   score = (tier_weight * 3) + (stage_category_match * 2) + (tag_overlap_count * 1)
//
//   tier_weight: preference=3, procedural=2, tool=1  (tool=0 if stage !== 'execution')
//   stage_category_match: 1 if entry.category is in the stage's preferred list, else 0
//   tag_overlap_count: number of normalised entry tags matching normalised ctx keywords
//   entries without a tier default to procedural (weight 2).  [load-kb §2b]
//
// GOLDEN VECTOR (constructed per DEC-1, since §2c has no explicit numeric worked example):
//   entry = { tier:'preference', category:'convention', tags:['architecture','agents'] }
//   ctx   = { stage:'planning', keywords:['architecture','plan'] }
//   tier_weight(preference)=3 -> 3*3 = 9
//   'convention' in STAGE_CATEGORIES.planning(['pattern','convention']) -> +1*2 = 2
//   tags∩keywords = {'architecture'} -> +1*1 = 1
//   TOTAL = 12   <-- asserted in tests/score-learning.test.js (drift gate)

// tier weights (load-kb §2b/§2c)
const TIER_WEIGHT = { preference: 3, procedural: 2, tool: 1 };

// stage -> preferred learning categories (load-kb §2a)
// completion: §2a says "Load all categories" — the scoreLearning() stage-match treats
// 'completion' as a wildcard (matches ANY category), so this list is the honest producer
// vocabulary (skills/learn/SKILL.md) for reference only; the wildcard is what gates scoring.
const STAGE_CATEGORIES = {
  requirements: ['convention', 'preference'],
  planning: ['pattern', 'convention'],
  execution: ['pattern', 'mistake'],
  completion: ['preference', 'pattern', 'convention', 'mistake', 'decision', 'insight'],
};

// CONST-4: strip a leading '#', lowercase, trim. Tolerates '#tag' and bare 'tag'.
function normaliseTag(t) {
  return String(t == null ? '' : t).trim().replace(/^#+/, '').toLowerCase().trim();
}

// scoreLearning(entry, ctx) -> number  (load-kb §2c, unchanged)
function scoreLearning(entry, ctx) {
  entry = entry || {};
  ctx = ctx || {};
  const stage = ctx.stage || '';
  const keywords = Array.isArray(ctx.keywords) ? ctx.keywords : [];

  // tier (default procedural per §2b); tool scores 0 outside execution
  const tier = entry.tier || 'procedural';
  let tierWeight = TIER_WEIGHT[tier] != null ? TIER_WEIGHT[tier] : TIER_WEIGHT.procedural;
  if (tier === 'tool' && stage !== 'execution') tierWeight = 0;

  // stage-category match
  const preferred = STAGE_CATEGORIES[stage] || [];
  const stageMatch = entry.category && (stage === 'completion' || preferred.includes(entry.category)) ? 1 : 0;

  // tag overlap (normalised both sides; each unique tag counts at most once — a duplicated
  // tag on an entry must not inflate the score)
  const kw = new Set(keywords.map(normaliseTag).filter(Boolean));
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const matched = new Set();
  for (const t of tags) {
    const n = normaliseTag(t);
    if (n && kw.has(n)) matched.add(n);
  }
  const overlap = matched.size;

  return (tierWeight * 3) + (stageMatch * 2) + (overlap * 1);
}

module.exports = { scoreLearning, TIER_WEIGHT, STAGE_CATEGORIES, normaliseTag };
