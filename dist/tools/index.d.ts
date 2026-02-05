/**
 * Team-Seokan Tool System
 */
import type { ToolConfig, PluginContext } from '../types';
import { createDelegateTaskTool } from './delegate-task';
import { createCallTeamAgentTool } from './call-team-agent';
import { createBackgroundTaskTool } from './background-task';
import { createLookAtTool } from './look-at';
import { createSkillTool } from './skill';
import { createSlashcommandTool } from './slashcommand';
import { createInteractiveBashTool } from './interactive-bash';
import { createAstGrepTool } from './ast-grep';
import { createLspDiagnosticsTool, createLspRenameTool, createLspReferencesTool } from './lsp';
import { createSessionManagerTool } from './session-manager';
import { createMemoryOpsTool } from './memory-ops';
export declare function createBuiltinTools(context: PluginContext): ToolConfig[];
export { createDelegateTaskTool, createCallTeamAgentTool, createBackgroundTaskTool, createLookAtTool, createSkillTool, createSlashcommandTool, createInteractiveBashTool, createAstGrepTool, createLspDiagnosticsTool, createLspRenameTool, createLspReferencesTool, createSessionManagerTool, createMemoryOpsTool, };
//# sourceMappingURL=index.d.ts.map