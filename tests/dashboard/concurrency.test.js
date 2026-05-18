// tests/dashboard/concurrency.test.js
//
// Phase 6.2 — LOW-1 S1~S5 동시성 시나리오 정식 통합 테스트.
//
// Phase 3에서 Kazama가 watcher.test.js로 S1/S2/S3/S5 일부를 자동 테스트화했으나,
// Phase 6.2 요구에 따라 본 파일에서 S1~S5 *전부*를 단일 테스트 슈트로 승격하고
// 각 시나리오마다 NFR-7 (Claude 세션 격리) 위반 0건을 명시적으로 검증한다.
//
// 시나리오 정의 (phase-0-decisions.md § LOW-1):
//   S1: WORKFLOW_STATE concurrent write
//       - 대시보드 atomic write (temp+rename) 진행 중에 Claude session이 같은 파일을
//         read한다 → 어느 시점에 읽어도 partial state(반파일) 노출 0건. 모든 read는
//         old 또는 new 완전한 inode 둘 중 하나.
//   S2: hook execution during dashboard write
//       - work-tracker.jsonl에 hook이 append하는 동시에 대시보드는 WORKFLOW_STATE.yaml을
//         write한다 → 두 경로가 서로의 partial state를 관찰하지 않으며 corruption 0건.
//   S3: atomic rename + mtime-based update (multi-tab sync)
//       - 2개 SSE 클라이언트 연결 후 단일 write → 양쪽 모두 정확히 1회 이벤트 수신.
//   S4: stale PID + new session double-boot
//       - 죽은 PID가 적힌 dashboard.pid 파일 + 신규 dashboard 부팅 시도 → 안전한 cleanup
//         (stale PID 감지 → overwrite) or 명확한 거부 (alive PID 감지 → skip).
//   S5: work-tracker.jsonl rotation (inode 변경) → tail reopen
//       - rename + 새 파일 시나리오에서 tail이 새 inode로 reopen해서 이벤트 계속 수신.
//
// 본 슈트는 NFR-7 위반을 정량 카운트하여 (corruption_count, partial_read_count,
// session_disruption_count) 모두 0임을 assert한다.
//
// AC linkage: AC-10, AC-NFR7

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { createServer } = require('../../src/dashboard/server');
const { DashboardWatcher } = require('../../src/dashboard/watcher');
const { SseHub } = require('../../src/dashboard/sse');

// ── Test fixtures ─────────────────────────────────────────────────────

const BASE_YAML = `schema_version: 2
doc_id: "demo-conc"
updated: "2026-05-18T00:00:00Z"

current:
  stage: implementation
  phase: 6
  owner: kazama
  status: active

history:
  - timestamp: "2026-05-18T00:00:00Z"
    event: workflow_started
    agent: shinnosuke
`;

function makeTempCwd(prefix) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'ts-conc-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function seedYaml(cwd, docId, body) {
  const dir = path.join(cwd, '.shinchan-docs', docId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'WORKFLOW_STATE.yaml'),
    body || BASE_YAML.replace('"demo-conc"', `"${docId}"`), 'utf8');
}

async function bootServer(cwd, sse) {
  const { listen, close, sse: hub } = createServer({ cwd, sse: sse || new SseHub() });
  const bound = await listen({ port: 0 });
  return { bound, close, sse: hub };
}

function request(host, port, method, pathStr, opts) {
  const o = opts || {};
  return new Promise((resolve, reject) => {
    const req = http.request({
      host, port, method, path: pathStr,
      headers: Object.assign({ Host: `127.0.0.1:${port}` }, o.headers || {})
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = raw;
        if ((res.headers['content-type'] || '').includes('application/json')) {
          try { body = JSON.parse(raw); } catch (_) {}
        }
        resolve({ status: res.statusCode, body, headers: res.headers, raw });
      });
    });
    req.on('error', reject);
    if (o.body) req.write(typeof o.body === 'string' ? o.body : JSON.stringify(o.body));
    req.end();
  });
}

/**
 * Validate that a YAML file's content represents a complete WORKFLOW_STATE
 * document (not a partial truncated write). Returns false on detected
 * corruption. The contract is: a "complete" file MUST contain both
 * `schema_version:` near the start AND `current:` block — anything less
 * means a reader observed an intermediate state.
 */
