/**
 * Team-Seokan Hook System
 */
import type { HookConfig, PluginSettings, PluginContext } from '../types';
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
import { createPostTaskReflectionHook } from './post-task-reflection';
import { createImplicitFeedbackHook } from './implicit-feedback';
import { createMemoryInjectorHook, createMemoryInitHook } from './memory-injector';
export declare function createBuiltinHooks(settings: PluginSettings, context: PluginContext): HookConfig[];
export { createTodoContinuationEnforcerHook, createContextWindowMonitorHook, createPreemptiveCompactionHook, createToolOutputTruncatorHook, createEmptyTaskResponseDetectorHook, createCommentCheckerHook, createEditErrorRecoveryHook, createKeywordDetectorHook, createRulesInjectorHook, createDirectoryAgentsInjectorHook, createStopContinuationGuardHook, createReviewerCheckHook, createRalphLoopHook, createPostTaskReflectionHook, createImplicitFeedbackHook, createMemoryInjectorHook, createMemoryInitHook, };
//# sourceMappingURL=index.d.ts.map