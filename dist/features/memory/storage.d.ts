/**
 * Memory Storage
 * File-based memory storage
 */
import type { MemoryEntry, MemoryCategory, MemoryScope, MemoryOwner, MemoryStorageConfig } from './types';
/**
 * Convert Memory to Markdown Format
 */
export declare function memoryToMarkdown(memory: MemoryEntry): string;
/**
 * Parse Memory from Markdown
 */
export declare function markdownToMemory(markdown: string, scope: MemoryScope): MemoryEntry | null;
/**
 * Expand Path (handle ~)
 */
export declare function expandPath(filePath: string): string;
/**
 * Return Single Learning File Name
 */
export declare function getLearningFileName(): string;
/**
 * Memory Storage Class
 */
export declare class MemoryStorage {
    private config;
    private globalPath;
    private projectPath;
    constructor(config?: Partial<MemoryStorageConfig>);
    /**
     * Initialize Directories
     */
    initialize(): Promise<void>;
    /**
     * Ensure Directory Exists
     */
    private ensureDirectory;
    /**
     * Get Base Path by Scope
     */
    getBasePath(scope: MemoryScope): string;
    /**
     * Get Memory File Path
     */
    getMemoryFilePath(scope: MemoryScope, owner?: MemoryOwner): string;
    /**
     * Load Memories from File
     */
    loadFromFile(filePath: string, scope: MemoryScope): Promise<MemoryEntry[]>;
    /**
     * Save Memories to File
     */
    saveToFile(filePath: string, memories: MemoryEntry[]): Promise<void>;
    /**
     * Load All Memories (Global + Project)
     */
    loadAllMemories(): Promise<{
        global: MemoryEntry[];
        project: MemoryEntry[];
    }>;
    /**
     * Save Memory
     */
    saveMemory(memory: MemoryEntry): Promise<void>;
    /**
     * Delete Memory
     */
    deleteMemory(memoryId: string, scope: MemoryScope): Promise<boolean>;
    /**
     * Create Backup
     */
    createBackup(): Promise<string>;
    /**
     * Get Configuration
     */
    getConfig(): MemoryStorageConfig;
}
export declare function getDefaultStorage(): MemoryStorage;
export declare function setDefaultStorage(storage: MemoryStorage): void;
//# sourceMappingURL=storage.d.ts.map