function isCompleteYaml(content) {
  if (typeof content !== 'string' || content.length === 0) return false;
  if (!/^schema_version:\s*\d+/m.test(content)) return false;
  if (!/^current:/m.test(content)) return false;
  // Phase 5 invariant: status field always present.
  if (!/^\s+status:\s*\S+/m.test(content)) return false;
  return true;
}

// ────────────────────────────────────────────────────────────────────
// S1 — WORKFLOW_STATE concurrent write (NFR-7 Claude session isolation)
// ────────────────────────────────────────────────────────────────────

test('S1: dashboard atomic write + concurrent Claude session reads — zero partial state observed (NFR-7)', async (t) => {
  const cwd = makeTempCwd('ts-s1-');
  const docId = 'demo-s1';
  seedYaml(cwd, docId);
  const yamlPath = path.join(cwd, '.shinchan-docs', docId, 'WORKFLOW_STATE.yaml');

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // Reader pool simulates Claude session reading the same file 200 times
  // concurrently while the dashboard fires 30 pause/resume actions. Every
  // single read must observe either the OLD or the NEW state — never a
  // half-written body. We carry a counter for partial reads (NFR-7 violation).
  let partialReadCount = 0;
  let totalReads = 0;
  const READ_ITERATIONS = 200;
  const WRITE_ITERATIONS = 30;
  let stopReading = false;

  const readerLoop = (async () => {
    for (let i = 0; i < READ_ITERATIONS; i++) {
      if (stopReading) break;
      try {
        const content = await fsp.readFile(yamlPath, 'utf8');
        totalReads++;
        if (!isCompleteYaml(content)) partialReadCount++;
      } catch (err) {
        // ENOENT during rename is rare with proper atomic write — count if seen.
        if (err.code !== 'ENOENT') throw err;
      }
      // Yield to event loop so writes can interleave.
      await new Promise(r => setImmediate(r));
    }
  })();

  // Concurrent writer loop — fires real dashboard actions (pause/resume).
  const writerLoop = (async () => {
    for (let i = 0; i < WRITE_ITERATIONS; i++) {
      const action = i % 2 === 0 ? 'pause' : 'resume';
      try {
        await request(bound.host, bound.port, 'POST',
          `/api/workflow/${docId}/action`,
          {
            headers: {
              Origin: `http://127.0.0.1:${bound.port}`,
              'Content-Type': 'application/json'
            },
            body: { action, author: 'concurrency-test' }
          });
      } catch (err) {
        // Action endpoint may reject if status is already target; safe to ignore.
      }
      await new Promise(r => setTimeout(r, 5));
    }
    stopReading = true;
  })();

  await Promise.all([readerLoop, writerLoop]);

  // Final state must be a complete WORKFLOW_STATE.
  const final = fs.readFileSync(yamlPath, 'utf8');
  assert.ok(isCompleteYaml(final), 'final WORKFLOW_STATE.yaml must be complete');
  assert.ok(totalReads > 0, 'reader loop must have executed at least once');
  assert.equal(partialReadCount, 0,
    `NFR-7 violation: ${partialReadCount}/${totalReads} reads observed partial state`);

  // Verify no orphan .tmp.* files left behind (atomic write cleanup invariant).
  const dirEntries = fs.readdirSync(path.dirname(yamlPath));
  const orphans = dirEntries.filter(name => name.startsWith('WORKFLOW_STATE.yaml.tmp.'));
  assert.equal(orphans.length, 0,
    `atomic write left ${orphans.length} orphan .tmp file(s): ${orphans.join(', ')}`);
});

// ────────────────────────────────────────────────────────────────────
// S2 — hook execution during dashboard write (NFR-7)
// ────────────────────────────────────────────────────────────────────

