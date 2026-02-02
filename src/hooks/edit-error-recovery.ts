/**
 * 편집 오류 복구 훅
 */

import type { HookConfig, PluginContext } from '../types';

export function createEditErrorRecoveryHook(context: PluginContext): HookConfig {
  return {
    name: 'edit-error-recovery',
    event: 'tool.execute.after',
    description: '편집 오류 발생 시 복구를 시도합니다.',
    enabled: true,
    priority: 55,
    matchTools: ['Edit'],
    handler: async () => ({ continue: true }),
  };
}
