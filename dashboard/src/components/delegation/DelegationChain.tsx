/**
 * DelegationChain.tsx
 *
 * Visualizes the current agent delegation flow as a horizontal chain of
 * emoji+name pill nodes separated by arrows.
 *
 * Mirrors app.js renderDelegationChain() (lines 800-837).
 * Styles from styles.css .delegation-* (lines 850-915).
 *
 * Hidden when the delegation chain is empty.
 * The last agent in the chain is highlighted (success background + border).
 * Chain changes trigger the chainFadeIn CSS animation automatically via
 * re-mounting the .delegation-chain element with a key.
 *
 * Subscribes to: delegationChain, activeAgentId from Zustand store.
 */
import { useMemo } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { AGENTS } from '../../lib/constants'

export function DelegationChain() {
  const delegationChain = useDashboardStore((s) => s.delegationChain)
  const activeAgentId = useDashboardStore((s) => s.activeAgentId)

  // Stable key for fade-in animation — changes when chain content changes
  const chainKey = useMemo(
    () => delegationChain.join(','),
    [delegationChain]
  )

  if (delegationChain.length === 0) {
    return null
  }

  return (
    <div className="delegation-section visible" id="delegation-section">
      <div className="delegation-section-title">현재 위임 흐름</div>

      <div
        className="delegation-chain"
        id="delegation-chain"
        key={chainKey}
      >
        {delegationChain.map((agentId, idx) => {
          const agentData = AGENTS[agentId as keyof typeof AGENTS] ?? {
            emoji: '\uD83E\uDD16',
            name: agentId,
          }

          const isActive = agentId === activeAgentId

          return (
            <span key={`${agentId}-${idx}`} style={{ display: 'contents' }}>
              {idx > 0 && (
                <span className="chain-arrow" aria-hidden="true">
                  &rarr;
                </span>
              )}
              <div
                className={`chain-node${isActive ? ' active' : ''}`}
                title={agentData.name}
                aria-label={`${agentData.name}${isActive ? ' (active)' : ''}`}
              >
                <span className="chain-emoji" aria-hidden="true">
                  {agentData.emoji}
                </span>
                <span className="chain-name">{agentData.name}</span>
              </div>
            </span>
          )
        })}
      </div>
    </div>
  )
}
