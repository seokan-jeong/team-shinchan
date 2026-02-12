---
name: team-shinchan:devops
description: DevOps and infrastructure with Masao. Used for "CI/CD", "Docker", "deploy", "pipeline" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What DevOps/infrastructure work would you like me to do?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:masao",
  model="sonnet",
  prompt=`/team-shinchan:devops has been invoked.

## DevOps/Infrastructure Request

Handle infrastructure tasks including:

| Area | Capabilities |
|------|-------------|
| CI/CD | GitHub Actions, Jenkins, GitLab CI |
| Containers | Docker, Kubernetes, docker-compose |
| Cloud | AWS, GCP, Azure configuration |
| Monitoring | Logging, metrics, alerting setup |
| Environments | Dev, staging, production configs |

## Implementation Requirements

- Follow Infrastructure as Code principles
- Include automated testing in pipelines
- Use proper secret management
- Document configuration changes
- Test locally before deploying
- Implement blue-green or canary deployments where appropriate

User request: ${args || '(Please describe the DevOps task)'}
`
)
```

**STOP HERE. The above Task handles everything.**
