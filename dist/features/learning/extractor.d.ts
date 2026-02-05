/**
 * Learning Extractor
 * Extract learning points from interactions
 */
import type { CreateMemoryInput, MemoryCategory, MemoryScope, MemoryOwner, LearningExtraction } from '../memory/types';
/**
 * Task Result Type
 */
export interface TaskResult {
    taskId: string;
    description: string;
    success: boolean;
    agent: MemoryOwner;
    filesModified: string[];
    codeChanges: CodeChange[];
    userFeedback?: string;
    duration: number;
    errors: string[];
    context: Record<string, unknown>;
}
/**
 * Code Change Information
 */
export interface CodeChange {
    filePath: string;
    changeType: 'create' | 'modify' | 'delete';
    language: string;
    linesAdded: number;
    linesRemoved: number;
    summary: string;
}
/**
 * Execute Learning Extraction
 */
export declare function extractLearnings(result: TaskResult): LearningExtraction;
/**
 * Create Simple Learning (for explicit learning)
 */
export declare function createSimpleLearning(content: string, options?: {
    category?: MemoryCategory;
    scope?: MemoryScope;
    owner?: MemoryOwner;
    tags?: string[];
    source?: string;
}): CreateMemoryInput;
/**
 * Extract Learning from Code Changes
 */
export declare function extractFromCodeChanges(changes: CodeChange[]): CreateMemoryInput[];
//# sourceMappingURL=extractor.d.ts.map