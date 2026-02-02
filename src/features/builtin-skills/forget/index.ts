/**
 * Forget 스킬 - 메모리 삭제
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { getMemoryManager } from '../../memory';

export function createForgetSkill(context: PluginContext): SkillConfig {
  return {
    name: 'forget',
    displayName: 'Forget',
    description: '특정 메모리를 삭제합니다.',
    triggers: ['forget', '잊어', '삭제', 'delete memory'],
    autoActivate: false,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      if (!args || args.trim() === '') {
        return {
          success: false,
          output: `# ❌ 삭제 대상 필요

\`/forget "키워드"\` 형식으로 삭제할 메모리를 지정해주세요.

**사용법:**
- \`/forget 네이밍\` - "네이밍" 관련 메모리 삭제
- \`/forget preference\` - 모든 선호도 메모리 삭제
- \`/forget all\` - 모든 메모리 삭제 (주의!)

💡 먼저 \`/memories\`로 현재 학습 내용을 확인하세요.`,
        };
      }

      try {
        const manager = getMemoryManager();
        await manager.initialize();

        const keyword = args.trim();

        // 전체 삭제 확인
        if (keyword.toLowerCase() === 'all') {
          // 모든 메모리 삭제
          const stats = await manager.getStats();
          const totalBefore = stats.total;

          // 실제로는 각 메모리를 순회하며 삭제해야 함
          const allMemories = manager.getAllMemories();
          for (const memory of allMemories) {
            await manager.delete(memory.id);
          }

          return {
            success: true,
            output: `# 🗑️ 전체 메모리 삭제

**${totalBefore}개**의 메모리가 모두 삭제되었습니다.

학습이 초기화되었습니다. 새로운 작업부터 다시 학습을 시작합니다.`,
          };
        }

        // 키워드로 삭제
        const deletedCount = await manager.forget(keyword);

        if (deletedCount === 0) {
          return {
            success: true,
            output: `# ℹ️ 삭제 대상 없음

"${keyword}"와 관련된 메모리를 찾을 수 없습니다.

💡 \`/memories\`로 현재 학습 내용을 확인하세요.`,
          };
        }

        return {
          success: true,
          output: `# 🗑️ 메모리 삭제 완료

**${deletedCount}개**의 "${keyword}" 관련 메모리가 삭제되었습니다.

이 내용은 더 이상 에이전트의 행동에 영향을 주지 않습니다.`,
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 메모리 삭제 실패: ${error}`,
        };
      }
    },
  };
}
