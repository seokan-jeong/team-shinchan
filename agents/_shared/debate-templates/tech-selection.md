# Technology Selection Debate Template

## Topic Structure
- **Category**: tech-selection
- **Typical Trigger**: When selecting libraries, frameworks, languages, or platforms for a project

## Recommended Panel
| Agent | Role | Why |
|-------|------|-----|
| Aichan | Frontend | Frontend technology expertise |
| Buriburi | Backend | Backend technology expertise |
| Masao | DevOps | Infrastructure and deployment considerations |
| Hiroshi | Oracle | Overall technical assessment and risk analysis |

## Evaluation Criteria
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Ecosystem Maturity | High | Size of community, available libraries, tooling |
| Team Expertise | High | Current team knowledge and learning curve |
| Migration Cost | Medium | Effort to adopt or migrate from current stack |
| Long-term Support | Medium | Maintenance commitment and update frequency |
| Performance | Medium | Speed and efficiency for the use case |
| Developer Experience | Medium | Documentation quality, debugging tools, IDE support |
| Hiring Pool | Low | Availability of developers with this skill |

## Standard Options Framework
### Option A: Established Technology (e.g., React, Express)
- **Pros**:
  - Large community and ecosystem
  - Abundant learning resources
  - Well-documented best practices
  - Stable and battle-tested
  - Large hiring pool
- **Cons**:
  - May carry legacy patterns
  - Slower to adopt new features
  - Larger bundle size (often)
  - Sometimes over-engineered for simple cases
- **Best when**:
  - Building production systems
  - Team stability is important
  - Need extensive third-party integrations
  - Long-term maintenance expected

### Option B: Modern Alternative (e.g., Vue 3, Fastify)
- **Pros**:
  - Modern API design
  - Better performance (often)
  - Smaller footprint
  - Incorporates lessons learned
- **Cons**:
  - Smaller ecosystem
  - Fewer learning resources
  - Uncertain long-term support
  - Smaller hiring pool
- **Best when**:
  - Greenfield projects
  - Team is experienced and adaptable
  - Performance is critical
  - Need modern features

### Option C: Bleeding Edge (e.g., new framework < 1 year old)
- **Pros**:
  - Cutting-edge features
  - Optimal developer experience (by design)
  - Small bundle size
  - Fast innovation
- **Cons**:
  - Unstable API
  - Very small community
  - Limited libraries
  - Risk of abandonment
  - Hard to hire for
- **Best when**:
  - Internal tools or prototypes
  - Team wants to experiment
  - Short-term project
  - Can tolerate breaking changes

## Decision Factors Checklist
- [ ] What is the team's current skill set?
- [ ] What is the project timeline?
- [ ] What is the expected project lifespan?
- [ ] What are the performance requirements?
- [ ] What third-party integrations are needed?
- [ ] What is the team's capacity to learn new technologies?
- [ ] What is the hiring plan for the next 1-2 years?
- [ ] What is the risk tolerance for the project?
- [ ] What are the licensing requirements?
- [ ] What is the support and maintenance plan?
- [ ] What are similar projects using?
- [ ] What is the migration path if we need to switch later?

## Usage
Midori references this template when debate topic matches the category.
Panel should consider both technical merit and practical constraints.
Always evaluate against project-specific context rather than general "best practices".
