/**
 * Learning Categorizer
 * Automatic learning content categorization
 */
import type { CreateMemoryInput, MemoryCategory } from '../memory/types';
/**
 * Determine Optimal Category
 */
export declare function determineCategory(content: string, title?: string, tags?: string[]): MemoryCategory;
/**
 * Calculate Category Confidence
 */
export declare function calculateCategoryConfidence(content: string, determinedCategory: MemoryCategory): number;
/**
 * Classify and Enhance Learning
 */
export declare function classifyLearning(input: CreateMemoryInput): CreateMemoryInput;
/**
 * Classify Batch
 */
export declare function classifyBatch(inputs: CreateMemoryInput[]): CreateMemoryInput[];
/**
 * Suggest Categories
 */
export declare function suggestCategories(content: string): {
    primary: MemoryCategory;
    alternatives: MemoryCategory[];
    scores: Map<MemoryCategory, number>;
};
/**
 * Extract Category Hint from Tags
 */
export declare function extractCategoryFromTags(tags: string[]): MemoryCategory | null;
/**
 * Context-Based Classification
 */
export declare function classifyWithContext(input: CreateMemoryInput, context: {
    recentCategories?: MemoryCategory[];
    agentType?: string;
    taskType?: string;
}): CreateMemoryInput;
/**
 * Analyze Category Distribution Statistics
 */
export declare function analyzeCategoryDistribution(learnings: CreateMemoryInput[]): Map<MemoryCategory, {
    count: number;
    avgConfidence: number;
}>;
//# sourceMappingURL=categorizer.d.ts.map