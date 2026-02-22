/**
 * PhaseProgress.tsx
 *
 * Phase progress section rendered below WorkflowBar.
 * Shows phase counter, phase title, phase dots, overall progress bar,
 * and per-phase mini bars.
 *
 * Mirrors app.js renderPhaseProgress() (lines 311-422).
 * Styles from styles.css .phase-progress-* (lines 398-554).
 *
 * Hidden when no phase information is available.
 * Subscribes to: currentPhase, currentPhaseTitle, progressData from Zustand store.
 */
import { useDashboardStore } from '../../stores/dashboard-store'
import { PhaseMiniBars } from './PhaseMiniBars'

export function PhaseProgress() {
  const currentPhase = useDashboardStore((s) => s.currentPhase)
  const currentPhaseTitle = useDashboardStore((s) => s.currentPhaseTitle)
  const progressData = useDashboardStore((s) => s.progressData)

  if (!currentPhase) {
    return null
  }

  // Parse "2/4" form
  const parts = String(currentPhase).split('/')
  const current = parseInt(parts[0], 10) || 1
  const total = parseInt(parts[1], 10) || 4

  const hasOverallProgress =
    progressData != null && typeof progressData.percentage === 'number'
  const pct = hasOverallProgress ? progressData!.percentage : 0

  // Determine current phase index (0-based) for PhaseMiniBars highlight
  const currentPhaseIdx = current - 1

  return (
    <div className="phase-progress-bar visible" id="phase-progress-bar">
      {/* Header: label + counter */}
      <div className="phase-progress-header">
        <div className="phase-progress-label">Phase Progress</div>
        <div className="phase-progress-counter" id="phase-counter">
          Phase {current} / {total}
        </div>
      </div>

      {/* Phase title */}
      {currentPhaseTitle && (
        <div className="phase-progress-title" id="phase-title">
          {currentPhaseTitle}
        </div>
      )}

      {/* Phase dots */}
      <div
        className="phase-dots"
        id="phase-dots"
        role="list"
        aria-label="Phase progress"
      >
        {Array.from({ length: total }, (_, i) => {
          const phaseNum = i + 1
          let dotClass = 'phase-dot'
          let title: string
          let ariaLabel: string

          if (phaseNum < current) {
            dotClass += ' done'
            title = `Phase ${phaseNum} - 완료`
            ariaLabel = `Phase ${phaseNum} 완료`
          } else if (phaseNum === current) {
            dotClass += ' current'
            title = `Phase ${phaseNum} - 진행 중${currentPhaseTitle ? ': ' + currentPhaseTitle : ''}`
            ariaLabel = `Phase ${phaseNum} 진행 중`
          } else {
            dotClass += ' future'
            title = `Phase ${phaseNum} - 대기`
            ariaLabel = `Phase ${phaseNum} 대기`
          }

          return (
            <div
              key={phaseNum}
              className={dotClass}
              title={title}
              role="listitem"
              aria-label={ariaLabel}
            />
          )
        })}
      </div>

      {/* Overall progress bar */}
      {hasOverallProgress && (
        <div
          className="progress-bar"
          id="overall-progress-bar"
          style={{ display: '' }}
        >
          <div
            className="progress-fill"
            id="overall-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {hasOverallProgress && (
        <span
          className="progress-percentage"
          id="progress-pct"
          style={{ display: '' }}
        >
          {pct}%
        </span>
      )}

      {/* Per-phase mini bars */}
      {progressData?.phases && progressData.phases.length > 0 && (
        <PhaseMiniBars
          phases={progressData.phases}
          currentPhaseIdx={currentPhaseIdx}
        />
      )}
    </div>
  )
}
