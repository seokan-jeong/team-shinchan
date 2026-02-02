/**
 * Team-Seokan 내장 스킬 시스템
 */

import type { SkillConfig, PluginContext } from '../../types';

// 스킬 생성 함수들
import { createUltraworkSkill } from './ultrawork';
import { createRalphSkill } from './ralph';
import { createAutopilotSkill } from './autopilot';
import { createPlanSkill } from './plan';
import { createAnalyzeSkill } from './analyze';
import { createDeepsearchSkill } from './deepsearch';
import { createGitMasterSkill } from './git-master';
import { createFrontendUiUxSkill } from './frontend-ui-ux';
import { createHelpSkill } from './help';
import { createCancelSkill } from './cancel';

// ============================================================
// 모든 내장 스킬 생성
// ============================================================

export function createBuiltinSkills(context: PluginContext): SkillConfig[] {
  return [
    createUltraworkSkill(context),
    createRalphSkill(context),
    createAutopilotSkill(context),
    createPlanSkill(context),
    createAnalyzeSkill(context),
    createDeepsearchSkill(context),
    createGitMasterSkill(context),
    createFrontendUiUxSkill(context),
    createHelpSkill(context),
    createCancelSkill(context),
  ];
}

// ============================================================
// 내보내기
// ============================================================

export {
  createUltraworkSkill,
  createRalphSkill,
  createAutopilotSkill,
  createPlanSkill,
  createAnalyzeSkill,
  createDeepsearchSkill,
  createGitMasterSkill,
  createFrontendUiUxSkill,
  createHelpSkill,
  createCancelSkill,
};
