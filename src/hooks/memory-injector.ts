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
    priority: 80,

    handler: async ({
      toolName,
      toolInput,
      sessionState,
    }): Promise<HookResult> => {
      // Task 도구만 처리
      if (toolName !== 'Task') {
        return { continue: true };
      }

      const input = toolInput as Record<string, unknown>;
      const subagentType = input.subagent_type as string;
      const prompt = input.prompt as string;

      if (!subagentType || !prompt) {
        return { continue: true };
      }

      // 에이전트 이름 추출
      const agentName = extractAgentName(subagentType);

      if (!agentName) {
        return { continue: true };
      }

      try {
        // 캐시된 컨텍스트 가져오기
        const memoryContext = await getCachedAgentContext(agentName, prompt);

        if (!memoryContext || memoryContext.trim() === '') {
          return { continue: true };
        }

        // 세션 상태에 마지막 에이전트 기록
        if (sessionState) {
          (sessionState as any).lastAgent = agentName;
          (sessionState as any).taskStartTime = Date.now();
        }

        // 메모리 컨텍스트를 inject로 주입
        return {
          continue: true,
          inject: memoryContext,
        };
      } catch (error) {
        console.error('Memory injection error:', error);
        return { continue: true };
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
    priority: 100,

    handler: async ({ sessionState }): Promise<HookResult> => {
      try {
        // 캐시 초기화
        contextCache.invalidate();

        // 부트스트랩 체크 (첫 실행 시)
        const state = sessionState as any;
        const isFirstRun = !state?.memoryInitialized;

        if (isFirstRun && state) {
          state.memoryInitialized = true;

          // 프로젝트 분석 플래그 설정
          state.shouldRunBootstrap = true;
        }

        return {
          continue: true,
          message: isFirstRun
            ? '🧠 메모리 시스템 초기화됨'
            : undefined,
        };
      } catch (error) {
        console.error('Memory init error:', error);
        return { continue: true };
      }
    },
  };
}
