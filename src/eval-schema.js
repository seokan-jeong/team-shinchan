#!/usr/bin/env node
/**
 * Evaluation Schema — Team-Shinchan
 * Defines evaluation dimensions, record creation, and JSONL persistence.
 * Built-in modules only (fs, path).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Four evaluation dimensions scored 1-5.
 */
const EVAL_DIMENSIONS = {
  correctness: 'Code/result accuracy',
  efficiency: 'Turns used vs outcome achieved',
  compliance: 'Rules/principles adherence rate',
  quality: 'Code quality (review pass rate)'
};

/**
 * Create a structured evaluation record.
 * @param {string} agent   - Agent name (e.g. "bo", "aichan")
 * @param {string} docId   - Document / workflow ID (e.g. "main-031")
 * @param {number} phase   - Phase number within the workflow
 * @param {Object} scores  - { correctness, efficiency, compliance, quality } each 1-5
 * @param {string} notes   - Free-text notes
 * @returns {Object} Evaluation record
 */
function createEvalRecord(agent, docId, phase, scores, notes) {
  return {
    ts: new Date().toISOString(),
    agent,
    doc_id: docId,
    phase,
    scores,
    notes: notes || ''
  };
}

/**
 * Append an evaluation record as a JSONL line.
 * Creates the file and parent directories if they do not exist.
 * @param {Object} record   - Evaluation record from createEvalRecord
 * @param {string} filePath - Absolute path to the JSONL file
 */
function appendEval(record, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(filePath, line, 'utf-8');
}

module.exports = { EVAL_DIMENSIONS, createEvalRecord, appendEval };
