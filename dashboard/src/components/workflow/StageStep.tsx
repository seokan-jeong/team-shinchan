/**
 * StageStep.tsx
 *
 * Single stage step in the workflow progress bar.
 * Mirrors the per-stage DOM construction in app.js renderStages() (lines 264-281)
 * and styles from styles.css .stage-* (lines 339-396).
 *
 * States:
 *   pending - grey, low opacity
 *   active  - blue highlight with background glow
 *   done    - green with checkmark
 */
import { memo } from 'react'
import type { StageId } from '../../lib/constants'

export type StageState = 'pending' | 'active' | 'done'

interface StageStepProps {
  num: number
  label: string
  id: StageId
  state: StageState
  showConnector: boolean
  connectorDone: boolean
}

export const StageStep = memo(function StageStep({ num, label, state, showConnector, connectorDone }: StageStepProps) {
  return (
    <>
      {showConnector && (
        <div
          className={`stage-connector${connectorDone ? ' done' : ''}`}
        />
      )}

      <div className={`stage ${state}`}>
        <div className="stage-inner">
          <div className="stage-icon">
            {state === 'done' ? '✓' : num}
          </div>
          <div className="stage-text">
            <div className="stage-num">Stage {num}</div>
            <div className="stage-name">{label}</div>
          </div>
        </div>
      </div>
    </>
  )
})
