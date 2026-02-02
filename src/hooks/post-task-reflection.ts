/**
 * Post-Task Reflection Hook
 * 작업 완료 후 자동 회고 실행
 */

import type { HookConfig, PluginContext, HookResult } from '../types';
import { reflect, summarizeReflection } from '../features/reflection';
import { getMemoryManager } from '../features/memory';
import type { TaskResult, CodeChange } from '../features/learning';

/**
 * 작업 결과를 TaskResult 형식으로 변환
 */
function parseTaskResult(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput: string,
  sessionState: { currentTask?: string; taskStartTime?: number }
): TaskResult | null {
  // Task 도구 결과만 처리
  if (toolName !== 'Task') {
    return null;
  }

  const taskId = `task-${Date.now()}`;
  const description = (toolInput.prompt as string) || (toolInput.description as string) || '';
  const agent = (toolInput.subagent_type as string)?.replace('team-seokan:', '') || 'shared';

  // 성공 여부 판단
  const success =
    !toolOutput.toLowerCase().includes('error') &&
    !toolOutput.toLowerCase().includes('failed') &&
    !toolOutput.toLowerCase().includes('실패');

  // 에러 추출
  const errors: string[] = [];
  const errorMatches = toolOutput.match(/error:?\s*(.+?)(?:\n|$)/gi);
  if (errorMatches) {
    errors.push(...errorMatches.map((e) => e.trim()));
  }

  // 파일 변경 추출 (간단한 패턴)
  const filesModified: string[] = [];
  const fileMatches = toolOutput.match(/(?:created|modified|edited|wrote)\s+([^\s]+\.[a-z]+)/gi);
  if (fileMatches) {
    filesModified.push(
      ...fileMatches.map((m) => m.replace(/^(created|modified|edited|wrote)\s+/i, ''))
    );
  }

  // 코드 변경 정보 (간략화)
  const codeChanges: CodeChange[] = filesModified.map((file) => ({
    filePath: file,
    changeType: 'modify' as const,
    language: file.split('.').pop() || 'unknown',
    linesAdded: 0,
    linesRemoved: 0,
    summary: '',
  }));

  // 작업 시간 계산
  const duration = sessionState.taskStartTime
    ? Date.now() - sessionState.taskStartTime
    : 0;

  return {
    taskId,
    description,
    success,
    agent: agent as any,
    filesModified,
    codeChanges,
    duration,
    errors,
    context: {},
  };
}

export function createPostTaskReflectionHook(context: PluginContext): HookConfig {
  return {
    name: 'post-task-reflection',
    event: 'PostToolUse',
    description: '작업 완료 후 자동 회고를 실행합니다.',
    enabled: true,

    handler: async ({
      toolName,
      toolInput,
      toolOutput,
      sessionState,
    }): Promise<HookResult> => {
      // Task 도구가 아니면 스킵
      if (toolName !== 'Task') {
        return { shouldContinue: true };
      }

      try {
        const taskResult = parseTaskResult(
          toolName,
          toolInput as Record<string, unknown>,
          toolOutput as string,
          sessionState
        );

        if (!taskResult) {
          return { shouldContinue: true };
        }

        // 회고 실행
        const reflection = reflect(taskResult);

        // 학습 저장
        const manager = getMemoryManager();
        await manager.initialize();

        for (const learning of reflection.learnings) {
          await manager.create(learning);
        }

        // 간단한 회고 요약 출력
        const summary = summarizeReflection(reflection);

        return {
          shouldContinue: true,
          message: `
<reflection>
${summary}
</reflection>
`,
        };
      } catch (error) {
        console.error('Reflection error:', error);
        return { shouldContinue: true };
      }
    },
  };
}
