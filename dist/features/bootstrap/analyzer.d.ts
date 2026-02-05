/**
 * Bootstrap Analyzer
 * Initial project analysis and convention detection
 */
import type { CreateMemoryInput, BootstrapResult } from '../memory/types';
/**
 * Project Information
 */
export interface ProjectInfo {
    name: string;
    type: 'node' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
    frameworks: string[];
    languages: string[];
    hasTests: boolean;
    hasCI: boolean;
    hasDocs: boolean;
}
/**
 * File Structure Analysis
 */
export interface StructureAnalysis {
    sourceDir: string | null;
    testDir: string | null;
    configFiles: string[];
    entryPoints: string[];
    patterns: string[];
}
/**
 * Detect Project Type
 */
export declare function detectProjectType(rootPath: string): ProjectInfo;
/**
 * Analyze Structure
 */
export declare function analyzeStructure(rootPath: string): StructureAnalysis;
/**
 * Detect Conventions
 */
export declare function detectConventions(rootPath: string): CreateMemoryInput[];
/**
 * Run Complete Bootstrap Analysis
 */
export declare function runBootstrapAnalysis(rootPath: string): BootstrapResult;
//# sourceMappingURL=analyzer.d.ts.map