# Project Instructions

## Architecture
- This is a static frontend built with React, TypeScript, and Vite.
- Supabase is the authoritative system for any future enrollment-capacity enforcement.
- Never expose a Supabase secret or service-role key in browser code or public configuration.

## Business Boundaries
- Student registration, enrollment, capacity, and related business rules are intentionally not implemented yet.
- Do not invent capacity limits, duplicate-enrollment behavior, multi-TP enrollment rules, or waitlist behavior.
- Client-side checks may improve the interface but cannot enforce enrollment limits.

## Quality Commands
- `npm run lint`
- `npm run test -- --run`
- `npm run typecheck`
- `npm run build`

## Skill Registry
- [Supabase capacity implementation guidance](.github/skills/supabase-capacity/SKILL.md): use for TP enrollment, capacity, concurrency, and RLS work.