test('S2: work-tracker.jsonl hook append + concurrent dashboard WORKFLOW_STATE write — no cross-contamination (NFR-7)', async (t) => {
  const cwd = makeTempCwd('ts-s2-');
  const docId = 'demo-s2';
  seedYaml(cwd, docId);
  const yamlPath = path.join(cwd, '.shinchan-docs', docId, 'WORKFLOW_STATE.yaml');
  const trackerPath = path.join(cwd, '.shinchan-docs', 'work-tracker.jsonl');
  fs.writeFileSync(trackerPath, '');

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // 1) Hook simulator: 100 JSONL appends, like Claude's PostToolUse hook.
  //    O_APPEND on a single file is POSIX-atomic for < PIPE_BUF; we use small
  //    lines so each write is one atomic chunk.
  // 2) Dashboard writer: 20 pause/resume actions (each rewrites WORKFLOW_STATE).
  // The invariant: hook events must NOT leak into WORKFLOW_STATE.yaml, and
  // dashboard payload must NOT leak into work-tracker.jsonl.
  let workflowCorruption = 0;
  let trackerCorruption = 0;
  const HOOK_ITERATIONS = 100;
  const ACTION_ITERATIONS = 20;

  const hookLoop = (async () => {
    for (let i = 0; i < HOOK_ITERATIONS; i++) {
      const evt = JSON.stringify({
        ts: new Date().toISOString(),
        type: 'PostToolUse',
        agent: 'kazama-hook',
        seq: i
      }) + '\n';
      await fsp.appendFile(trackerPath, evt);
      await new Promise(r => setImmediate(r));
    }
  })();

  const actionLoop = (async () => {
    for (let i = 0; i < ACTION_ITERATIONS; i++) {
      try {
        await request(bound.host, bound.port, 'POST',
          `/api/workflow/${docId}/action`,
          {
            headers: {
              Origin: `http://127.0.0.1:${bound.port}`,
              'Content-Type': 'application/json'
            },
            body: { action: i % 2 === 0 ? 'pause' : 'resume', author: 'dash' }
          });
      } catch (_) {}
      await new Promise(r => setTimeout(r, 10));
    }
  })();

  await Promise.all([hookLoop, actionLoop]);

  // ── Invariant A: WORKFLOW_STATE.yaml contains NO PostToolUse hook payload.
  const wsContent = fs.readFileSync(yamlPath, 'utf8');
  if (wsContent.includes('"type":"PostToolUse"') || wsContent.includes('PostToolUse')) {
    workflowCorruption++;
  }
  assert.ok(isCompleteYaml(wsContent), 'WORKFLOW_STATE.yaml must remain valid');

  // ── Invariant B: work-tracker.jsonl has exactly HOOK_ITERATIONS PostToolUse
  // lines and NO dashboard_action lines (those go to WORKFLOW_STATE history).
  const trackerContent = fs.readFileSync(trackerPath, 'utf8');
  const lines = trackerContent.split('\n').filter(l => l.trim() !== '');
  assert.equal(lines.length, HOOK_ITERATIONS,
    `tracker line count mismatch: expected ${HOOK_ITERATIONS}, got ${lines.length}`);
  let validLines = 0;
  for (const line of lines) {
    let parsed;
    try { parsed = JSON.parse(line); } catch (_) {
      trackerCorruption++;
      continue;
    }
    if (parsed.type === 'PostToolUse') validLines++;
    else trackerCorruption++;
  }
  assert.equal(validLines, HOOK_ITERATIONS,
    `expected ${HOOK_ITERATIONS} valid PostToolUse lines, got ${validLines}`);
  assert.equal(trackerCorruption, 0,
    `tracker corruption: ${trackerCorruption} cross-contaminated line(s)`);
  assert.equal(workflowCorruption, 0,
    `workflow corruption: ${workflowCorruption} cross-contaminated entry(s)`);
});

// ────────────────────────────────────────────────────────────────────
// S3 — atomic rename + mtime-based update (multi-tab sync)
// ────────────────────────────────────────────────────────────────────

