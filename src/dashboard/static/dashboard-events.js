/*
 * Team-Shinchan Dashboard — client-side SSE → DOM router.
 *
 * The server pushes JSON events over /events. Each event carries a `swap`
 * field that tells the client which LOW-2 tier to use:
 *   { swap: "card"   } → outerHTML over [data-ts-card="<id>"]
 *   { swap: "field"  } → innerHTML over [data-ts-field="<id>:<f>"]
 *   { swap: "add"    } → afterbegin into #ts-grid
 *   { swap: "remove" } → remove([data-ts-card="<id>"])
 * Unknown/missing swap → ignored. heartbeat/connected events only update
 * the connection indicator (no DOM mutation).
 *
 * CSP: loaded by /static/ → `script-src 'self'` allows it. No third-party
 * origin. No eval / new Function. main-069 P4 added the
 * `data-ts-just-updated` flash lifecycle — see markJustUpdated() below.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var connEl = null;
  function getConnEl() {
    if (!connEl) connEl = document.getElementById('ts-conn');
    return connEl;
  }
  function setConn(state, label) {
    var el = getConnEl();
    if (!el) return;
    el.setAttribute('data-ts-conn', state);
    var lbl = el.querySelector('[data-ts-conn-label]');
    if (lbl) lbl.textContent = label || state;
  }

  // main-071 FR-5 — last-update indicator. SSE events stamp the timestamp;
  // the helper formats it relative ("N초 전" / "N분 전") and writes into the
  // #ts-last-update slot rendered by layout.js. A 60s setInterval keeps the
  // display fresh even with no new events (R-4 safety net for missed done
  // writes within the watcher debounce window). If the slot is absent (e.g.
  // an older layout) every call is a no-op.
  var lastUpdateTimestamp = null;
  var lastUpdateEl = null;
  function getLastUpdateEl() {
    if (!lastUpdateEl) lastUpdateEl = document.getElementById('ts-last-update');
    return lastUpdateEl;
  }
  function formatRelativeKo(then, now) {
    var ms = now.getTime() - then.getTime();
    if (ms < 0) return '방금';
    var s = Math.floor(ms / 1000);
    if (s < 30) return '방금';
    if (s < 60) return s + '초 전';
    var m = Math.floor(s / 60);
    if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60);
    if (h < 24) return h + '시간 전';
    return Math.floor(h / 24) + '일 전';
  }
  function updateLastUpdateIndicator(stamp) {
    if (stamp instanceof Date) lastUpdateTimestamp = stamp;
    var el = getLastUpdateEl();
    if (!el) return;
    if (!lastUpdateTimestamp) { el.textContent = ''; return; }
    el.textContent = '마지막 업데이트: ' + formatRelativeKo(lastUpdateTimestamp, new Date());
  }

  function findCard(docId) {
    return document.querySelector('[data-ts-card="' + cssEscape(docId) + '"]');
  }
  function findField(docId, field) {
    return document.querySelector('[data-ts-field="' + cssEscape(docId + ':' + field) + '"]');
  }
  function findGrid() {
    return document.getElementById('ts-grid');
  }
  // Minimal CSS.escape polyfill (modern browsers ship CSS.escape; we add a
  // graceful fallback for older WebKit).
  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    // Conservative escape: forbid anything outside [A-Za-z0-9_.:-].
    return String(value).replace(/[^A-Za-z0-9_.:\-]/g, function (c) {
      return '\\' + c;
    });
  }

  // Trigger HTMX's processing on a freshly-injected fragment so its hx-*
  // attributes wire up (otherwise actions buttons would be inert).
  function htmxProcess(el) {
    if (window.htmx && typeof window.htmx.process === 'function') {
      try { window.htmx.process(el); } catch (_) { /* ignore */ }
    }
  }

  // main-069 P4 / FR-1.4 — SSE update flash (`data-ts-just-updated` lifecycle).
  // The timer handle is stored on the element as `_tsClearTimer` (private to
  // this module — underscore prefix signals "do not touch from outside") so
  // it auto-cleans when htmx removes the node, with no external Map pinning
  // detached nodes in memory. Rapid SSE bursts reset, never stack (R-5).
  function clearJustUpdated(el) {
    if (!el || typeof el !== 'object') return;
    if (el._tsClearTimer) {
      try { clearTimeout(el._tsClearTimer); } catch (_) { /* ignore */ }
      el._tsClearTimer = null;
    }
    if (el.removeAttribute) el.removeAttribute('data-ts-just-updated');
  }
  function markJustUpdated(el) {
    if (!el || typeof el !== 'object' || !el.setAttribute) return;
    clearJustUpdated(el); // R-5: reset before scheduling — never stack timers.
    el.setAttribute('data-ts-just-updated', 'true');
    el._tsClearTimer = setTimeout(function () {
      if (el.removeAttribute) el.removeAttribute('data-ts-just-updated');
      el._tsClearTimer = null;
    }, 1500);
  }
  // Walk to nearest card ancestor so a field swap flashes the whole card,
  // matching the "this workflow updated" mental model. Falls back to self.
  function flashTargetFor(el) {
    if (!el || typeof el !== 'object') return null;
    if (el.hasAttribute && el.hasAttribute('data-ts-card')) return el;
    if (typeof el.closest === 'function') {
      var card = el.closest('[data-ts-card]');
      if (card) return card;
    }
    return el;
  }

  function handleSwap(payload) {
    if (!payload || typeof payload !== 'object') return;
    var swap = payload.swap;
    var docId = payload.doc_id;
    var html = typeof payload.html === 'string' ? payload.html : '';
    if (!swap || !docId) return;

    switch (swap) {
      case 'card': {
        var card = findCard(docId);
        if (!card) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var fresh = tmp.firstElementChild;
        if (!fresh) return;
        card.replaceWith(fresh);
        htmxProcess(fresh);
        // P4: flash the freshly-inserted card so the user sees what changed.
        markJustUpdated(fresh);
        break;
      }
      case 'field': {
        var field = findField(docId, payload.field);
        if (!field) return;
        field.innerHTML = html;
        htmxProcess(field);
        // P4: walk up to the enclosing card so the whole card flashes, not
        // just the inner slot (matches "this workflow updated" intuition).
        markJustUpdated(flashTargetFor(field));
        break;
      }
      case 'add': {
        var grid = findGrid();
        if (!grid) return;
        // Prevent duplicate insertion if the server resends.
        if (findCard(docId)) return;
        var tmp2 = document.createElement('div');
        tmp2.innerHTML = html.trim();
        var fresh2 = tmp2.firstElementChild;
        if (!fresh2) return;
        grid.insertAdjacentElement('afterbegin', fresh2);
        var countEl = grid;
        if (countEl) {
          var n = parseInt(countEl.getAttribute('data-ts-count') || '0', 10);
          countEl.setAttribute('data-ts-count', String(isNaN(n) ? 1 : n + 1));
        }
        htmxProcess(fresh2);
        // P4: flash newly-added cards so an inserted workflow draws the eye.
        markJustUpdated(fresh2);
        break;
      }
      case 'remove': {
        var dead = findCard(docId);
        if (!dead) return;
        dead.remove();
        var grid2 = findGrid();
        if (grid2) {
          var n2 = parseInt(grid2.getAttribute('data-ts-count') || '0', 10);
          grid2.setAttribute('data-ts-count', String(isNaN(n2) ? 0 : Math.max(0, n2 - 1)));
        }
        break;
      }
      default:
        // Unknown swap — ignore. Server may add new event types in future.
        break;
    }
  }

  // SSE message router. Previously this was wired with an inline
  // `[hx-on:: sse-message]` attribute on <main> in layout.js, but HTMX 1.9.x
  // compiles inline `[hx-on:: ...]` handlers via `new Function(...)`, which
  // CSP `script-src 'self'` (no `'unsafe-eval'`) blocks. The router is now
  // attached via this delegated listener instead. HTMX's SSE extension
  // dispatches `htmx:sseMessage` on the SSE source element, which bubbles
  // up to <body>.
  window.tsHandleSseMessage = function (event) {
    try {
      var data = event && event.detail && event.detail.data;
      if (typeof data !== 'string') return;
      var payload = JSON.parse(data);
      // Connection bookkeeping — connected / heartbeat events keep the dot green.
      var type = event.detail && event.detail.type;
      if (type === 'connected' || type === 'heartbeat') {
        setConn('connected', type === 'heartbeat' ? 'live (heartbeat)' : 'connected');
        // FR-6 dual-path: server emits 'connected' on reconnect even when
        // htmx:sseOpen is suppressed by a version delta (R-2). Stamping here
        // ensures the indicator returns to a fresh "방금" rather than a stale
        // pre-disconnect time.
        updateLastUpdateIndicator(new Date());
        return;
      }
      if (type === 'workflow_update' || type === 'workflow_added' ||
          type === 'workflow_removed' || type === 'tracker_event') {
        setConn('connected', 'live');
        updateLastUpdateIndicator(new Date());
      }
      // Only events that explicitly carry a swap directive mutate DOM.
      if (payload && payload.swap) handleSwap(payload);
    } catch (err) {
      // Surface in DevTools but never blow up the page.
      if (window.console && console.warn) console.warn('[ts-dashboard] sse parse error', err);
    }
  };

  // Delegated SSE message dispatcher. Replaces the removed inline
  // `[hx-on:: sse-message]` attribute on <main id="ts-main"> (CSP
  // `script-src 'self'` blocks the eval-based compilation HTMX uses for
  // inline `[hx-on:: ...]` attributes). The event bubbles up from the SSE
  // source element.
  document.body && document.body.addEventListener('htmx:sseMessage', function (event) {
    if (typeof window.tsHandleSseMessage === 'function') {
      window.tsHandleSseMessage(event);
    }
  });

  // (Phase 8) Note-form configRequest listener removed — the note <form> is no
  // longer rendered in the card. Agents POST to /api/workflow/:id/action
  // directly without going through the browser.

  // SSE connection-state listeners (HTMX dispatches these on the body element).
  // FR-6: htmx:sseOpen fires on both initial connect and EventSource auto-
  // reconnect — flipping the indicator back to "connected" closes the loop
  // when the browser silently reconnects. Stamping the timestamp here resets
  // the relative time so the user sees a fresh "방금" after a reconnect
  // rather than the stale pre-disconnect time.
  document.body && document.body.addEventListener('htmx:sseOpen', function () {
    setConn('connected', 'connected');
    updateLastUpdateIndicator(new Date());
  });
  document.body && document.body.addEventListener('htmx:sseError', function () { setConn('lost', 'reconnecting...'); });
  document.body && document.body.addEventListener('htmx:sseClose', function () { setConn('lost', 'disconnected'); });

  // FR-5 timer: refresh the relative-time display every 60 s even with no
  // SSE traffic. Without this the "N초 전" would freeze at the last event.
  // setInterval is safe — no timer leak risk on a single-page dashboard
  // session; the browser GCs it on unload.
  setInterval(function () { updateLastUpdateIndicator(); }, 60_000);

  // P4 / HR-1 / R-5 — clear any pending flash timer on the outgoing element
  // before each swap so the new content inherits a clean slate. Uses
  // addEventListener (not hx-on:*) to honor CSP `script-src 'self'`.
  document.body && document.body.addEventListener('htmx:beforeSwap', function (event) {
    var target = event && event.target;
    if (!target) return;
    clearJustUpdated(target);
    if (typeof target.closest === 'function') {
      var card = target.closest('[data-ts-card]');
      if (card && card !== target) clearJustUpdated(card);
    }
  });

  // P4 — flash card-level htmx:afterSwap targets. Skip the doc-panel +
  // iframe (chrome paint, not a "data updated" cue). The SSE handleSwap
  // path already flashes via markJustUpdated() for SSE-driven swaps.
  document.body && document.body.addEventListener('htmx:afterSwap', function (event) {
    var target = event && event.target;
    if (!target || !target.hasAttribute) return;
    if (target.id === 'ts-doc-panel' || target.tagName === 'IFRAME') return;
    if (typeof target.closest === 'function' && target.closest('#ts-doc-panel')) return;
    var flashEl = flashTargetFor(target);
    if (flashEl && flashEl.hasAttribute && flashEl.hasAttribute('data-ts-card')) {
      markJustUpdated(flashEl);
    }
  });

  // P6.4 — card selection state. Click on any [data-ts-card] (or one of its
  // descendants) marks that card with data-ts-card-selected="true" and clears
  // the flag on every other card. The CSS in style.css picks the flag up to
  // render the accent left-bar + brighter glass so the user always knows
  // which workflow is loaded into the doc panel. Closing the panel via the ×
  // button hits /partial/doc-empty which swaps the doc panel back to its
  // empty state — we listen for that target and clear the flag everywhere.
  document.body && document.body.addEventListener('click', function (event) {
    var t = event && event.target;
    if (!t || typeof t.closest !== 'function') return;
    var card = t.closest('[data-ts-card]');
    if (!card) return;
    var prev = document.querySelectorAll('[data-ts-card][data-ts-card-selected="true"]');
    for (var i = 0; i < prev.length; i++) prev[i].removeAttribute('data-ts-card-selected');
    card.setAttribute('data-ts-card-selected', 'true');
  });
  // Clear the selected flag whenever the doc panel resets to the empty state.
  document.body && document.body.addEventListener('htmx:afterSwap', function (event) {
    var t = event && event.target;
    if (!t || t.id !== 'ts-doc-panel') return;
    if (!t.querySelector || !t.querySelector('[data-ts-doc-empty]')) return;
    var prev = document.querySelectorAll('[data-ts-card][data-ts-card-selected="true"]');
    for (var i = 0; i < prev.length; i++) prev[i].removeAttribute('data-ts-card-selected');
  });

  // P5-D / FR-1.7 (Q3 default: htmx:swapError immediate) — flip the doc-panel
  // empty state into its error variant when an htmx swap targeting the panel
  // fails. CSS in style.css picks up data-ts-doc-empty="error" and paints the
  // warning icon + tinted title. addEventListener honors CSP `script-src 'self'`.
  document.body && document.body.addEventListener('htmx:swapError', function (event) {
    var target = event && event.target;
    var panel = target && target.id === 'ts-doc-panel' ? target
              : (target && typeof target.closest === 'function' ? target.closest('#ts-doc-panel') : null);
    if (!panel) return;
    panel.innerHTML = '<div class="ts-doc-empty" data-ts-doc-empty="error">'
      + '<p class="ts-doc-empty-title">불러오기 실패</p>'
      + '<p class="ts-doc-empty-hint">문서를 불러오지 못했습니다. 카드를 다시 클릭해 재시도하세요.</p></div>';
  });

  // First-paint default — assume connecting; flip when first frame arrives.
  if (document.readyState !== 'loading') setConn('connecting', 'connecting...');
  else document.addEventListener('DOMContentLoaded', function () { setConn('connecting', 'connecting...'); });

  // (Phase 8) Pointer-tracked glass highlight removed — the design moved to a
  // calm Linear/Raycast-style surface that does not use --mx/--my. Keeping the
  // module CSP-safe and free of unused listeners.
})();
