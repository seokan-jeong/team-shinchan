/**
 * Team-Seokan 도구 시스템
 */

import type { ToolConfig, PluginContext } from '../types';

// 도구 생성 함수들
import { createDelegateTaskTool } from './delegate-task';
import { createCallTeamAgentTool } from './call-team-agent';
import { createBackgroundTaskTool } from './background-task';
import { createLookAtTool } from './look-at';
import { createSkillTool } from './skill';
import { createSlashcommandTool } from './slashcommand';
import { createInteractiveBashTool } from './interactive-bash';
import { createAstGrepTool } from './ast-grep';
import { createLspDiagnosticsTool, createLspRenameTool, createLspReferencesTool } from './lsp';
import { createSessionManagerTool } from './session-manager';

// ============================================================
// 모든 내장 도구 생성
// ============================================================

export function createBuiltinTools(context: PluginContext): ToolConfig[] {
  return [
    // 에이전트 관련
    createDelegateTaskTool(context),
    createCallTeamAgentTool(context),
    createBackgroundTaskTool(context),

    // 파일/조회
    createLookAtTool(context),

    // 스킬/명령
    createSkillTool(context),
    createSlashcommandTool(context),

    // 셸
    createInteractiveBashTool(context),

    // 코드 분석
    createAstGrepTool(context),

    // LSP
    createLspDiagnosticsTool(context),
    createLspRenameTool(context),
    createLspReferencesTool(context),

    // 세션
    createSessionManagerTool(context),
  ];
}

// ============================================================
// 내보내기
// ============================================================

export {
  createDelegateTaskTool,
  createCallTeamAgentTool,
  createBackgroundTaskTool,
  createLookAtTool,
  createSkillTool,
  createSlashcommandTool,
  createInteractiveBashTool,
  createAstGrepTool,
  createLspDiagnosticsTool,
  createLspRenameTool,
  createLspReferencesTool,
  createSessionManagerTool,
};