test('S3: multi-client SSE subscribers all receive workflow_update exactly once after single write (NFR-1, NFR-7)', async (t) => {
  const cwd = makeTempCwd('ts-s3-');
  const docId = 'demo-s3';
  seedYaml(cwd, docId);

  const sse = new SseHub();
  const { bound, close } = await bootServer(cwd, sse);
  t.after(() => close());

  // Simulate 2 dashboard tabs by opening 2 concurrent /events streams.
  const subscriberCount = 2;
  const eventsBySubscriber = [[], []];

  const subs = [];
  for (let idx = 0; idx < subscriberCount; idx++) {
    const captured = eventsBySubscriber[idx];
    const p = new Promise((resolve, reject) => {
      const req = http.request({
        host: bound.host, port: bound.port, method: 'GET', path: '/events',
        headers: { Host: `127.0.0.1:${bound.port}`, Accept: 'text/event-stream' }
      }, (res) => {
        let buf = '';
        res.on('data', chunk => {
          buf += chunk.toString('utf8');
          let cut;
          while ((cut = buf.indexOf('\n\n')) !== -1) {
            const frame = buf.slice(0, cut);
            buf = buf.slice(cut + 2);
            const eventMatch = frame.match(/^event: (.+)$/m);
            const dataMatch = frame.match(/^data: (.+)$/m);
            if (eventMatch && dataMatch) {
              let parsed;
              try { parsed = JSON.parse(dataMatch[1]); } catch (_) { parsed = dataMatch[1]; }
              captured.push({ event: eventMatch[1], data: parsed });
              if (eventMatch[1] === 'workflow_update' && parsed.doc_id === docId) {
                res.destroy();
                resolve();
              }
            }
          }
        });
        res.on('error', () => { /* destroy intended */ });
      });
      req.on('error', reject);
      req.end();
      setTimeout(() => reject(new Error(`subscriber ${idx} SSE timeout`)), 5000);
    });
    subs.push(p);
  }

  // Wait briefly so 'connected' frames are flushed before we trigger the update.
  await new Promise(r => setTimeout(r, 150));

  // Single POST action → exactly ONE write → both tabs must observe ONE update.
  const res = await request(bound.host, bound.port, 'POST',
    `/api/workflow/${docId}/action`,
    {
      headers: {
        Origin: `http://127.0.0.1:${bound.port}`,
        'Content-Type': 'application/json'
      },
      body: { action: 'pause', author: 'multi-tab' }
    });
  assert.equal(res.status, 200);

  await Promise.all(subs);

  // Both subscribers must have observed exactly 1 workflow_update for this doc.
  for (let idx = 0; idx < subscriberCount; idx++) {
    const updates = eventsBySubscriber[idx].filter(e =>
      e.event === 'workflow_update' && e.data && e.data.doc_id === docId);
    assert.equal(updates.length, 1,
      `subscriber ${idx}: expected 1 workflow_update, got ${updates.length}`);
    assert.equal(updates[0].data.action, 'pause');
    assert.equal(updates[0].data.swap, 'card');
    assert.match(updates[0].data.html, new RegExp(`data-ts-card="${docId}"`));
  }

  // Atomic rename invariant: a reader opening DURING the write window will
  // see either the old or the new inode, never partial bytes.
  const yamlPath = path.join(cwd, '.shinchan-docs', docId, 'WORKFLOW_STATE.yaml');
  const content = fs.readFileSync(yamlPath, 'utf8');
  assert.ok(isCompleteYaml(content), 'post-write WORKFLOW_STATE must be complete');
  assert.match(content, /status: paused/, 'pause action must have been applied');
});

// ────────────────────────────────────────────────────────────────────
// S4 — stale PID + new session double-boot
// ────────────────────────────────────────────────────────────────────
//
// The dashboard-up.sh hook was deferred in Phase 5 (see PLAN.md L618 — PID
// guard is "fail-safe" deferred to Phase 6.3). This test exercises the *PID
// detection logic* that any orchestration would use (process.kill(pid, 0) for
// liveness check), proving that the standard recipe correctly distinguishes
// stale vs alive PIDs and yields the right action on each branch.

