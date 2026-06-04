# Performance Debate Template

## Topic Structure
- **Category**: performance
- **Typical Trigger**: When performance optimizations require trade-offs with readability, complexity, or resource usage

## Recommended Panel
| Agent | Role | Why |
|-------|------|-----|
| Hiroshi | Oracle | Performance analysis and optimization patterns |
| Buriburi | Backend | Database and API performance expertise |

## Evaluation Criteria
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Latency | High | Response time and user-perceived speed |
| Throughput | High | Number of requests/operations per second |
| Resource Usage | Medium | Memory, CPU, network, disk consumption |
| Complexity | Low | Implementation and maintenance complexity |
| Cost | Medium | Infrastructure and operational cost |
| Scalability | Medium | How performance scales with load |

## Standard Options Framework
### Option A: In-Memory Caching (Redis)
- **Pros**:
  - Extremely fast read access (sub-millisecond)
  - Reduces database load significantly
  - Supports various data structures
  - Easy to implement
- **Cons**:
  - Cache invalidation complexity
  - Memory cost
  - Data freshness concerns
  - Cache stampede risk
- **Best when**:
  - Read-heavy workloads
  - Data can tolerate staleness
  - Budget for memory resources
  - Frequent identical queries

### Option B: Database Query Optimization
- **Pros**:
  - Always fresh data
  - No cache invalidation needed
  - Lower memory footprint
  - Simpler architecture
- **Cons**:
  - Higher database load
  - Slower than cache (milliseconds vs microseconds)
  - Requires database expertise
  - Limited by database capabilities
- **Best when**:
  - Data freshness is critical
  - Write-heavy workloads
  - Budget constraints on caching infrastructure
  - Complex query requirements

### Option C: CDN/Edge Caching
- **Pros**:
  - Global distribution
  - Reduces origin load
  - Lower latency for users
  - DDoS protection
- **Cons**:
  - Only for static/semi-static content
  - Cache invalidation across edge locations
  - Additional cost
  - Less control over caching logic
- **Best when**:
  - Serving static assets
  - Global user base
  - High traffic volume
  - Content updates infrequently

## Decision Factors Checklist
- [ ] What is the current performance baseline?
- [ ] What are the performance targets (latency, throughput)?
- [ ] What is the read/write ratio?
- [ ] How fresh does data need to be?
- [ ] What is the geographic distribution of users?
- [ ] What are the memory/CPU/network budgets?
- [ ] What is the expected traffic pattern (steady, spiky)?
- [ ] What is the acceptable complexity level?
- [ ] What monitoring and profiling data exists?
- [ ] What are the bottlenecks identified?
- [ ] What is the cost tolerance for performance gains?
- [ ] How critical is this performance to business goals?

## Usage
Midori references this template when debate topic matches the category.
Panel should evaluate performance impact quantitatively with metrics.
Always consider the 80/20 rule - focus on optimizations with the highest impact.
