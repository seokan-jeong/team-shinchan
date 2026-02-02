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

// v2.0 메모리 스킬
import { createMemoriesSkill } from './memories';
import { createForgetSkill } from './forget';
import { createLearnSkill } from './learn';

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
    // v2.0 메모리 스킬
    createMemoriesSkill(context),
    createForgetSkill(context),
    createLearnSkill(context),
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
  // v2.0 메모리 스킬
  createMemoriesSkill,
  createForgetSkill,
  createLearnSkill,
};
