# Security Debate Template

## Topic Structure
- **Category**: security
- **Typical Trigger**: When authentication, authorization, data protection, or compliance decisions are needed

## Recommended Panel
| Agent | Role | Why |
|-------|------|-----|
| Hiroshi | Oracle | Security patterns and vulnerability analysis |
| Buriburi | Backend | API security and data protection implementation |
| Masao | DevOps | Infrastructure security and deployment concerns |

## Evaluation Criteria
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Threat Model Coverage | High | How well does it protect against identified threats? |
| Compliance | High | Does it meet regulatory requirements (GDPR, HIPAA, etc.)? |
| Implementation Cost | Medium | Time and effort to implement securely |
| Maintenance Burden | Medium | Ongoing effort to maintain security |
| UX Impact | Low | How does it affect user experience? |
| Recovery Process | Medium | How easy is it to recover from security incidents? |

## Standard Options Framework
### Option A: JWT-based Authentication
- **Pros**:
  - Stateless (no server-side session storage)
  - Scales horizontally easily
  - Works well with microservices
  - Can carry custom claims
- **Cons**:
  - Cannot invalidate tokens before expiry
  - Token size can be large
  - Requires careful key management
  - Refresh token flow adds complexity
- **Best when**:
  - Distributed systems
  - Need to scale horizontally
  - Short-lived tokens acceptable
  - Claims-based authorization needed

### Option B: Session-based Authentication
- **Pros**:
  - Immediate revocation possible
  - Smaller token size (just session ID)
  - Simpler mental model
  - Server controls session lifecycle
- **Cons**:
  - Requires session storage (Redis, DB)
  - Harder to scale horizontally
  - Requires sticky sessions or shared storage
  - Cross-domain complexity
- **Best when**:
  - Monolithic applications
  - Need immediate revocation
  - Simple deployment model
  - Single domain application

## Decision Factors Checklist
- [ ] What are the primary threat vectors?
- [ ] What compliance requirements exist (GDPR, HIPAA, SOC2, etc.)?
- [ ] What is the sensitivity of the data being protected?
- [ ] What is the expected attack surface?
- [ ] What level of session control is needed?
- [ ] What are the scalability requirements?
- [ ] How distributed is the system?
- [ ] What is the user base size and location?
- [ ] What are the budget constraints for security tooling?
- [ ] What security expertise does the team have?
- [ ] What is the acceptable risk tolerance?
- [ ] What are the incident response requirements?

## Usage
Midori references this template when debate topic matches the category.
Panel should evaluate security implications, compliance needs, and implementation trade-offs.
Always consider the principle of defense in depth and fail-secure design.
