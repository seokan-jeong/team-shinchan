/**
 * Reflection Engine
 * Execute reflection after task completion
 */
import type { ReflectionResult } from '../memory/types';
import { type TaskResult } from '../learning/extractor';
/**
 * Reflection Depth Decision Factors
 */
interface ComplexityFactors {
    filesModified: number;
    linesChanged: number;
    errorCount: number;
    duration: number;
    hasUserFeedback: boolean;
    isNewFeature: boolean;
    involvedAgents: number;
}
/**
 * Reflection Depth Level
 */
export type ReflectionDepth = 'simple' | 'standard' | 'deep';
/**
 * Calculate Complexity
 */
export declare function calculateComplexity(factors: ComplexityFactors): number;
/**
 * Determine Adaptive Depth
 */
export declare function determineDepth(factors: ComplexityFactors): ReflectionDepth;
/**
 * Execute Reflection (Main Function)
 */
export declare function reflect(result: TaskResult, options?: {
    forceDepth?: ReflectionDepth;
    includeContext?: boolean;
}): ReflectionResult;
/**
 * Batch Reflection
 */
export declare function reflectBatch(results: TaskResult[], options?: {
    aggregateLearnings?: boolean;
}): ReflectionResult[];
/**
 * Generate Reflection Summary
 */
export declare function summarizeReflection(reflection: ReflectionResult): string;
export {};
//# sourceMappingURL=engine.d.ts.map