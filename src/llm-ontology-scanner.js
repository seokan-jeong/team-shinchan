#!/usr/bin/env node
/**
 * LLM Ontology Scanner — LLM-driven entity extraction via prompt output
 * Zero npm deps. Node.js built-in only.
 *
 * Design: 에이전트(Claude)가 이 스크립트의 --prompt 모드 출력을 읽고,
 * 결과 JSON을 --ingest 모드로 되돌려 보내는 2-단계 패턴.
 *
 * CLI:
 *   node src/llm-ontology-scanner.js --prompt <project-root>   → 청킹된 파일 목록 + 프롬프트 출력
 *   node src/llm-ontology-scanner.js --check <scan-json-file>  → diff 리포트 출력 (수정 없음)
 *   node src/llm-ontology-scanner.js --ingest <scan-json-file> → ontology.json에 병합
 *
 * Internal API (used by ontology-engine.js):
 *   autoScan(projectRoot, opts) → { candidates: [...], meta: {...} }
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = '.shinchan-docs/ontology/.llm-scan-cache.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Files/dirs to always skip during LLM scan
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.shinchan-docs', 'coverage', '.next', '__pycache__', '.serena', '.superset', '.cache']);
const SKIP_FILES_RE = [/^\.env(\.|$)/, /^\.gitignore$/, /node_modules/, /\.min\.js$/, /package-lock\.json$/, /yarn\.lock$/];

// Extensions eligible for LLM analysis
const SCAN_EXTS = new Set(['.js', '.ts', '.mjs', '.cjs', '.py', '.go', '.md', '.sh']);

// Max file size for LLM chunk (characters, not bytes)
const CHUNK_MAX_CHARS = 500;

// ─── Cache Management ───────────────────────────────────────────────

function cachePath(projectRoot) {
  return path.join(projectRoot, CACHE_FILE);
}

function loadCache(projectRoot) {
  const cp = cachePath(projectRoot);
  if (!fs.existsSync(cp)) return null;
  try {
    const raw = fs.readFileSync(cp, 'utf-8');
    const cache = JSON.parse(raw);
    if (!cache.timestamp || !cache.fileHash) return null;
    const age = Date.now() - new Date(cache.timestamp).getTime();
    if (age > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

function saveCache(projectRoot, fileHash, result) {
  const cp = cachePath(projectRoot);
  const cacheDir = path.dirname(cp);
  if (!fs.existsSync(cacheDir)) {
    try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { return; }
  }
  try {
    const cache = {
      timestamp: new Date().toISOString(),
      fileHash,
      result
    };
    fs.writeFileSync(cp, JSON.stringify(cache, null, 2));
  } catch { /* silent */ }
}

// ─── File Collection ────────────────────────────────────────────────

function shouldSkipFile(filePath, fileName) {
  if (SKIP_FILES_RE.some(re => re.test(fileName))) return true;
  if (SKIP_FILES_RE.some(re => re.test(filePath))) return true;
  return false;
}

function collectFiles(projectRoot) {
  const files = [];

  function walk(dir, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(projectRoot, fullPath);

      if (SKIP_DIRS.has(entry.name)) continue;

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!SCAN_EXTS.has(ext)) continue;

      if (shouldSkipFile(relPath, entry.name)) continue;

      // Skip very large files
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 200 * 1024) continue; // >200KB skip
      } catch { continue; }

      files.push({ fullPath, relPath, name: entry.name, ext });
    }
  }

  walk(projectRoot, 0);
  return files;
}

// ─── File Hash (for cache key) ──────────────────────────────────────

function hashFileset(files) {
  const filePaths = files.map(f => f.relPath).sort().join('\n');
  return crypto.createHash('sha1').update(filePaths).digest('hex').slice(0, 12);
}

// ─── Chunking ───────────────────────────────────────────────────────

/**
 * Split a list of files into chunks where each chunk's combined path list
 * stays under CHUNK_MAX_CHARS. This is MiroFish-style file-unit chunking.
 */
