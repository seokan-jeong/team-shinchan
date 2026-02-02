/**
 * Memory Injector Hook
 * 에이전트 실행 전 관련 메모리 주입
 */

import type { HookConfig, PluginContext, HookResult } from '../types';
import { getCachedAgentContext, contextCache } from '../features/context';
import type { MemoryOwner } from '../features/memory/types';

/**
 * 에이전트 이름 추출
 */
function extractAgentName(subagentType: string): MemoryOwner | null {
  // team-seokan:maenggu -> maenggu
  if (subagentType.startsWith('team-seokan:')) {
    return subagentType.replace('team-seokan:', '') as MemoryOwner;
  }

  // 직접 에이전트 이름
  const validAgents: MemoryOwner[] = [
    'jjangu', 'jjanga', 'maenggu', 'cheolsu', 'suji', 'heukgom',
    'hooni', 'shinhyungman', 'yuri', 'bongmisun', 'actiongamen',
    'heendungi', 'chaesunga', 'namiri',
  ];

  if (validAgents.includes(subagentType as MemoryOwner)) {
    return subagentType as MemoryOwner;
  }

  return null;
}

export function createMemoryInjectorHook(context: PluginContext): HookConfig {
  return {
    name: 'memory-injector',
    event: 'PreToolUse',
    description: '에이전트 실행 전 학습된 메모리를 주입합니다.',
    enabled: true,

    handler: async ({
      toolName,
      toolInput,
      sessionState,
    }): Promise<HookResult> => {
      // Task 도구만 처리
      if (toolName !== 'Task') {
        return { shouldContinue: true };
      }

      const input = toolInput as Record<string, unknown>;
      const subagentType = input.subagent_type as string;
      const prompt = input.prompt as string;

      if (!subagentType || !prompt) {
        return { shouldContinue: true };
      }

      // 에이전트 이름 추출
      const agentName = extractAgentName(subagentType);

      if (!agentName) {
        return { shouldContinue: true };
      }

      try {
        // 캐시된 컨텍스트 가져오기
        const context = await getCachedAgentContext(agentName, prompt);

        if (!context || context.trim() === '') {
          return { shouldContinue: true };
        }

        // 프롬프트에 컨텍스트 주입
        const enhancedPrompt = prompt + '\n\n' + context;

        // 세션 상태에 마지막 에이전트 기록
        sessionState.lastAgent = agentName;
        sessionState.taskStartTime = Date.now();

        return {
          shouldContinue: true,
          modifiedInput: {
            ...input,
            prompt: enhancedPrompt,
          },
        };
      } catch (error) {
        console.error('Memory injection error:', error);
        return { shouldContinue: true };
      }
    },
  };
}

/**
 * 세션 시작 시 메모리 초기화 훅
 */
export function createMemoryInitHook(pluginContext: PluginContext): HookConfig {
  return {
    name: 'memory-init',
    event: 'SessionStart',
    description: '세션 시작 시 메모리 시스템을 초기화합니다.',
    enabled: true,

    handler: async ({ sessionState }): Promise<HookResult> => {
      try {
        // 캐시 초기화
        contextCache.invalidate();

        // 부트스트랩 체크 (첫 실행 시)
        const isFirstRun = !sessionState.memoryInitialized;

        if (isFirstRun) {
          sessionState.memoryInitialized = true;

          // 프로젝트 분석 플래그 설정
          sessionState.shouldRunBootstrap = true;
        }

        return {
          shouldContinue: true,
          message: isFirstRun
            ? '🧠 메모리 시스템 초기화됨'
            : undefined,
        };
      } catch (error) {
        console.error('Memory init error:', error);
        return { shouldContinue: true };
      }
    },
  };
}
