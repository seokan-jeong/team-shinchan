/**
 * PanelistCard.tsx
 *
 * Individual panelist card inside a debate round.
 * Mirrors app.js renderDebate() panelist section (lines 948-960).
 * Shows agent emoji + name + opinion text with fadeIn animation.
 */
import { memo } from 'react'
import { Card, CardContent } from '../ui/card'
import { AGENTS } from '../../lib/constants'

interface PanelistCardProps {
  agentId: string
  opinion: string
}

export const PanelistCard = memo(function PanelistCard({ agentId, opinion }: PanelistCardProps) {
  const agentData = AGENTS[agentId as keyof typeof AGENTS] ?? {
    emoji: '🤖',
    name: agentId || '?',
  }

  return (
    <Card
      style={{
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <CardContent style={{ padding: '12px 14px' }}>
        {/* Panelist header: emoji + name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>{agentData.emoji}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--foreground)',
            }}
          >
            {agentData.name}
          </span>
        </div>

        {/* Opinion text */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted-foreground)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {opinion}
        </div>
      </CardContent>
    </Card>
  )
})
