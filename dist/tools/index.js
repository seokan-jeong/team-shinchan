/**
 * Team-Seokan Tool System
 */
// Tool creation functions
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
// v2.0 Memory tools
import { createMemoryOpsTool } from './memory-ops';
// ============================================================
// Create all built-in tools
// ============================================================
export function createBuiltinTools(context) {
    return [
        // Agent related
        createDelegateTaskTool(context),
        createCallTeamAgentTool(context),
        createBackgroundTaskTool(context),
        // File/View
        createLookAtTool(context),
        // Skill/Command
        createSkillTool(context),
        createSlashcommandTool(context),
        // Shell
        createInteractiveBashTool(context),
        // Code Analysis
        createAstGrepTool(context),
        // LSP
        createLspDiagnosticsTool(context),
        createLspRenameTool(context),
        createLspReferencesTool(context),
        // Session
        createSessionManagerTool(context),
        // v2.0 Memory
        createMemoryOpsTool(context),
    ];
}
// ============================================================
// Exports
// ============================================================
export { createDelegateTaskTool, createCallTeamAgentTool, createBackgroundTaskTool, createLookAtTool, createSkillTool, createSlashcommandTool, createInteractiveBashTool, createAstGrepTool, createLspDiagnosticsTool, createLspRenameTool, createLspReferencesTool, createSessionManagerTool,
// v2.0 Memory
createMemoryOpsTool, };
