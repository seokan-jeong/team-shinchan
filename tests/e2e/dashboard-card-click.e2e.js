// tests/e2e/dashboard-card-click.e2e.js
//
// main-069 P6.2 — headless-browser smoke for the master-detail card click.
//
// What it verifies (and would NOT catch via curl + integration tests):
//   1. Clicking a workflow card fires the HTMX hx-get and swaps the doc panel.
//   2. The <iframe src="/api/file?…&view=html"> embedded by the panel actually
//      loads in a real browser (not blocked by a tightened CSP frame-ancestors
//      directive — that was the original card-click "불러오기 실패" bug).
//   3. The iframe document body is non-empty and contains rendered markdown
//      (an <h1>), not raw frontmatter delimiters (`---` at the top would mean
//      the frontmatter stripper regressed).
//   4. The page-level console emits no errors during the flow (catches CSP
//      violations, JS exceptions, network failures that the integration
//      suite cannot observe).
//
// Run with: node tests/e2e/dashboard-card-click.e2e.js
// Requires: puppeteer-core (devDependency) + system Chrome at the default
//           macOS path. On Linux/Windows, set CHROME_PATH=/path/to/chrome.

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer-core');

const REPO_ROOT = path.join(__dirname, '..', '..');
const PORT = process.env.TS_E2E_PORT ? Number(process.env.TS_E2E_PORT) : 18765;
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HEADLESS = process.env.TS_E2E_HEADFUL !== '1';

function log(...args) { console.log('[e2e]', ...args); }
function fail(msg) { console.error('[e2e] FAIL —', msg); process.exitCode = 1; }

async function waitForUp(url, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, res => { res.resume(); resolve(); }).on('error', reject);
      });
      return;
    } catch (_) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error(`server did not come up within ${timeoutMs}ms at ${url}`);
}

