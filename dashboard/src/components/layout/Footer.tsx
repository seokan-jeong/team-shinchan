/**
 * Footer.tsx
 *
 * Status bar at the bottom of the dashboard.
 * Mirrors app.js startClock() (lines 119-128) and updateFooterEndpoint()
 * (lines 131-134) and index.html <footer> (lines 183-207).
 * CSS: styles.css .footer (lines 918-941).
 */
import { useEffect, useState } from 'react'

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

// ── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  const time = useClock()

  return (
    <footer className="footer">
      <div className="footer-left">
        <div className="footer-item">
          <span>Endpoint</span>
          <span>/api/events/stream</span>
        </div>
        <div className="footer-item">
          <span>Stream</span>
          <span>SSE</span>
        </div>
      </div>
      <div className="footer-right">
        <div className="footer-item">
          <span>Agents</span>
          <span>15</span>
        </div>
        <div className="footer-item">
          <span>v1.0.0</span>
        </div>
        <div className="footer-item">
          <span>{time}</span>
        </div>
      </div>
    </footer>
  )
}
