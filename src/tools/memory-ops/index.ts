/**
 * Memory Operations Tool
 * 에이전트가 메모리를 읽고 쓸 수 있는 도구
 */

import type { ToolConfig, PluginContext, ToolResult } from '../../types';
import { getMemoryManager } from '../../features/memory';
import { createSimpleLearning } from '../../features/learning';
import type { MemoryCategory, MemoryScope, MemoryOwner } from '../../features/memory/types';

export function createMemoryOpsTool(context: PluginContext): ToolConfig {
  return {
    name: 'memory_ops',
    displayName: 'Memory Operations',
    description: '메모리를 읽고, 쓰고, 검색합니다.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['read', 'write', 'search', 'reinforce', 'contradict'],
          description: '수행할 작업 (read: 메모리 읽기, write: 메모리 쓰기, search: 검색, reinforce: 강화, contradict: 반박)',
        },
        // read 파라미터
        memoryId: {
          type: 'string',
          description: '(read/reinforce/contradict) 메모리 ID',
        },
        // write 파라미터
        content: {
          type: 'string',
          description: '(write) 저장할 내용',
        },
        category: {
          type: 'string',
          enum: ['preference', 'pattern', 'context', 'mistake', 'decision', 'convention', 'insight'],
          description: '(write) 메모리 카테고리',
        },
        scope: {
          type: 'string',
          enum: ['global', 'project'],
          description: '(write) 메모리 범위 (기본: project)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '(write) 태그 목록',
        },
        // search 파라미터
        keyword: {
          type: 'string',
          description: '(search) 검색 키워드',
        },
        limit: {
          type: 'number',
          description: '(search) 최대 결과 수 (기본: 5)',
        },
      },
      required: ['operation'],
    },

    handler: async ({ params, sessionState }): Promise<ToolResult> => {
      const manager = getMemoryManager();
      await manager.initialize();

      const operation = params.operation as string;

      switch (operation) {
        case 'read': {
          const memoryId = params.memoryId as string;
          if (!memoryId) {
            return { success: false, output: 'memoryId가 필요합니다.' };
          }

          const memory = await manager.read(memoryId);
          if (!memory) {
            return { success: false, output: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
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
          const content = params.content as string;
          if (!content) {
            return { success: false, output: 'content가 필요합니다.' };
          }

          const learning = createSimpleLearning(content, {
            category: params.category as MemoryCategory,
            scope: (params.scope as MemoryScope) || 'project',
            owner: sessionState.lastAgent as MemoryOwner,
            tags: params.tags as string[],
            source: 'agent-memory-ops',
          });

          const memory = await manager.create(learning);

          return {
            success: true,
            output: JSON.stringify({
              id: memory.id,
              title: memory.title,
              message: '메모리가 저장되었습니다.',
            }),
          };
        }

        case 'search': {
          const keyword = params.keyword as string;
          const limit = (params.limit as number) || 5;

          const result = await manager.search({
            keyword,
            categories: params.category ? [params.category as MemoryCategory] : undefined,
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
          const memoryId = params.memoryId as string;
          if (!memoryId) {
            return { success: false, output: 'memoryId가 필요합니다.' };
          }

          const reinforced = await manager.reinforce(memoryId);
          if (!reinforced) {
            return { success: false, output: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
          }

          return {
            success: true,
            output: JSON.stringify({
              id: reinforced.id,
              title: reinforced.title,
              newConfidence: reinforced.confidence,
              reinforcementCount: reinforced.reinforcementCount,
              message: '메모리가 강화되었습니다.',
            }),
          };
        }

        case 'contradict': {
          const memoryId = params.memoryId as string;
          if (!memoryId) {
            return { success: false, output: 'memoryId가 필요합니다.' };
          }

          const contradicted = await manager.contradict(memoryId);
          if (!contradicted) {
            return { success: false, output: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
          }

          return {
            success: true,
            output: JSON.stringify({
              id: contradicted.id,
              title: contradicted.title,
              newConfidence: contradicted.confidence,
              contradictionCount: contradicted.contradictionCount,
              message: '메모리가 반박 처리되었습니다.',
            }),
          };
        }

        default:
          return {
            success: false,
            output: `알 수 없는 operation: ${operation}`,
          };
      }
    },
  };
}
