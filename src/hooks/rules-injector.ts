/**
 * 규칙 주입 훅
 */

import type { HookConfig, PluginContext } from '../types';

export function createRulesInjectorHook(context: PluginContext): HookConfig {
  return {
    name: 'rules-injector',
    event: 'chat.message',
    description: 'Team-Seokan 규칙을 컨텍스트에 주입합니다.',
    enabled: true,
    priority: 20,
    handler: async () => ({ continue: true }),
  };
}
