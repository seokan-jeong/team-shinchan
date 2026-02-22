/**
 * WorkflowBar.tsx
 *
 * "Workflow Stage" bar displayed at the top of the main content area.
 * Shows the 4-stage workflow as horizontal steps with connectors.
 * Mirrors app.js renderStages() (lines 239-283) and updateWorkflow() (lines 287-306).
 * Styles from styles.css .workflow-bar, .workflow-title, .phase-info, .stages (lines 303-396).
 *
 * Subscribes to: currentStage, currentPhase from Zustand store.
 */
import { useDashboardStore } from '../../stores/dashboard-store'
import { STAGES } from '../../lib/constants'
import { StageStep } from './StageStep'
import type { StageState } from './StageStep'

export function WorkflowBar() {
  const currentStage = useDashboardStore((s) => s.currentStage)
  const currentPhase = useDashboardStore((s) => s.currentPhase)

  const currentIdx = STAGES.findIndex((s) => s.id === currentStage)

  return (
    <div className="workflow-bar">
      <div className="workflow-title">
        Workflow Stage
        {currentPhase && (
          <span className="phase-info" id="phase-info">
            Phase {currentPhase}
          </span>
        )}
      </div>

      <div className="stages" id="stages">
        {STAGES.map((stage, idx) => {
          let stageState: StageState = 'pending'
          if (currentStage === null) {
            stageState = 'pending'
          } else if (idx < currentIdx) {
            stageState = 'done'
          } else if (idx === currentIdx) {
            stageState = 'active'
          }

          const showConnector = idx > 0
          const connectorDone = idx <= currentIdx && currentIdx > 0

          return (
            <StageStep
              key={stage.id}
              id={stage.id}
              num={stage.num}
              label={stage.label}
              state={stageState}
              showConnector={showConnector}
              connectorDone={connectorDone}
            />
          )
        })}
      </div>
    </div>
  )
}