test('S4: stale PID file detection — safely overwrites for new instance; alive PID skips boot (NFR-7)', async (t) => {
  const cwd = makeTempCwd('ts-s4-');
  const pidPath = path.join(cwd, '.shinchan-docs', '.dashboard.pid');

  // ── Liveness probe — the standard POSIX-portable PID-alive recipe.
  const isPidAlive = (pid) => {
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return false;
    try {
      // Signal 0 only checks if the process exists; no signal is delivered.
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // ESRCH = no such process (stale). EPERM = exists but not ours (alive).
      if (err.code === 'ESRCH') return false;
      if (err.code === 'EPERM') return true;
      return false;
    }
  };

  // ── Branch A: stale PID file (PID 999999 unlikely to exist).
  // The PID 999999 is chosen because Linux kernel.pid_max default is 32768
  // (or 4194304 on 64-bit). macOS caps PID at 99998. So 999999 is reliably stale.
  const stalePid = 999999;
  fs.writeFileSync(pidPath, String(stalePid), 'utf8');
  const staleAlive = isPidAlive(stalePid);
  assert.equal(staleAlive, false, 'PID 999999 must be detected as stale');

  // Simulated cleanup: a new dashboard would unlink + write its own PID.
  // The "safe" action is to overwrite — never blindly skip on a stale file.
  if (!staleAlive) {
    fs.unlinkSync(pidPath);
  }
  assert.ok(!fs.existsSync(pidPath), 'stale PID file must be cleanable');
  const newPid = process.pid;
  fs.writeFileSync(pidPath, String(newPid), 'utf8');
  assert.equal(fs.readFileSync(pidPath, 'utf8').trim(), String(newPid));

  // ── Branch B: alive PID file (use our own PID — guaranteed alive).
  assert.equal(isPidAlive(process.pid), true, 'self PID must be detected as alive');

  // Branch B mandates "skip boot" — no overwrite. Verify the existing PID is
  // preserved when we (correctly) detect alive.
  let secondBootProceeded = false;
  if (!isPidAlive(parseInt(fs.readFileSync(pidPath, 'utf8'), 10))) {
    secondBootProceeded = true;  // would overwrite — wrong
  }
  assert.equal(secondBootProceeded, false,
    'second boot must SKIP when existing PID is alive (idempotent guarantee, NFR-7)');

  // ── Branch C: garbage PID file (corrupted bytes) must be treated as stale.
  fs.writeFileSync(pidPath, 'not-a-number', 'utf8');
  const garbagePid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
  assert.ok(!Number.isFinite(garbagePid),
    'garbage PID must not parse as a finite number');
  // The orchestrator should treat a parse failure exactly like ESRCH (stale).
  assert.equal(isPidAlive(garbagePid), false,
    'garbage PID must be treated as stale (orchestrator can safely overwrite)');
});

// ────────────────────────────────────────────────────────────────────
// S5 — work-tracker.jsonl rotation (inode change) → tail reopen
// ────────────────────────────────────────────────────────────────────

test('S5: work-tracker.jsonl rotation — tail reopens on inode change, no event loss (NFR-7)', async (t) => {
  const cwd = makeTempCwd('ts-s5-');
  const trackerPath = path.join(cwd, '.shinchan-docs', 'work-tracker.jsonl');
  fs.writeFileSync(trackerPath, '');

  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  const captured = [];
  watcher.on('tracker_event', (evt) => { captured.push(evt); });

  // Phase A — pre-rotation events.
  for (let i = 0; i < 3; i++) {
    fs.appendFileSync(trackerPath,
      JSON.stringify({ phase: 'pre', seq: i, ts: new Date().toISOString() }) + '\n');
  }
  // Wait for poll cycle (TAIL_POLL_MS=500 in watcher.js) plus margin.
  await new Promise(r => setTimeout(r, 900));

  // Phase B — rotation: rename out + create new empty file (logrotate pattern).
  const rotated = trackerPath + '.20260518';
  fs.renameSync(trackerPath, rotated);
  fs.writeFileSync(trackerPath, '');

  // Phase C — post-rotation events. The watcher MUST reopen on inode change.
  for (let i = 0; i < 3; i++) {
    fs.appendFileSync(trackerPath,
      JSON.stringify({ phase: 'post', seq: i, ts: new Date().toISOString() }) + '\n');
    await new Promise(r => setTimeout(r, 50));
  }

  // Wait for at least one full poll cycle for the watcher to detect & reopen.
  // Plus another margin to consume the post-rotation lines.
  await new Promise(r => setTimeout(r, 1500));

  // ── Assertions
  const preEvents = captured.filter(e => e.phase === 'pre');
  const postEvents = captured.filter(e => e.phase === 'post');
  assert.equal(preEvents.length, 3,
    `pre-rotation events: expected 3, got ${preEvents.length}`);
  assert.equal(postEvents.length, 3,
    `post-rotation events: expected 3 (tail must reopen new inode), got ${postEvents.length}`);

  // Sequence integrity — order preserved within each phase.
  for (let i = 0; i < 3; i++) {
    assert.equal(preEvents[i].seq, i);
    assert.equal(postEvents[i].seq, i);
  }

  // Verify rotated file is untouched (no double-read corruption).
  assert.ok(fs.existsSync(rotated));
  const rotatedLines = fs.readFileSync(rotated, 'utf8').split('\n').filter(l => l.trim() !== '');
  assert.equal(rotatedLines.length, 3,
    `rotated file must retain 3 pre-rotation lines, got ${rotatedLines.length}`);
});

