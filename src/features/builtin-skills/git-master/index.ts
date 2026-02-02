/**
 * Git-Master 스킬 - Git 전문 모드
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';

export function createGitMasterSkill(context: PluginContext): SkillConfig {
  return {
    name: 'git-master',
    displayName: 'Git-Master',
    description: 'Git 작업 전문 모드를 활성화합니다.',
    triggers: ['commit', 'push', 'merge', 'rebase', 'git'],
    autoActivate: false, // 자동 활성화하지 않음

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      sessionState.activeSkill = 'git-master';

      return {
        success: true,
        output: `🌿 **Git-Master 모드 활성화**

Git 작업 전문 모드입니다.

## Git 가이드라인
- 원자적 커밋 (하나의 목적, 하나의 커밋)
- 명확한 커밋 메시지
- 브랜치 전략 준수

## 커밋 메시지 형식
\`\`\`
<type>: <subject>

<body>

Co-Authored-By: Team-Seokan <noreply@team-seokan.dev>
\`\`\`

## 타입
- feat: 새 기능
- fix: 버그 수정
- refactor: 리팩토링
- docs: 문서
- test: 테스트
- chore: 기타`,
      };
    },
  };
}
