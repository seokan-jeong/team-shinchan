/**
 * Context Injector
 * Injects memories into agent prompts
 */
import type { MemoryOwner, MemoryCategory, ContextInjection } from '../memory/types';
/**
 * Context Injection Options
 */
export interface InjectionOptions {
    /** Target Agent */
    agent: MemoryOwner;
    /** Current Task Description */
    currentTask?: string;
    /** Related Keywords */
    keywords?: string[];
    /** Maximum Token Count */
    maxTokens?: number;
    /** Categories to Include (default: all) */
    includeCategories?: MemoryCategory[];
    /** Categories to Exclude */
    excludeCategories?: MemoryCategory[];
    /** Minimum Confidence */
    minConfidence?: number;
    /** Include Detailed Memories */
    includeDetails?: boolean;
}
/**
 * Generate Context Injection
 */
export declare function generateContextInjection(options: InjectionOptions): Promise<ContextInjection>;
/**
 * Generate Agent-Optimized Context
 */
export declare function generateAgentContext(agent: MemoryOwner, task: string): Promise<string>;
/**
 * Insert Context into Prompt
 */
export declare function injectContextIntoPrompt(originalPrompt: string, context: string, position?: 'start' | 'end' | 'after-system'): string;
/**
 * Cached Context Management
 */
declare class ContextCache {
    private cache;
    private ttl;
    get(agent: MemoryOwner, taskHash: string): string | null;
    set(agent: MemoryOwner, taskHash: string, context: string): void;
    invalidate(): void;
}
export declare const contextCache: ContextCache;
/**
 * Generate Cached Context
 */
export declare function getCachedAgentContext(agent: MemoryOwner, task: string): Promise<string>;
export {};
//# sourceMappingURL=injector.d.ts.map