async function main() {
  // 1. Spawn dashboard against the real .shinchan-docs so main-069 + archived
  //    workflows are present.
  const dashEnv = { ...process.env, TS_DASHBOARD_PORT: String(PORT), HOST: '127.0.0.1' };
  const dash = spawn('node', ['src/dashboard/index.js'], {
    cwd: REPO_ROOT,
    env: dashEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const dashLog = path.join(os.tmpdir(), `ts-e2e-dash-${process.pid}.log`);
  const dashStream = fs.createWriteStream(dashLog);
  dash.stdout.pipe(dashStream);
  dash.stderr.pipe(dashStream);
  log('dashboard pid', dash.pid, '— log:', dashLog);

  const cleanup = () => {
    try { dash.kill('SIGTERM'); } catch (_) { /* ignore */ }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  try {
    await waitForUp(`http://127.0.0.1:${PORT}/`);
    log('dashboard up on :' + PORT);

    // 2. Launch headless Chrome via puppeteer-core (system binary).
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: HEADLESS ? 'new' : false,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err && err.message ? err.message : String(err)));

      // domcontentloaded only — the SSE /events stream keeps networkidle*
      // from ever firing. We explicitly wait for an .ts-card below.
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      log('landing loaded (DOMContentLoaded)');

      // 3. Click the first card. Wait for HTMX to swap the panel.
      const card = await page.waitForSelector('article.ts-card', { timeout: 3000 });
      if (!card) throw new Error('no .ts-card found on landing page');
      const cardDocId = await card.evaluate(el => el.getAttribute('data-ts-card'));
      log('clicking card', cardDocId);
      await card.click();

      // HTMX swap → wait for an iframe (or the error state) to materialise.
      await page.waitForFunction(() => {
        const panel = document.getElementById('ts-doc-panel');
        if (!panel) return false;
        return panel.querySelector('iframe.ts-doc-iframe')
            || panel.querySelector('[data-ts-doc-empty="error"]');
      }, { timeout: 3000 });

      // 4. Assert: error state did NOT trigger.
      const errVariant = await page.$('#ts-doc-panel [data-ts-doc-empty="error"]');
      if (errVariant) {
        fail('panel showed the error variant ("불러오기 실패") — CSP regression suspected');
        const errText = await errVariant.evaluate(el => el.textContent);
        log('error text:', errText);
      } else {
        log('OK — panel rendered the iframe (no error variant)');
      }

      // 5. Iframe chain: outer <iframe src="/api/file?view=html"> → file-viewer
      //    article → inner <iframe srcdoc="…rendered markdown…">. The user sees
      //    the inner srcdoc, so we descend through both frames to verify the
      //    rendered HTML is real (not the <pre> fallback) and frontmatter-clean.
      const outerIframe = await page.$('#ts-doc-panel iframe.ts-doc-iframe');
      if (!outerIframe) {
        fail('outer iframe.ts-doc-iframe not present after click');
      } else {
        // contentFrame() is null when the browser blocked the load (e.g.
        // frame-ancestors mismatch). The CSP regression manifests here.
        const outerFrame = await outerIframe.contentFrame();
        if (!outerFrame) {
          fail('outer iframe contentFrame() is null — likely blocked by CSP frame-ancestors');
        } else {
          await outerFrame.waitForSelector('article.ts-file-viewer iframe.ts-file-viewer-frame', { timeout: 3000 });
          const outerInfo = await outerFrame.evaluate(() => ({
            mode: document.querySelector('article.ts-file-viewer')
              ? document.querySelector('article.ts-file-viewer').getAttribute('data-ts-md-mode') : null,
            header: document.querySelector('.ts-file-viewer-head h2')
              ? document.querySelector('.ts-file-viewer-head h2').textContent.trim() : null
          }));
          log('outer iframe:', JSON.stringify(outerInfo));
          if (outerInfo.mode !== 'iframe') {
            fail('outer viewer mode is "' + outerInfo.mode + '" — markdown-it fell back to <pre>?');
          }

          // Descend into the srcdoc iframe to confirm rendered markdown shape.
          const innerHandle = await outerFrame.$('article.ts-file-viewer iframe.ts-file-viewer-frame');
          const innerFrame = innerHandle ? await innerHandle.contentFrame() : null;
          if (!innerFrame) {
            fail('inner srcdoc iframe contentFrame() is null — viewer chain broken');
          } else {
            await innerFrame.waitForSelector('body', { timeout: 3000 });
            const inner = await innerFrame.evaluate(() => ({
              firstChildTag: document.body && document.body.firstElementChild
                ? document.body.firstElementChild.tagName : null,
              firstChildInner: document.body && document.body.firstElementChild
                ? document.body.firstElementChild.innerHTML.slice(0, 80) : '',
              h1Count: document.querySelectorAll('h1').length,
              h1First: document.querySelector('h1') ? document.querySelector('h1').textContent : null,
              leadingFrontmatter: document.body
                ? /^---\s/.test(document.body.textContent.trim()) : false,
              hasSetextFrontmatterH2: !!Array.from(document.querySelectorAll('h2')).find(h2 =>
                /doc_id|stage|document_type/.test(h2.textContent))
            }));
            log('inner srcdoc:', JSON.stringify(inner));
            if (inner.leadingFrontmatter) {
              fail('inner body starts with `---` — frontmatter stripper regressed');
            }
            if (inner.hasSetextFrontmatterH2) {
              fail('YAML fields rendered as <h2> — frontmatter stripper not applied');
            }
            if (inner.h1Count === 0) {
              fail('no <h1> in rendered markdown — render-md fell through to <pre>');
            }
          }
        }
      }

      // 6. Report console / page errors. CSP frame-blocking surfaces here
      //    as a "Refused to display ... in a frame" console.error. Filter
      //    benign favicon 404 (browser auto-requests /favicon.ico).
      const failedReqs = [];
      page.on('requestfailed', req => failedReqs.push(req.url() + ' — ' + req.failure().errorText));
      const interestingErrors = consoleErrors.filter(m => !/favicon\.ico/i.test(m));
      if (interestingErrors.length) {
        log('console errors observed:');
        interestingErrors.forEach((m, i) => log('  [' + i + ']', m));
        const fatal = interestingErrors.filter(m => /Refused to display|frame-ancestors|Content Security Policy/i.test(m));
        if (fatal.length) fail('CSP/frame-related console errors: ' + fatal.length);
      } else {
        log('OK — zero meaningful console errors (favicon 404 ignored)');
      }
      if (pageErrors.length) {
        log('page errors observed:');
        pageErrors.forEach((m, i) => log('  [' + i + ']', m));
        fail('page error(s) thrown: ' + pageErrors.length);
      }
    } finally {
      await browser.close();
    }
  } finally {
    cleanup();
  }

  if (process.exitCode && process.exitCode !== 0) {
    log('result: FAIL (exit ' + process.exitCode + ')');
  } else {
    log('result: PASS');
  }
}

main().catch(err => {
  console.error('[e2e] uncaught:', err);
  process.exit(1);
});
