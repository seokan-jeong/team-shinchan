/**
 * Team-Shinchan Built-in Skills System
 */
// Skill creation functions
import { createUltraworkSkill } from './ultrawork';
import { createRalphSkill } from './ralph';
import { createAutopilotSkill } from './autopilot';
import { createPlanSkill } from './plan';
import { createAnalyzeSkill } from './analyze';
import { createDeepsearchSkill } from './deepsearch';
import { createGitMasterSkill } from './git-master';
import { createFrontendUiUxSkill } from './frontend-ui-ux';
import { createHelpSkill } from './help';
import { createCancelSkill } from './cancel';
// v2.0 Memory skills
import { createMemoriesSkill } from './memories';
import { createForgetSkill } from './forget';
import { createLearnSkill } from './learn';
// v2.1 Debate skill
import { createDebateSkill } from './debate';
// ============================================================
// Create all built-in skills
// ============================================================
export function createBuiltinSkills(context) {
    return [
        createUltraworkSkill(context),
        createRalphSkill(context),
        createAutopilotSkill(context),
        createPlanSkill(context),
        createAnalyzeSkill(context),
        createDeepsearchSkill(context),
        createGitMasterSkill(context),
        createFrontendUiUxSkill(context),
        createHelpSkill(context),
        createCancelSkill(context),
        // v2.0 Memory skills
        createMemoriesSkill(context),
        createForgetSkill(context),
        createLearnSkill(context),
        // v2.1 Debate skill
        createDebateSkill(context),
    ];
}
// ============================================================
// Exports
// ============================================================
export { createUltraworkSkill, createRalphSkill, createAutopilotSkill, createPlanSkill, createAnalyzeSkill, createDeepsearchSkill, createGitMasterSkill, createFrontendUiUxSkill, createHelpSkill, createCancelSkill,
// v2.0 Memory skills
createMemoriesSkill, createForgetSkill, createLearnSkill,
// v2.1 Debate skill
createDebateSkill, };
