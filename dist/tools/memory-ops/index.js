/**
 * Memory Operations Tool
 * Tool for agents to read and write memory
 */
import { getMemoryManager } from '../../features/memory';
import { createSimpleLearning } from '../../features/learning';
export function createMemoryOpsTool(context) {
    return {
        name: 'memory_ops',
        description: 'Read, write, and search memory. (read: read, write: write, search: search, reinforce: reinforce, contradict: contradict)',
        parameters: [
            {
                name: 'operation',
                type: 'string',
                description: 'Operation to perform: read, write, search, reinforce, contradict',
                required: true,
            },
            {
                name: 'memoryId',
                type: 'string',
                description: '(read/reinforce/contradict) Memory ID',
                required: false,
            },
            {
                name: 'content',
                type: 'string',
                description: '(write) Content to save',
                required: false,
            },
            {
                name: 'category',
                type: 'string',
                description: '(write) Memory category: preference, pattern, context, mistake, decision, convention, insight',
                required: false,
            },
            {
                name: 'scope',
                type: 'string',
                description: '(write) Memory scope: global, project (default: project)',
                required: false,
                default: 'project',
            },
            {
                name: 'tags',
                type: 'array',
                description: '(write) Tag list',
                required: false,
            },
            {
                name: 'keyword',
                type: 'string',
                description: '(search) Search keyword',
                required: false,
            },
            {
                name: 'limit',
                type: 'number',
                description: '(search) Maximum number of results (default: 5)',
                required: false,
                default: 5,
            },
        ],
        handler: async (params) => {
            const manager = getMemoryManager();
            await manager.initialize();
            const operation = params.operation;
            switch (operation) {
                case 'read': {
                    const memoryId = params.memoryId;
                    if (!memoryId) {
                        return { success: false, error: 'memoryId is required.' };
                    }
                    const memory = await manager.read(memoryId);
                    if (!memory) {
                        return { success: false, error: `Memory with ID ${memoryId} not found.` };
                    }
                    return {
                        success: true,
                        output: JSON.stringify({
                            id: memory.id,
                            title: memory.title,
                            content: memory.content,
                            category: memory.category,
                            confidence: memory.confidence,
                            tags: memory.tags,
                            createdAt: memory.createdAt,
                        }, null, 2),
                    };
                }
                case 'write': {
                    const content = params.content;
                    if (!content) {
                        return { success: false, error: 'content is required.' };
                    }
                    const learning = createSimpleLearning(content, {
                        category: params.category,
                        scope: params.scope || 'project',
                        owner: context.sessionState?.lastAgent || undefined,
                        tags: params.tags,
                        source: 'agent-memory-ops',
                    });
                    const memory = await manager.create(learning);
                    return {
                        success: true,
                        output: JSON.stringify({
                            id: memory.id,
                            title: memory.title,
                            message: 'Memory saved.',
                        }),
                    };
                }
                case 'search': {
                    const keyword = params.keyword;
                    const limit = params.limit || 5;
                    const result = await manager.search({
                        keyword,
                        categories: params.category ? [params.category] : undefined,
                        limit,
                        sortBy: 'relevance',
                    });
                    return {
                        success: true,
                        output: JSON.stringify({
                            total: result.total,
                            memories: result.memories.map((m) => ({
                                id: m.id,
                                title: m.title,
                                content: m.content.slice(0, 100) + (m.content.length > 100 ? '...' : ''),
                                category: m.category,
                                confidence: m.confidence,
                            })),
                        }, null, 2),
                    };
                }
                case 'reinforce': {
                    const memoryId = params.memoryId;
                    if (!memoryId) {
                        return { success: false, error: 'memoryId is required.' };
                    }
                    const reinforced = await manager.reinforce(memoryId);
                    if (!reinforced) {
                        return { success: false, error: `Memory with ID ${memoryId} not found.` };
                    }
                    return {
                        success: true,
                        output: JSON.stringify({
                            id: reinforced.id,
                            title: reinforced.title,
                            newConfidence: reinforced.confidence,
                            reinforcementCount: reinforced.reinforcementCount,
                            message: 'Memory reinforced.',
                        }),
                    };
                }
                case 'contradict': {
                    const memoryId = params.memoryId;
                    if (!memoryId) {
                        return { success: false, error: 'memoryId is required.' };
                    }
                    const contradicted = await manager.contradict(memoryId);
                    if (!contradicted) {
                        return { success: false, error: `Memory with ID ${memoryId} not found.` };
                    }
                    return {
                        success: true,
                        output: JSON.stringify({
                            id: contradicted.id,
                            title: contradicted.title,
                            newConfidence: contradicted.confidence,
                            contradictionCount: contradicted.contradictionCount,
                            message: 'Memory contradicted.',
                        }),
                    };
                }
                default:
                    return {
                        success: false,
                        error: `Unknown operation: ${operation}`,
                    };
            }
        },
    };
}