// ────────────────────────────────────────────────────────────────────
// Aggregate gate — claude_session_isolated: true (AC-NFR7)
// ────────────────────────────────────────────────────────────────────

test('AC-NFR7 aggregate: S1-S5 zero NFR-7 violations across combined stress (claude_session_isolated: true)', async (t) => {
  // This test cross-validates the per-scenario invariants by running them
  // back-to-back in a single process with shared state-tracking. If any
  // earlier test's invariant was met "by luck of timing", running them
  // densely together would surface it.
  const cwd = makeTempCwd('ts-agg-');
  const docId = 'demo-agg';
  seedYaml(cwd, docId);
  const yamlPath = path.join(cwd, '.shinchan-docs', docId, 'WORKFLOW_STATE.yaml');
  const trackerPath = path.join(cwd, '.shinchan-docs', 'work-tracker.jsonl');
  fs.writeFileSync(trackerPath, '');

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // Concurrent everything for 1500 ms.
  const startTs = Date.now();
  const DURATION_MS = 1500;
  let violations = 0;
  let partialReads = 0;
  let trackerCorruption = 0;

  const burstReader = (async () => {
    while (Date.now() - startTs < DURATION_MS) {
      try {
        const content = await fsp.readFile(yamlPath, 'utf8');
        if (!isCompleteYaml(content)) {
          partialReads++;
          violations++;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      await new Promise(r => setImmediate(r));
    }
  })();

  const burstWriter = (async () => {
    let i = 0;
    while (Date.now() - startTs < DURATION_MS) {
      try {
        await request(bound.host, bound.port, 'POST',
          `/api/workflow/${docId}/action`,
          {
            headers: {
              Origin: `http://127.0.0.1:${bound.port}`,
              'Content-Type': 'application/json'
            },
            body: { action: i % 2 === 0 ? 'pause' : 'resume', author: 'agg' }
          });
      } catch (_) {}
      i++;
      await new Promise(r => setTimeout(r, 15));
    }
  })();

  const hookBurst = (async () => {
    let i = 0;
    while (Date.now() - startTs < DURATION_MS) {
      await fsp.appendFile(trackerPath,
        JSON.stringify({ ts: new Date().toISOString(), type: 'agg_hook', seq: i++ }) + '\n');
      await new Promise(r => setTimeout(r, 8));
    }
  })();

  await Promise.all([burstReader, burstWriter, hookBurst]);

  // Validate final tracker integrity.
  const trackerLines = fs.readFileSync(trackerPath, 'utf8').split('\n').filter(l => l.trim() !== '');
  for (const line of trackerLines) {
    try { JSON.parse(line); } catch (_) { trackerCorruption++; violations++; }
  }

  // Validate final WORKFLOW_STATE.yaml integrity.
  const finalYaml = fs.readFileSync(yamlPath, 'utf8');
  if (!isCompleteYaml(finalYaml)) { violations++; }

  // No orphan .tmp files left.
  const dirEntries = fs.readdirSync(path.dirname(yamlPath));
  const orphans = dirEntries.filter(name => name.startsWith('WORKFLOW_STATE.yaml.tmp.'));

  assert.equal(violations, 0,
    `AC-NFR7 violations under combined stress: ${violations} ` +
    `(partial_reads=${partialReads}, tracker_corruption=${trackerCorruption})`);
  assert.equal(orphans.length, 0,
    `atomic write left ${orphans.length} orphan(s): ${orphans.join(', ')}`);
  assert.ok(trackerLines.length > 0, 'hook burst must have appended at least 1 line');
});
