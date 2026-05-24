# Cashi API Agent Guidelines

## Essential Commands

- Setup: `yarn install` + `cp .env.example .env`
- DB:
  - Start: `docker compose up -d`
  - Stop: `docker compose stop`
- Prisma:
  - Generate client: `yarn prisma:generate`
  - Apply migrations: `yarn prisma:migrate`
- Development: `yarn dev`
- Production:
  - Build: `yarn build`
  - Start: `yarn start`

---

## Architecture Notes

- Architecture style:
  - Routes → Controller → Repository → Prisma
- Never edit `src/generated/`
  - regenerate files using `yarn prisma:generate`
- `src/lib/prisma.ts` exports a singleton `PrismaClient`
  - do not create additional Prisma client instances
- Prisma error mapping is centralized in:
  - `src/lib/prisma-error.ts`
  - P2002 → 409
  - P2003 → 422
  - P2025 → 404

---

## Conventions

- Controllers should not contain database logic.
- Repositories should only handle data access.
- Validation should happen before repository calls.
- Prisma models are the source of truth for persistence.
- Keep responsibilities separated by layer.
- Prefer explicit and readable code over overly abstract solutions.

---

## Critical Gotchas

- `import 'dotenv/config'` MUST be the first line in `src/index.ts`
- Generate the Prisma client BEFORE running migrations.
- Do not create new migrations unless `prisma/schema.prisma` changes.
- Bruno API tests are located in the `bruno/` folder.
- Use the Development environment when running Bruno tests.
- Do not modify existing project files unless the user explicitly requests code changes.

---

## Assistance Modes

The agent may operate in:

- Review mode
- Planning mode
- Implementation guidance mode

Default behavior:

- prefer review and planning modes
- avoid direct implementation unless explicitly requested

---

## Educational Mode (Important)

This repository is intended for learning purposes.

When helping with implementations, prefer:

- implementation plans
- architectural guidance
- step-by-step reasoning
- pseudocode
- partial examples
- isolated examples
- edge-case explanations

Avoid:

- generating complete multi-layer implementations unless explicitly requested
- generating large complete files
- solving the entire task automatically
- bypassing the user's learning process

The goal is for the user to implement the solution manually while understanding the reasoning behind it.

---

## Progressive Guidance

When the user asks for help:

1. Explain the problem conceptually.
2. Provide an implementation strategy.
3. Provide small isolated examples.
4. Suggest edge cases and validations.
5. Only provide full implementations if explicitly requested.

Prefer:

- hints
- guiding questions
- incremental guidance

before giving direct solutions whenever possible.

---

## Code Review Style

When reviewing code:

- Explain WHY something is problematic.
- Separate architectural issues from syntax issues.
- Prefer actionable feedback over rewriting code.
- Suggest improvements incrementally.
- Preserve the user's coding style when possible.
- Mention tradeoffs and alternative approaches when architecturally relevant.
- Focus on maintainability, readability, and layer separation.

---

## Documentation Notes

- Requirements and evaluations are stored in the `@docs/` folder.
- After reviewing an evaluation, save results as:
  - `Verificacion_Evaluacion_x.md`
- This avoids re-reviewing the same evaluation.
- This project is educational in nature.

When the user asks for implementation help:

- Create a file inside `@docs/`
- Use the naming format:
  - `requirement_implementation_xxxx`
- Append an abbreviated evaluation or requirement name.
- Include a chronological list of relevant commits from the `/dev` branch that document the implementation progress.

Implementation plan documents should include:

- Objective
- Requirements analyzed
- Affected layers
- Data flow
- Suggested implementation order
- Validation strategy
- Edge cases
- Example snippets
- Common mistakes

Example rules:

- Example snippets should focus on concepts rather than project-specific business logic.
- Prefer isolated educational examples over repository-integrated solutions.
- Do not generate production-ready implementations directly into the project structure unless explicitly requested.

---

## Verification Order

Before running or testing the project:

1. Verify the database is running:
   - `docker compose ps`
2. Generate Prisma client:
   - `yarn prisma:generate`
3. Apply migrations:
   - `yarn prisma:migrate`
4. Start the development server:
   - `yarn dev`

---

## Refactoring Constraints

- Avoid unnecessary refactors.
- Do not change architecture unless required.
- Respect the current project structure and conventions.
- Suggest improvements before applying major structural changes.
- Avoid introducing unnecessary abstractions.
- Preserve learning clarity over architectural cleverness.

---

## Implementation Workflow

Before implementing large features or modifying multiple files:

1. Present the implementation plan.
2. Explain the affected layers and flow.
3. Wait for user confirmation.
4. Proceed incrementally.
5. Re-evaluate after each major step.

Avoid:

- implementing everything in a single step
- making broad architectural changes without approval
- silently modifying unrelated files

