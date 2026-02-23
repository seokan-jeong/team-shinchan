/**
 * Footer.tsx
 *
 * Status bar at the bottom of the dashboard.
 * Left: docId badge + Stage indicator + SSE micro-dot
 * Right: version (fetched from server) + clock
 */
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { STAGES } from '../../lib/constants'

// ── Clock ────────────────────────────────────────────────────────────────────

function useClock(): string {
  const [time, setTime] = useState<string>(() =>
    new Date().toLocaleTimeString('ko-KR', { hour12: false }),
  )

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('ko-KR', { hour12: false }))
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

// ── Server version (fetch once from /api/health) ─────────────────────────────

function useServerVersion(): string {
  const [version, setVersion] = useState('v?.?.?')

  useEffect(() => {
    let cancelled = false
    async function fetchVersion() {
      try {
        const res = await fetch('/api/health')
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { version?: string }
          if (data.version) setVersion(`v${data.version}`)
        }
      } catch {
        // server not available — keep fallback
      }
    }
    fetchVersion()
    return () => { cancelled = true }
  }, [])

  return version
}

// ── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  const time = useClock()
  const version = useServerVersion()
  const connected = useDashboardStore((s) => s.connected)
  const workflowDocId = useDashboardStore((s) => s.workflowDocId)
  const currentStage = useDashboardStore((s) => s.currentStage)

  // Find current stage index for "S2/4" display
  const stageIdx = currentStage
    ? STAGES.findIndex((s) => s.id === currentStage)
    : -1
  const stageText = stageIdx >= 0
    ? `S${stageIdx + 1}/${STAGES.length}`
    : null

  // SSE connection dot color
  const sseDotClass = connected === true
    ? 'footer-sse-dot connected'
    : connected === 'reconnecting'
      ? 'footer-sse-dot reconnecting'
      : 'footer-sse-dot disconnected'

  return (
    <footer className="footer">
      <div className="footer-left">
        {workflowDocId && (
          <div className="footer-item">
            <span className="footer-docid" title={workflowDocId}>
              {workflowDocId.length > 16 ? workflowDocId.slice(0, 16) + '...' : workflowDocId}
            </span>
          </div>
        )}
        {stageText && (
          <div className="footer-item">
            <span className="footer-stage">{stageText}</span>
          </div>
        )}
        <div className="footer-item">
          <span className={sseDotClass} />
          <span>SSE</span>
        </div>
      </div>
      <div className="footer-right">
        <div className="footer-item">
          <span>{version}</span>
        </div>
        <div className="footer-item">
          <span>{time}</span>
        </div>
      </div>
    </footer>
  )
}
