/**
 * Best Practices
 * Default best practices by language/framework
 */
import type { CreateMemoryInput, MemoryCategory } from '../memory/types';
/**
 * Get Applicable Best Practices
 */
export declare function getBestPractices(languages: string[], frameworks: string[]): CreateMemoryInput[];
/**
 * Get Best Practices by Category
 */
export declare function getBestPracticesByCategory(category: MemoryCategory, languages: string[], frameworks: string[]): CreateMemoryInput[];
/**
 * Summarize Best Practices
 */
export declare function summarizeBestPractices(practices: CreateMemoryInput[]): string;
/**
 * Get Default Best Practices (language/framework agnostic)
 */
export declare function getDefaultBestPractices(): CreateMemoryInput[];
//# sourceMappingURL=best-practices.d.ts.map