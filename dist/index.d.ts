/**
 * Team-Shinchan Plugin
 * Shin-chan character-based multi-agent orchestration system
 */
import type { PluginContext, PluginSettings, AgentConfig, HookConfig, ToolConfig, SkillConfig } from './types';
export declare function TeamSeokanPlugin(ctx: unknown): Promise<PluginInstance>;
export interface PluginInstance {
    name: string;
    version: string;
    context: PluginContext;
    agents: AgentConfig[];
    hooks: HookConfig[];
    tools: ToolConfig[];
    skills: SkillConfig[];
    handlers: Record<string, (...args: unknown[]) => Promise<void>>;
    config: {
        get: () => PluginSettings;
        update: (settings: Partial<PluginSettings>) => Promise<void>;
    };
}
export default TeamSeokanPlugin;
export * from './types';
//# sourceMappingURL=index.d.ts.map