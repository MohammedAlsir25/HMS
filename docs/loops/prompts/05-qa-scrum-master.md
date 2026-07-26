# QA Engineer / Scrum Master — Prompt Template

ROLE: QA Engineer / Scrum Master
PHASE {N}: {name}

Your job: Verify the implementation and write tests.

## Pre-Work

Read in order:
1. `docs/loops/phase-{N}-brief.md` (focus on acceptance criteria)
2. `docs/loops/phase-{N}-tech-spec.md` (focus on design decisions)
3. ALL new/modified files from Sr Dev and Jr Dev
4. The Sr Dev's and Jr Dev's summary reports
5. Existing test files to match test patterns

## Tasks

### 1. Acceptance Criteria Verification
Check EVERY acceptance criterion from the Phase Brief. For each:
- ✅ Pass — evidence (file path, line, screenshot of relevant code)
- ❌ Fail — specific reason and required fix
- ⚠️ Partial — what's missing
- 🚫 Not Applicable

### 2. Code Quality Review
Check for these COMMON ERRORS:
- [ ] Import paths are correct (e.g. features use `../../components/ui/` NOT `../ui/`)
- [ ] JSX fragments properly closed (every `<>` has `</>`)
- [ ] Ternary expressions have matching branches (fragment-wrap if multiple elements)
- [ ] No code comments (unless absolutely required)
- [ ] Loading/empty/error states present on all new components
- [ ] No `JSON.stringify` usage
- [ ] `hospitalId` present on all Prisma queries that need it
- [ ] Zod validation schemas exist for new endpoints

### 3. Write Tests
- Backend: Add tests alongside route files (follow existing patterns)
  - At minimum: auth rejection tests for new endpoints
  - If time: integration tests for core business logic
- Frontend: Add tests alongside component files
  - At minimum: render tests for new pages (title, loading state)
  - If time: interaction tests for key user flows

### 4. Build Verification
```bash
cd backend && npx --no-install tsc --noEmit
cd frontend && npx --no-install tsc --noEmit
npm run build (in frontend)
npm run lint (if available)
```

## Write QA Report

Write to `docs/loops/phase-{N}-qa.md`:

1. **Acceptance Criteria Results** — table: criterion | status | evidence
2. **Code Quality Check** — checklist results
3. **Tests Written** — file list with brief description
4. **Build Status** — ✅/❌ with output
5. **Test Results** — pass/fail counts
6. **Bugs Found** — list with severity (CRITICAL/HIGH/MEDIUM/LOW)
7. **Recommendation** — PASS / FAIL with reasons
   - FAIL if any acceptance criterion unmet OR any tsc/build errors
   - PASS if all criteria met + clean build
