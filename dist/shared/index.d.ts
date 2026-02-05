/**
 * Team-Shinchan Shared Utilities
 */
import type { ModelTier, BuiltinAgentName } from '../types';
export declare function createEnvContext(): string;
export declare const AGENT_DISPLAY_NAMES: Record<BuiltinAgentName, string>;
export declare const AGENT_ROLES: Record<BuiltinAgentName, string>;
export declare function getAgentDisplayName(name: BuiltinAgentName): string;
export declare function getAgentRole(name: BuiltinAgentName): string;
export declare function formatAgentName(name: BuiltinAgentName): string;
export declare function getModelDisplayName(model: ModelTier): string;
export declare function isExpensiveModel(model: ModelTier): boolean;
export declare function isCheapModel(model: ModelTier): boolean;
export declare function truncateString(str: string, maxLength: number): string;
export declare function escapeXml(str: string): string;
export declare function stripXmlTags(str: string): string;
export declare function matchKeywords(text: string, keywords: readonly string[]): boolean;
export declare function findMatchedKeyword(text: string, keywords: readonly string[]): string | undefined;
export declare function chunk<T>(array: T[], size: number): T[][];
export declare function unique<T>(array: T[]): T[];
export declare function log(category: string, message: string, data?: unknown): void;
export declare function logError(category: string, message: string, error?: unknown): void;
export declare function logWarning(category: string, message: string): void;
export declare function sleep(ms: number): Promise<void>;
export declare function measureTime<T>(fn: () => T | Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
//# sourceMappingURL=index.d.ts.map