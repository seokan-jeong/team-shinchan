/**
 * DebateView.tsx
 *
 * Main debate tab view. Mirrors app.js renderDebate() (lines 904-979).
 *
 * - 'inactive' state: empty state UI
 * - 'active' / 'concluded' state: DebateHeader + DebateRounds + DebateConclusion
 *
 * Uses ScrollArea for overflow handling.
 */
import { useEffect, useRef } from 'react'
import { ScrollArea } from '../ui/scroll-area'
import { DebateHeader } from './DebateHeader'
import { DebateRound } from './DebateRound'
import { DebateConclusion } from './DebateConclusion'
import { useDashboardStore } from '../../stores/dashboard-store'

export function DebateView() {
  const debateState = useDashboardStore((s) => s.debateState)
  const debateRounds = useDashboardStore((s) => s.debateRounds)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new rounds/opinions arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [debateRounds, debateState])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (debateState === 'inactive') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          padding: 40,
        }}
      >
        <span style={{ fontSize: 48, opacity: 0.4 }}>🌻</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          진행 중인 토론이 없습니다
        </span>
        <span
          style={{
            fontSize: 12,
            opacity: 0.6,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          Midori가 토론을 시작하면 여기에 표시됩니다
        </span>
      </div>
    )
  }

  // ── Active / Concluded state ─────────────────────────────────────────────────
  return (
    <ScrollArea
      style={{ flex: 1 }}
    >
      <div
        ref={scrollRef}
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <DebateHeader />

        {debateRounds.map((round, idx) => (
          <DebateRound key={idx} round={round} />
        ))}

        {debateState === 'concluded' && <DebateConclusion />}
      </div>
    </ScrollArea>
  )
}
