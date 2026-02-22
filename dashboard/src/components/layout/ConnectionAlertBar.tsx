/**
 * ConnectionAlertBar.tsx
 *
 * Fixed top alert bar that slides down when connection is lost.
 * Mirrors app.js setConnected() (lines 1348-1383) and
 * index.html conn-alert-bar (lines 12-15).
 * CSS: styles.css / index.css .conn-alert-bar (with .reconnecting-bar modifier).
 *
 * Tri-state handling:
 *   true         -> hidden (no bar)
 *   false        -> red bar (disconnected)
 *   'reconnecting' -> yellow bar (reconnecting)
 */
import { useDashboardStore } from '../../stores/dashboard-store'

export function ConnectionAlertBar() {
  const connected = useDashboardStore((s) => s.connected)

  const visible = connected !== true
  const isReconnecting = connected === 'reconnecting'

  let barClass = 'conn-alert-bar'
  if (visible) barClass += ' visible'
  if (isReconnecting) barClass += ' reconnecting-bar'

  const message = isReconnecting
    ? '재연결 시도 중...'
    : '연결이 끊어졌습니다. 재연결 시도 중...'

  return (
    <div
      className={barClass}
      role="alert"
      aria-live="assertive"
      aria-hidden={!visible}
    >
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  )
}
