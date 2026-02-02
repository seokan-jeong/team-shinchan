/**
 * Team-Seokan Plugin
 * 짱구 캐릭터 기반 멀티 에이전트 오케스트레이션 시스템
 */

import type {
  PluginContext,
  PluginSettings,
  SessionState,
  AgentConfig,
  HookConfig,
  ToolConfig,
  SkillConfig,
  BuiltinAgentName,
} from './types';

import { loadPluginConfig, createDefaultSettings } from './config';
import { createBuiltinAgents } from './agents';
import { createBuiltinHooks } from './hooks';
import { createBuiltinTools } from './tools';
import { createBuiltinSkills } from './features/builtin-skills';
import { createSessionState } from './features/session-state';

// ============================================================
// 플러그인 메인 엔트리포인트
// ============================================================

export async function TeamSeokanPlugin(ctx: unknown): Promise<PluginInstance> {
  // 설정 로드
  const settings = await loadPluginConfig();

  // 세션 상태 초기화
  const sessionState = createSessionState();

  // 플러그인 컨텍스트 생성
  const pluginContext: PluginContext = {
    settings,
    sessionState,
    agents: new Map(),
    hooks: new Map(),
    tools: new Map(),
    skills: new Map(),
  };

  // 에이전트 생성 및 등록
  const agents = await createBuiltinAgents(settings);
  for (const agent of agents) {
    pluginContext.agents.set(agent.name, agent);
  }

  // 훅 생성 및 등록
  const hooks = createBuiltinHooks(settings, pluginContext);
  for (const hook of hooks) {
    if (!settings.disabledHooks?.includes(hook.name)) {
      pluginContext.hooks.set(hook.name, hook);
    }
  }

  // 도구 생성 및 등록
  const tools = createBuiltinTools(pluginContext);
  for (const tool of tools) {
    pluginContext.tools.set(tool.name, tool);
  }

  // 스킬 생성 및 등록
  const skills = createBuiltinSkills(pluginContext);
  for (const skill of skills) {
    if (!settings.disabledSkills?.includes(skill.name)) {
      pluginContext.skills.set(skill.name, skill);
    }
  }

  console.log(`[Team-Seokan] 플러그인 초기화 완료`);
  console.log(`[Team-Seokan] 에이전트: ${pluginContext.agents.size}개`);
  console.log(`[Team-Seokan] 훅: ${pluginContext.hooks.size}개`);
  console.log(`[Team-Seokan] 도구: ${pluginContext.tools.size}개`);
  console.log(`[Team-Seokan] 스킬: ${pluginContext.skills.size}개`);

  // 플러그인 인스턴스 반환
  return {
    name: 'team-seokan',
    version: '0.1.0',
    context: pluginContext,

    // 에이전트 목록
    agents: Array.from(pluginContext.agents.values()),

    // 훅 목록
    hooks: Array.from(pluginContext.hooks.values()),

    // 도구 목록
    tools: Array.from(pluginContext.tools.values()),

    // 스킬 목록
    skills: Array.from(pluginContext.skills.values()),

    // 이벤트 핸들러
    handlers: {
      // 세션 시작
      'session.created': async (event) => {
        pluginContext.sessionState = createSessionState();
        console.log('[Team-Seokan] 새 세션 시작');
      },

      // 세션 종료
      'session.deleted': async (event) => {
        console.log('[Team-Seokan] 세션 종료');
      },

      // 메시지 처리
      'chat.message': async (message) => {
        pluginContext.sessionState.messageCount++;

        // 컨텍스트 사용량 체크
        if (pluginContext.sessionState.messageCount >= settings.contextWarningThreshold) {
          console.log('[Team-Seokan] ⚠️ 컨텍스트 사용량 경고');
        }
      },

      // 도구 실행 전
      'tool.execute.before': async (toolName, input) => {
        // 훅 실행
        for (const hook of pluginContext.hooks.values()) {
          if (hook.event === 'tool.execute.before') {
            if (!hook.matchTools || hook.matchTools.includes(toolName)) {
              await hook.handler({
                event: 'tool.execute.before',
                toolName,
                toolInput: input,
                sessionState: pluginContext.sessionState,
              });
            }
          }
        }
      },

      // 도구 실행 후
      'tool.execute.after': async (toolName, input, output) => {
        // 훅 실행
        for (const hook of pluginContext.hooks.values()) {
          if (hook.event === 'tool.execute.after') {
            if (!hook.matchTools || hook.matchTools.includes(toolName)) {
              await hook.handler({
                event: 'tool.execute.after',
                toolName,
                toolInput: input,
                toolOutput: output,
                sessionState: pluginContext.sessionState,
              });
            }
          }
        }
      },

      // 에러 처리
      'error': async (error) => {
        console.error('[Team-Seokan] 에러:', error);
      },
    },

    // 설정 핸들러
    config: {
      get: () => settings,
      update: async (newSettings: Partial<PluginSettings>) => {
        Object.assign(settings, newSettings);
      },
    },
  };
}

// ============================================================
// 타입 정의
// ============================================================

export interface PluginInstance {
  name: string;
  version: string;
  context: PluginContext;
  agents: AgentConfig[];
  hooks: HookConfig[];
  tools: ToolConfig[];
  skills: SkillConfig[];
  handlers: Record<string, (...args: unknown[]) => Promise<void>>;
  config: {
    get: () => PluginSettings;
    update: (settings: Partial<PluginSettings>) => Promise<void>;
  };
}

// 기본 내보내기
export default TeamSeokanPlugin;

// 타입 재내보내기
export * from './types';
