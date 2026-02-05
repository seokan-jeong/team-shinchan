/**
 * Team-Shinchan Config System
 */
import type { PluginSettings, ModelTier, BuiltinAgentName } from '../types';
export declare function createDefaultSettings(): PluginSettings;
export declare function loadPluginConfig(): Promise<PluginSettings>;
export declare const AGENT_MODEL_MAP: Record<BuiltinAgentName, ModelTier>;
export declare const READ_ONLY_AGENTS: BuiltinAgentName[];
export declare const AGENT_CATEGORIES: {
    readonly orchestration: readonly ["shinnosuke", "himawari"];
    readonly execution: readonly ["bo", "kazama"];
    readonly specialist: readonly ["aichan", "bunta", "masao"];
    readonly advisor: readonly ["hiroshi", "nene", "misae", "actionkamen"];
    readonly exploration: readonly ["shiro", "masumi"];
    readonly utility: readonly ["ume"];
};
export declare const SKILL_TRIGGERS: {
    readonly ultrawork: readonly ["ulw", "ultrawork", "parallel", "fast", "parallel"];
    readonly ralph: readonly ["ralph", "until done", "until complete", "dont stop", "don't stop"];
    readonly autopilot: readonly ["autopilot", "automatically", "on its own", "auto"];
    readonly plan: readonly ["plan", "planning", "design", "planning"];
    readonly analyze: readonly ["analyze", "analysis", "debugging", "why not", "debug", "investigate"];
    readonly deepsearch: readonly ["deepsearch", "deep search", "find", "search"];
    readonly debate: readonly ["debate", "discussion", "opinion", "discuss", "pros and cons", "compare", "which method"];
    readonly 'git-master': readonly ["commit", "push", "merge", "rebase", "git"];
    readonly 'frontend-ui-ux': readonly ["UI", "UX", "component", "style", "CSS", "component"];
    readonly cancel: readonly ["cancel", "cancel", "stop", "stop", "halt"];
};
//# sourceMappingURL=index.d.ts.map