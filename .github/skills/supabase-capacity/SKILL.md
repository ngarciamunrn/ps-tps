---
name: supabase-capacity
description: "Trigger: TP enrollment, capacity limits, concurrent enrollment, Supabase RLS. Guide implementation without assuming unresolved product policies."
license: Apache-2.0
metadata:
  author: "project-maintainers"
  version: "1.0"
---

## Activation Contract
Use this skill when designing or implementing TP enrollment, capacity enforcement, duplicate prevention, or related Supabase authorization.

## Hard Rules
- Resolve product policy before implementation. Never invent capacity limits, whether students may join multiple TPs, duplicate handling, or waitlist behavior.
- Enforce capacity and duplicate constraints atomically on the server/database. A browser-only check is advisory, not enforcement.
- Require RLS and verify that its policies authorize only the intended reads and writes. Never expose secret or service-role keys in the browser.
- Do not invent SQL, tables, columns, or schema. Inspect the repository and approved requirements first.

## Decision Gates
- If any enrollment policy is unresolved, document the choice needed and pause that behavior; do not encode a default.
- If policy is resolved, verify an authoritative atomic enforcement design and matching RLS before changing the client flow.

## Execution Steps
1. Read [project instructions](../../../AGENTS.md), the current Supabase client, and relevant requirements.
2. List resolved rules and unresolved product choices; ask for decisions where needed.
3. Implement only approved rules using server/database enforcement and least-privilege RLS; keep client checks for user feedback only.
4. Add tests for full-capacity rejection and concurrent enrollment, plus applicable duplicate and authorization cases.
5. Run the relevant checks and report evidence without overstating guarantees.

## Output Contract
Report implemented policy, enforcement location, RLS coverage, tests run and outcomes, and remaining decisions or limitations. Mark unresolved behavior as not implemented.

## References
- [Project instructions](../../../AGENTS.md)
- [Supabase client](../../../src/lib/supabase.ts)
- [Project setup](../../../README.md)