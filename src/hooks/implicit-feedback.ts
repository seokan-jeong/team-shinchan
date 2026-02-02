/**
 * Implicit Feedback Hook
 * 사용자의 암묵적 피드백 감지 및 학습
 */

import type { HookConfig, PluginContext, HookResult } from '../types';
import {
  detectImplicitFeedback,
  extractLearningFromFeedback,
  type UserAction,
} from '../features/learning';
import { getMemoryManager } from '../features/memory';

/**
 * Edit 도구 결과에서 수정 내용 추출
 */
function extractEditFeedback(
  toolInput: Record<string, unknown>,
  toolOutput: string,
  sessionState: Record<string, unknown>
): UserAction | null {
  const filePath = toolInput.file_path as string;
  const oldString = toolInput.old_string as string;
  const newString = toolInput.new_string as string;

  if (!filePath || !oldString || !newString) {
    return null;
  }

  // 이전 에이전트의 출력과 비교
  const lastAgentOutput = sessionState.lastAgentOutput as string | undefined;
  const lastAgent = sessionState.lastAgent as string | undefined;

  // 에이전트가 작성한 코드를 사용자가 수정한 경우
  if (lastAgentOutput && lastAgentOutput.includes(oldString)) {
    return {
      type: 'modify',
      timestamp: new Date(),
      context: {
        filePath,
        originalContent: oldString,
        modifiedContent: newString,
        agent: lastAgent as any,
        taskDescription: `${filePath} 수정`,
      },
    };
  }

  return null;
}

/**
 * Bash 도구에서 undo/revert 감지
 */
function detectUndoAction(
  toolInput: Record<string, unknown>,
  sessionState: Record<string, unknown>
): UserAction | null {
  const command = toolInput.command as string;

  if (!command) return null;

  // git revert, git checkout, undo 관련 명령 감지
  const undoPatterns = [
    /git\s+(revert|checkout|reset)/i,
    /rm\s+-rf?\s+.*\.(ts|js|tsx|jsx|py)/i, // 코드 파일 삭제
  ];

  for (const pattern of undoPatterns) {
    if (pattern.test(command)) {
      return {
        type: 'undo',
        timestamp: new Date(),
        context: {
          agent: sessionState.lastAgent as any,
          taskDescription: `명령 실행: ${command}`,
        },
      };
    }
  }

  return null;
}

export function createImplicitFeedbackHook(context: PluginContext): HookConfig {
  return {
    name: 'implicit-feedback',
    event: 'PostToolUse',
    description: '사용자의 수정/거부 행동에서 암묵적 피드백을 감지합니다.',
    enabled: true,

    handler: async ({
      toolName,
      toolInput,
      toolOutput,
      sessionState,
    }): Promise<HookResult> => {
      let userAction: UserAction | null = null;

      // Edit 도구 사용 시
      if (toolName === 'Edit') {
        userAction = extractEditFeedback(
          toolInput as Record<string, unknown>,
          toolOutput as string,
          sessionState
        );
      }

      // Bash 도구에서 undo 감지
      if (toolName === 'Bash') {
        userAction = detectUndoAction(toolInput as Record<string, unknown>, sessionState);
      }

      if (!userAction) {
        return { shouldContinue: true };
      }

      try {
        // 암묵적 피드백 감지
        const feedback = detectImplicitFeedback(userAction);

        if (!feedback) {
          return { shouldContinue: true };
        }

        // 학습 추출
        const extraction = extractLearningFromFeedback(feedback);

        if (extraction.learnings.length === 0) {
          return { shouldContinue: true };
        }

        // 학습 저장
        const manager = getMemoryManager();
        await manager.initialize();

        for (const learning of extraction.learnings) {
          await manager.create(learning);
        }

        // 기존 메모리 강화/반박
        for (const id of extraction.reinforceMemoryIds) {
          await manager.reinforce(id);
        }

        for (const id of extraction.contradictMemoryIds) {
          await manager.contradict(id);
        }

        return {
          shouldContinue: true,
          message: `💡 암묵적 피드백 학습됨: ${extraction.learnings[0]?.title || ''}`,
        };
      } catch (error) {
        console.error('Implicit feedback error:', error);
        return { shouldContinue: true };
      }
    },
  };
}