function chunkFiles(files) {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (const file of files) {
    const contribution = file.relPath.length + 1; // +1 for newline
    if (currentChunk.length > 0 && currentSize + contribution > CHUNK_MAX_CHARS) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(file);
    currentSize += contribution;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ─── Prompt Generation ──────────────────────────────────────────────

/**
 * Generate a structured prompt that an LLM agent can use to analyze files
 * and return entity candidates in JSON format.
 */
function generatePrompt(projectRoot, chunk, chunkIdx, totalChunks) {
  const fileList = chunk.map(f => `  - ${f.relPath}`).join('\n');
  const entityTypes = [
    'Module (directory-level grouping)',
    'Component (exported function/class)',
    'DomainConcept (architectural pattern, business concept)',
    'Pattern (design pattern: ReACT, StateM, ChunkPipeline, etc.)',
    'API (REST endpoint or GraphQL resolver)',
    'DataModel (database schema or data structure)',
    'Decision (architecture decision)',
    'Dependency (external library)',
    'Configuration (config file/env)',
    'TestSuite (test file)'
  ].join('\n  ');

  return `# LLM Ontology Scanner — Chunk ${chunkIdx + 1}/${totalChunks}
Project: ${projectRoot}

## Task
Analyze the following files and extract semantic entities that are NOT already captured
by static analysis (imports, class definitions). Focus on HIGH-LEVEL patterns:
- Architectural patterns (ReACT loop, state machine, chunk pipeline)
- Domain concepts expressed in comments or naming conventions
- Design decisions embedded in code structure
- Cross-cutting concerns

## Files in this chunk
${fileList}

## Entity Types
  ${entityTypes}

## Output Format
Return a JSON object with this exact schema:
{
  "entities": [
    {
      "type": "Pattern",
      "name": "ReACT Analysis Loop",
      "description": "Thought-Action-Observation-Answer cycle",
      "file_path": "agents/hiroshi.md",
      "confidence": "high"
    }
  ]
}

Rules:
- Only include entities NOT obvious from file names/imports
- Set confidence: "high" if file_path is verifiable, "medium" if inferred, "low" if speculative
- file_path must be relative to project root (or null if not file-specific)
- Return empty entities array if nothing significant found
- DO NOT hallucinate file paths — only use paths from the file list above`;
}

// ─── Candidate Extraction (static fallback) ─────────────────────────

/**
 * Extract candidates using lightweight static analysis as a fallback
 * when no LLM result is available. This provides the --prompt mode output.
 */
function extractCandidatesFromFiles(projectRoot, files) {
  const candidates = [];

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file.fullPath, 'utf-8').slice(0, 2000);
    } catch { continue; }

    // Look for architectural pattern comments/names
    const patternRe = /\b(ReACT|StateM(?:achine)?|ChunkPipeline|Observer|Strategy|Factory|Singleton|Pipeline|EventBus|CQRS|DDD|BDD|TDD)\b/gi;
    const patternMatches = new Set();
    let m;
    while ((m = patternRe.exec(content)) !== null) {
      patternMatches.add(m[1]);
    }

    for (const patternName of patternMatches) {
      const fileExists = fs.existsSync(file.fullPath);
      candidates.push({
        type: 'Pattern',
        name: patternName,
        description: `Design pattern referenced in ${file.relPath}`,
        file_path: file.relPath,
        confidence: fileExists ? 'high' : 'low'
      });
    }

    // Look for domain concepts in .md files (heading-based)
    if (file.ext === '.md') {
      const headingRe = /^#{1,3}\s+(.+)$/gm;
      while ((m = headingRe.exec(content)) !== null) {
        const heading = m[1].trim();
        // Only include meaningful headings (not common boilerplate)
        if (heading.length > 5 && heading.length < 80 &&
            !/^(Usage|Installation|License|Contributing|Table of Contents|Contents|Overview|TODO|FIXME|NOTE)$/i.test(heading)) {
          candidates.push({
            type: 'DomainConcept',
            name: heading,
            description: `Domain concept from ${file.relPath}`,
            file_path: file.relPath,
            confidence: 'medium'
          });
          break; // Only take first meaningful heading per file
        }
      }
    }
  }

  // Deduplicate by name+type
  const seen = new Set();
  return candidates.filter(c => {
    const key = `${c.type}:${c.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Diff Report ────────────────────────────────────────────────────

/**
 * Compare scan result candidates against existing ontology.
 * Returns { newEntities, existingCount } for --check mode reporting.
 */
function diffReport(projectRoot, candidates) {
  const ontoPath = path.join(projectRoot, '.shinchan-docs/ontology/ontology.json');
  let existingNames = new Set();

  if (fs.existsSync(ontoPath)) {
    try {
      const onto = JSON.parse(fs.readFileSync(ontoPath, 'utf-8'));
      for (const e of (onto.entities || [])) {
        existingNames.add(`${e.type}:${(e.name || e.title || '').toLowerCase()}`);
      }
    } catch { /* silent */ }
  }

  const newEntities = candidates.filter(c => {
    const key = `${c.type}:${c.name.toLowerCase()}`;
    return !existingNames.has(key);
  });

  return { newEntities, existingCount: existingNames.size };
}

// ─── Ingest (merge into ontology) ───────────────────────────────────

/**
 * Convert LLM scan candidates to ontology-engine merge format.
 * Maps Pattern/DomainConcept/etc. to valid entity types.
 */
function candidatesToScanResult(candidates) {
  const entities = [];
  let idx = 0;

  for (const c of candidates) {
    // Map to valid ENTITY_TYPES
    const validTypes = new Set([
      'Module', 'Component', 'DomainConcept', 'API', 'DataModel',
      'Decision', 'Pattern', 'Dependency', 'Configuration', 'TestSuite'
    ]);

    const entityType = validTypes.has(c.type) ? c.type : 'DomainConcept';
    const id = `llm-${idx++}`;
    const entity = { id, type: entityType };

    if (entityType === 'Pattern') {
      entity.name = c.name;
      entity.description = c.description || '';
      if (c.file_path) entity.examples = [c.file_path];
    } else if (entityType === 'DomainConcept') {
      entity.name = c.name;
      entity.definition = c.description || `Discovered by LLM scan`;
    } else if (entityType === 'Decision') {
      entity.title = c.name;
      entity.rationale = c.description || '';
      entity.date = new Date().toISOString().slice(0, 10);
    } else {
      entity.name = c.name;
      if (c.file_path) entity.file_path = c.file_path;
      if (c.description) entity.description = c.description;
    }

    entities.push(entity);
  }

  return { entities, relations: [] };
}

// ─── Main autoScan API ───────────────────────────────────────────────

/**
 * Core API used by ontology-engine.js auto-scan command.
 * Returns { candidates, meta } where candidates is the list of entity candidates
 * found by LLM-style static analysis + pattern detection.
 *
 * opts.mode = 'check' | 'write'
 * opts.useCache = true (default)
 */
function autoScan(projectRoot, opts) {
  const mode = (opts && opts.mode) || 'check';
  const useCache = opts && opts.useCache === false ? false : true;
  const root = path.resolve(projectRoot);

  if (!fs.existsSync(root)) {
    return { candidates: [], meta: { error: 'Project root not found: ' + root } };
  }

  // Collect eligible files
  const files = collectFiles(root);
  const fileHash = hashFileset(files);

  // Cache check
  if (useCache) {
    const cached = loadCache(root);
    if (cached && cached.fileHash === fileHash) {
      return Object.assign({}, cached.result, { meta: Object.assign({}, cached.result.meta, { fromCache: true }) });
    }
  }

  // Extract candidates
  const allCandidates = extractCandidatesFromFiles(root, files);

  // Validate file paths
  const validatedCandidates = allCandidates.map(c => {
    if (!c.file_path) return c;
    const fullPath = path.join(root, c.file_path);
    const pathExists = fs.existsSync(fullPath);
    return Object.assign({}, c, {
      confidence: pathExists ? 'high' : (c.confidence === 'high' ? 'medium' : c.confidence || 'low')
    });
  });

  const result = {
    candidates: validatedCandidates,
    meta: {
      scanned_at: new Date().toISOString(),
      project_root: root,
      files_scanned: files.length,
      file_hash: fileHash,
      mode,
      fromCache: false
    }
  };

  // Save cache
  if (useCache) {
    saveCache(root, fileHash, result);
  }

  return result;
}

// ─── CLI ─────────────────────────────────────────────────────────────

function cli() {
  const args = process.argv.slice(2);

  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log('LLM Ontology Scanner — 2-step LLM-driven entity extraction');
    console.log('');
    console.log('Usage:');
    console.log('  node src/llm-ontology-scanner.js --prompt <project-root>');
    console.log('    Output chunked file list + analysis prompt for LLM agent');
    console.log('');
    console.log('  node src/llm-ontology-scanner.js --check <scan-json-file>');
    console.log('    Compare scan result with ontology.json, report differences (no modification)');
    console.log('');
    console.log('  node src/llm-ontology-scanner.js --ingest <scan-json-file>');
    console.log('    Merge validated scan result into ontology.json');
    console.log('');
    console.log('Internal API (used by ontology-engine.js):');
    console.log('  autoScan(projectRoot, { mode: "check"|"write" })');
    console.log('  → { candidates: [...], meta: {...} }');
    return;
  }

  const mode = args[0];
  const target = args[1];

  if (mode === '--prompt') {
    const root = path.resolve(target || process.cwd());
    if (!fs.existsSync(root)) {
      console.error(`Project root not found: ${root}`);
      process.exit(1);
    }
    const files = collectFiles(root);
    const chunks = chunkFiles(files);

    console.log(`# LLM Ontology Scan — ${chunks.length} chunk(s), ${files.length} files`);
    console.log(`# Project: ${root}`);
    console.log('');

    chunks.forEach((chunk, i) => {
      console.log(`## Chunk ${i + 1}/${chunks.length}`);
      console.log(generatePrompt(root, chunk, i, chunks.length));
      console.log('');
    });

    console.log('# Instructions for LLM agent:');
    console.log('# 1. Read the files listed in each chunk');
    console.log('# 2. Identify high-level patterns, domain concepts, and architectural decisions');
    console.log('# 3. Return JSON in the format shown in each chunk prompt');
    console.log('# 4. Save combined results to a .json file');
    console.log('# 5. Run: node src/llm-ontology-scanner.js --check <result.json>');
    return;
  }

  if (mode === '--check') {
    if (!target) {
      console.error('Usage: llm-ontology-scanner --check <scan-json-file>');
      process.exit(1);
    }
    let scanData;
    try {
      scanData = JSON.parse(fs.readFileSync(target, 'utf-8'));
    } catch (e) {
      console.error(`Cannot read scan file: ${e.message}`);
      process.exit(1);
    }

    const candidates = scanData.candidates || scanData.entities || [];
    const root = scanData.meta && scanData.meta.project_root ? scanData.meta.project_root : process.cwd();
    const { newEntities, existingCount } = diffReport(root, candidates);

    console.log(`LLM Scan --check: ${candidates.length} candidates, ${existingCount} existing entities in ontology`);
    if (newEntities.length === 0) {
      console.log('No new entities found — ontology is up to date.');
    } else {
      console.log(`New entities (${newEntities.length}):`);
      newEntities.forEach(c => {
        const confidence = c.confidence || 'medium';
        console.log(`  [${confidence}] ${c.type}: ${c.name}${c.file_path ? ` (${c.file_path})` : ''}`);
      });
    }
    return;
  }

  if (mode === '--ingest') {
    if (!target) {
      console.error('Usage: llm-ontology-scanner --ingest <scan-json-file>');
      process.exit(1);
    }
    let scanData;
    try {
      scanData = JSON.parse(fs.readFileSync(target, 'utf-8'));
    } catch (e) {
      console.error(`Cannot read scan file: ${e.message}`);
      process.exit(1);
    }

    const candidates = scanData.candidates || scanData.entities || [];
    const root = scanData.meta && scanData.meta.project_root ? scanData.meta.project_root : process.cwd();

    // Load ontology-engine for merge
    const enginePath = path.join(__dirname, 'ontology-engine.js');
    if (!fs.existsSync(enginePath)) {
      console.error('ontology-engine.js not found in src/');
      process.exit(1);
    }
    const engine = require(enginePath);
    const scanResult = candidatesToScanResult(candidates);
    const stats = engine.merge(root, scanResult);
    console.log(`Ingest complete: +${stats.added.entities} entities, +${stats.added.relations} relations`);
    console.log(`Skipped: ${stats.skipped.entities} duplicates`);
    return;
  }

  console.error(`Unknown mode: ${mode}. Use --prompt, --check, or --ingest.`);
  process.exit(1);
}

if (require.main === module) {
  try { cli(); } catch (e) { console.error('Error: ' + e.message); process.exit(1); }
}

module.exports = { autoScan, candidatesToScanResult, diffReport, generatePrompt, collectFiles, chunkFiles };
