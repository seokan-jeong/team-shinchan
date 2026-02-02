/**
 * 디렉토리 AGENTS.md 주입 훅
 */

import type { HookConfig, PluginContext } from '../types';

export function createDirectoryAgentsInjectorHook(context: PluginContext): HookConfig {
  return {
    name: 'directory-agents-injector',
    event: 'chat.message',
    description: '현재 디렉토리의 AGENTS.md를 컨텍스트에 주입합니다.',
    enabled: true,
    priority: 15,
    handler: async () => ({ continue: true }),
  };
}
