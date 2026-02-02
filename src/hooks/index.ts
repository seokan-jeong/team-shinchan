/**
 * Team-Seokan 훅 시스템
 */

import type { HookConfig, PluginSettings, PluginContext } from '../types';

// 훅 생성 함수들
import { createTodoContinuationEnforcerHook } from './todo-continuation-enforcer';
import { createContextWindowMonitorHook } from './context-window-monitor';
import { createPreemptiveCompactionHook } from './preemptive-compaction';
import { createToolOutputTruncatorHook } from './tool-output-truncator';
import { createEmptyTaskResponseDetectorHook } from './empty-task-response-detector';
import { createCommentCheckerHook } from './comment-checker';
import { createEditErrorRecoveryHook } from './edit-error-recovery';
import { createKeywordDetectorHook } from './keyword-detector';
import { createRulesInjectorHook } from './rules-injector';
import { createDirectoryAgentsInjectorHook } from './directory-agents-injector';
import { createStopContinuationGuardHook } from './stop-continuation-guard';
import { createReviewerCheckHook } from './reviewer-check';
import { createRalphLoopHook } from './ralph-loop';

// v2.0 메모리 관련 훅
import { createPostTaskReflectionHook } from './post-task-reflection';
import { createImplicitFeedbackHook } from './implicit-feedback';
import { createMemoryInjectorHook, createMemoryInitHook } from './memory-injector';

// ============================================================
// 모든 내장 훅 생성
// ============================================================

export function createBuiltinHooks(
  settings: PluginSettings,
  context: PluginContext
): HookConfig[] {
  const hooks: HookConfig[] = [];

  // 핵심 훅들
  if (settings.enableTodoEnforcer) {
    hooks.push(createTodoContinuationEnforcerHook(context));
  }

  if (settings.enableRalphLoop) {
    hooks.push(createRalphLoopHook(context));
  }

  if (settings.enableIntentGate) {
    hooks.push(createKeywordDetectorHook(context));
  }

  if (settings.enableReviewerCheck) {
    hooks.push(createReviewerCheckHook(context));
  }

  // 모니터링 훅들
  hooks.push(createContextWindowMonitorHook(context));
  hooks.push(createPreemptiveCompactionHook(context));

  // 도구 관련 훅들
  hooks.push(createToolOutputTruncatorHook(context));
  hooks.push(createEmptyTaskResponseDetectorHook(context));
  hooks.push(createCommentCheckerHook(context));
  hooks.push(createEditErrorRecoveryHook(context));

  // 주입 훅들
  hooks.push(createRulesInjectorHook(context));
  hooks.push(createDirectoryAgentsInjectorHook(context));

  // 보호 훅들
  hooks.push(createStopContinuationGuardHook(context));

  // v2.0 메모리 훅들
  hooks.push(createMemoryInitHook(context));
  hooks.push(createMemoryInjectorHook(context));
  hooks.push(createPostTaskReflectionHook(context));
  hooks.push(createImplicitFeedbackHook(context));

  // 우선순위로 정렬
  hooks.sort((a, b) => b.priority - a.priority);

  return hooks;
}

// ============================================================
// 내보내기
// ============================================================

export {
  createTodoContinuationEnforcerHook,
  createContextWindowMonitorHook,
  createPreemptiveCompactionHook,
  createToolOutputTruncatorHook,
  createEmptyTaskResponseDetectorHook,
  createCommentCheckerHook,
  createEditErrorRecoveryHook,
  createKeywordDetectorHook,
  createRulesInjectorHook,
  createDirectoryAgentsInjectorHook,
  createStopContinuationGuardHook,
  createReviewerCheckHook,
  createRalphLoopHook,
  // v2.0 메모리 훅
  createPostTaskReflectionHook,
  createImplicitFeedbackHook,
  createMemoryInjectorHook,
  createMemoryInitHook,
};
