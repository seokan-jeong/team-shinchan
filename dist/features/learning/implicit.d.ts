/**
 * Implicit Feedback Detection
 * Detect and convert user implicit feedback into learnings
 */
import type { ImplicitFeedback, MemoryOwner, LearningExtraction } from '../memory/types';
/**
 * User Action Type
 */
export interface UserAction {
    type: 'edit' | 'undo' | 'reject' | 'accept' | 'modify' | 'retry';
    timestamp: Date;
    context: {
        filePath?: string;
        originalContent?: string;
        modifiedContent?: string;
        agent?: MemoryOwner;
        taskDescription?: string;
        errorMessage?: string;
    };
}
/**
 * Detect Implicit Feedback
 */
export declare function detectImplicitFeedback(action: UserAction): ImplicitFeedback | null;
/**
 * Extract Learning from Feedback
 */
export declare function extractLearningFromFeedback(feedback: ImplicitFeedback): LearningExtraction;
/**
 * Process Feedback Batch
 */
export declare function processFeedbackBatch(actions: UserAction[]): LearningExtraction;
/**
 * Analyze Modification Patterns
 */
export declare function analyzeModificationPatterns(feedbacks: ImplicitFeedback[]): Map<string, number>;
//# sourceMappingURL=implicit.d.ts.map