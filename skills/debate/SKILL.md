---
name: team-shinchan:debate
description: Specialized agents debate to find optimal solutions. Used for "debate", "pros and cons", "gather opinions" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY - Debate Initiation

## Step 0: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What topic would you like to debate?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

**All debates (explicit or auto-triggered) invoke Midori via Task tool.**

When `/team-shinchan:debate` is called or debate is auto-triggered, Shinnosuke always delegates to Midori.

---

## 🔔 Auto-Trigger Conditions

**Shinnosuke starts Debate immediately when detecting the following situations:**

| Situation | Auto-Debate | Example |
|------|------------|------|
| 2+ implementation approaches exist | ✅ | REST vs GraphQL, Monolith vs Microservices |
| Architecture change | ✅ | DB schema redesign, layer structure change |
| Breaking existing patterns | ✅ | Proposing different approach from existing conventions |
| Performance vs Readability tradeoff | ✅ | Optimization vs Maintainability |
| Security-sensitive decisions | ✅ | Authentication method, data encryption approach |
| Technology stack selection | ✅ | React vs Vue, PostgreSQL vs MongoDB |
| Simple CRUD | ❌ | Simple CRUD endpoints |
| Clear bug fix | ❌ | Obvious bug fix |
| User explicitly decided | ❌ | User has already decided |

### Auto-Trigger Behavior

1. **Immediately announce Debate start**
   ```
   ⚠️ Design decision needed: [detected situation]
   → Starting Debate automatically
   ```

2. **Execute same process as manual invocation**
   - Proceed with Steps 1-3 below
   - Difference: Add background explanation since user didn't explicitly invoke

3. **Record decision in REQUESTS.md**
   - Stage 1: Add decision to requirements
   - Stage 2+: Record in corresponding Phase in PROGRESS.md

---

## Step 1: Invoke Midori

```typescript
Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Please proceed with Debate.

## Topic
{discussion topic}

## Panel
{panel list}

## Procedure
1. Announce Debate start
2. Collect panel opinions (parallel Tasks)
3. Output opinions in real-time
4. Hiroshi derives consensus
5. Report final decision"
)
```

## Step 2: Deliver Results to User

When receiving results from Midori, deliver to user in the following format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: {topic}

🎤 Expert Opinions:
- [Hiroshi]: {opinion summary}
- [Nene]: {opinion summary}

✅ Recommended Decision: {Midori's conclusion}
📝 Rationale: {reasoning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: Confirm User Opinion

After delivering results, ask the user:

"Do you agree with the recommended decision? If you have other opinions or additional considerations, please let me know."

## Step 4: Final Decision

- If user agrees: Document decision and proceed
- If user disagrees: Revise decision reflecting concerns
- **Never proceed without user confirmation**

## Panel Selection Criteria

| Topic | Panel |
|------|------|
| UI/Frontend | Aichan, Hiroshi |
| API/Backend | Bunta, Hiroshi |
| DevOps/Infra | Masao, Hiroshi |
| Architecture | Hiroshi, Nene, Misae |
| Full-stack | Aichan, Bunta, Masao, Hiroshi |
| Security | Hiroshi, Bunta, Masao |
| Performance | Hiroshi, Bunta |
| Testing Strategy | Hiroshi, Nene |

---

## 📖 Auto-Trigger Examples

### Example 1: Detecting 2+ Implementation Approaches

```
[Shinnosuke analyzing...]
Detected: JWT and Session both possible for authentication implementation

⚠️ Design decision needed: Choose authentication method (JWT vs Session)
→ Starting Debate automatically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Started (auto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: Authentication method selection
👥 Panel: Hiroshi, Bunta
🎯 Goal: Choose optimal between JWT and Session

[Regular Debate process follows...]
```

### Example 2: Detecting Architecture Change

```
[Bo proposes...]
"Instead of adding roles field to User table, I propose creating separate Role table."

[Shinnosuke detects]
Detected: DB schema change → Architecture impact review needed

⚠️ Design decision needed: Role management approach (single table vs normalization)
→ Starting Debate automatically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Started (auto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: Role management DB design
👥 Panel: Hiroshi, Bunta, Nene
🎯 Goal: Determine optimal schema considering scalability and maintainability
```

### Example 3: Performance vs Readability Tradeoff

```
[Action Kamen reviewing...]
"Current code has good readability but N+1 query issue exists. Optimization increases complexity."

[Shinnosuke detects]
Detected: Performance optimization vs code readability tradeoff

⚠️ Design decision needed: Determine query optimization level
→ Starting Debate automatically
```

---

## ⚙️ Shinnosuke's Auto-Detection Logic

**Shinnosuke detects the following signals:**

| Signal | Detection Method |
|------|----------|
| 2+ approaches mentioned | Expressions like "A or B", "vs", "method1/method2" |
| Architecture keywords | "schema change", "layer", "structure", "architecture" |
| Pattern violations | Action Kamen warns "differs from existing pattern" |
| Tradeoff mentions | "but", "however", "trade-off", "at the cost of" |
| Security keywords | "auth", "security", "encryption", "permission" |

**After auto-detection, immediately:**
1. Announce situation
2. Start Debate (same as above process)
3. Document decision
