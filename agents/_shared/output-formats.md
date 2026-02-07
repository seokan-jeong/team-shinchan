# Shared Agent Output Formats

These formats are used by all agents. Individual agent files reference this document.

---

## 📋 Standard Output Format

**Return results in this format when task is complete:**

```
## Summary
- {key finding/result 1}
- {key finding/result 2}
- {key finding/result 3}

## Details
{detailed content...}

## Next Steps (optional)
- {recommended next steps}
```

---

## Progress Reporting

**Report analysis progress at meaningful milestones:**

### Format
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Agent] Analysis Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall: {X}% complete

Current Phase: {analysis phase}
✅ Completed:
  - {completed analysis 1}
  - {completed analysis 2}

🔄 In Progress:
  - {current analysis}

⏭️ Remaining:
  - {remaining analysis 1}
```

### When to Report
- After completing each major analysis phase
- When switching between different aspects
- Before making recommendations
- Every 5-7 tool uses for deep analysis

### Examples

**Architecture Analysis:**
```
👔 [Hiroshi] Analysis Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall: 60% complete

Current Phase: Trade-off Analysis
✅ Completed:
  - Reviewed current architecture (monolith)
  - Identified pain points (3 major issues)
  - Analyzed microservices patterns

🔄 In Progress:
  - Evaluating trade-offs
  - Cost-benefit analysis

⏭️ Remaining:
  - Risk assessment
  - Migration strategy
  - Final recommendation
```

---

## Impact Scope Reporting

**Always report the scope of analysis findings and recommendations:**

### Format
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Agent] Impact Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Analysis Scope
🔍 Examined:
  - {area 1}
  - {area 2}

📊 Findings:
  - {finding 1}
  - {finding 2}

## Recommendation Impact
🎯 If Implemented:
  - {positive impact 1}
  - {positive impact 2}

⚠️ Risks:
  - {risk 1}
  - {risk 2}

## Decision Confidence
🟢 High | 🟡 Medium | 🔴 Low
  {rationale}
```

### Examples

**Architecture Decision:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👔 [Hiroshi] Impact Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Analysis Scope
🔍 Examined:
  - Current monolith architecture (15 modules)
  - Team size and skill distribution
  - Deployment frequency requirements
  - Scale requirements (current + 12 months)

📊 Findings:
  - Deployment bottleneck: 2-3 days
  - Team coordination overhead increasing
  - Some modules could benefit from independent scaling
  - No immediate scale crisis

## Recommendation Impact
🎯 If Microservices Adopted:
  - Faster deployment cycles (days → hours)
  - Independent team ownership
  - Better fault isolation
  - Complexity increase in ops

⚠️ Risks:
  - 6-12 month migration effort
  - Requires DevOps maturity increase
  - Network latency between services
  - Distributed debugging complexity

## Decision Confidence
🟡 Medium
  Current pain is real but not critical. Consider hybrid approach:
  extract 2-3 services first, keep monolith core. Re-evaluate in 6 months.
```

---

## Error Reporting Protocol

**Report analysis blockers and data issues:**

### Tier 1: Critical Blocker
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 [Agent] Analysis Blocked
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blocker: {what's missing or unclear}

Impact on Analysis:
  {why this prevents conclusion}

Attempted:
  - {approach 1}
  - {approach 2}

Need from User:
  {specific information required}
```

### Tier 2: Incomplete Data Warning
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ [Agent] Incomplete Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing Context: {what's unclear}

Current Assessment:
  Based on available data: {preliminary finding}

Confidence Level: {low/medium with caveat}

Recommendation:
  {suggest getting more info, or proceed with caveat}
```

### Tier 3: Alternative Perspectives
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ [Agent] Note
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Observation: {what I noticed}
Alternative View: {different perspective}
Consider: {additional factors to think about}
```

### Common Scenarios

**1. Insufficient Information:**
```
🚨 [Hiroshi] Analysis Blocked
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blocker: Traffic patterns and scale requirements unknown

Impact on Analysis:
  Cannot assess if architecture will handle load
  Risk making wrong recommendation

Attempted:
  - Checked existing metrics (none found)
  - Reviewed codebase (no load tests)

Need from User:
  1. Expected daily/monthly active users
  2. Peak traffic patterns
  3. Growth projections
  4. Current performance bottlenecks
```

**2. Conflicting Priorities:**
```
⚠️ [Hiroshi] Incomplete Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing Context: Priority between speed vs. quality unclear

Current Assessment:
  Based on code review: Quick fix possible but creates tech debt
  Proper solution requires 2 weeks refactoring

Confidence Level: Medium (can recommend both paths)

Recommendation:
  Need decision on timeline vs. quality trade-off
  Option A: Quick fix (3 days, adds debt)
  Option B: Proper refactor (2 weeks, clean)
```
