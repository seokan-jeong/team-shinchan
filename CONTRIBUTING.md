# Contributing to Team-Shinchan

Team-Shinchan is a Claude Code multi-agent workflow system. This guide helps you contribute effectively.

## Before You Start

1. Read `CLAUDE.md` to understand the system architecture
2. Review `agents/_shared/output-formats.md` for output format standards
3. Run `cd tests/validate && node index.js` to ensure tests pass

## Project Structure

```
team-shinchan/
├── agents/              # Agent definition files
│   ├── _shared/        # Shared documentation
│   ├── shinnosuke.md   # Orchestrator
│   ├── hiroshi.md      # Oracle (analyzer)
│   └── ...             # Other agents
├── skills/             # Skill definition files
│   ├── start/SKILL.md  # Start workflow
│   └── .../SKILL.md    # Other skills
├── tests/              # Test files
└── shinchan-docs/      # Generated workflow docs
```

## Agent File Conventions

Each agent file (`agents/{name}.md`) must include:

- **Signature section**: Emoji + name table
- **Responsibilities**: Clear role definition
- **Capabilities**: What the agent can do
- **Output format**: Reference to `_shared/output-formats.md`
- **Real-time progress**: How agent reports status
- **All content in English**: No Korean in code files

Example structure:
```markdown
# {Agent Name} - {Role}

## Signature
| Emoji | Agent |
|-------|-------|
| {emoji} | {Name} |

## Responsibilities
...

## Output Format
See agents/_shared/output-formats.md for standard formats.
```

## Skill File Conventions

Each skill file (`skills/{name}/SKILL.md`) must include:

- **Name and description**: Clear purpose
- **When to use**: Trigger conditions
- **Parameters**: Required/optional inputs
- **Input validation**: Parameter checks
- **Workflow**: Step-by-step process
- **Error handling**: What happens on failure
- **All content in English**: No Korean in code files

Skills must validate inputs before execution.

## Testing Requirements

### Before Committing

**REQUIRED**: Run static tests before every commit:
```bash
cd tests/validate && node index.js
```

This runs:
- 11 static validation tests (stage-matrix, debate-consistency, shared-refs, etc.)
- Promptfoo agent behavior tests are in `promptfoo/promptfoo.yaml`

All tests must pass before committing.

### Test Types

- **Static tests**: Validate consistency across files
- **Agent tests**: Verify agent behavior via promptfoo

## Code Style

- Use Markdown for all documentation
- Keep files concise (agents: 100-150 lines, skills: 50-100 lines)
- Use clear headers and bullet points
- Reference shared docs instead of duplicating
- No Korean text in code files (English only)

## Pull Request Guidelines

1. Create descriptive PR title (under 70 characters)
2. Include summary of changes
3. Reference related issues if applicable
4. Ensure all tests pass
5. Update CHANGELOG.md if significant changes

## Output Format Standards

All agents must follow standardized output formats defined in `agents/_shared/output-formats.md`:

- Summary format (3 bullet points)
- Real-time progress updates
- Error reporting protocol
- Impact scope reporting

## Questions?

- Check `CLAUDE.md` for system documentation
- Review existing agent/skill files for examples
- Run `cd tests/validate && node index.js` frequently during development
