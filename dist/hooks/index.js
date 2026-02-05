/**
 * Team-Shinchan Hook System
 */
// Hook creation functions
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
// v2.0 Memory-related hooks
import { createPostTaskReflectionHook } from './post-task-reflection';
import { createImplicitFeedbackHook } from './implicit-feedback';
import { createMemoryInjectorHook, createMemoryInitHook } from './memory-injector';
// ============================================================
// Create all built-in hooks
// ============================================================
export function createBuiltinHooks(settings, context) {
    const hooks = [];
    // Core hooks
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
    // Monitoring hooks
    hooks.push(createContextWindowMonitorHook(context));
    hooks.push(createPreemptiveCompactionHook(context));
    // Tool-related hooks
    hooks.push(createToolOutputTruncatorHook(context));
    hooks.push(createEmptyTaskResponseDetectorHook(context));
    hooks.push(createCommentCheckerHook(context));
    hooks.push(createEditErrorRecoveryHook(context));
    // Injection hooks
    hooks.push(createRulesInjectorHook(context));
    hooks.push(createDirectoryAgentsInjectorHook(context));
    // Protection hooks
    hooks.push(createStopContinuationGuardHook(context));
    // v2.0 Memory hooks
    hooks.push(createMemoryInitHook(context));
    hooks.push(createMemoryInjectorHook(context));
    hooks.push(createPostTaskReflectionHook(context));
    hooks.push(createImplicitFeedbackHook(context));
    // Sort by priority
    hooks.sort((a, b) => b.priority - a.priority);
    return hooks;
}
// ============================================================
// Exports
// ============================================================
export { createTodoContinuationEnforcerHook, createContextWindowMonitorHook, createPreemptiveCompactionHook, createToolOutputTruncatorHook, createEmptyTaskResponseDetectorHook, createCommentCheckerHook, createEditErrorRecoveryHook, createKeywordDetectorHook, createRulesInjectorHook, createDirectoryAgentsInjectorHook, createStopContinuationGuardHook, createReviewerCheckHook, createRalphLoopHook, 
// v2.0 Memory hooks
createPostTaskReflectionHook, createImplicitFeedbackHook, createMemoryInjectorHook, createMemoryInitHook, };
