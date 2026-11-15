---
name: review-changes
description: Thorough review of all uncommitted and staged changes, or of the whole branch with the argument `branch` (correctness, rules, design, tests, docs). Review only, no code changes.
argument-hint: "[branch]"
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git status:*) Bash(git diff:*) Bash(git log:*)
---

Act as a senior TypeScript/React/Three.js engineer reviewing all changed code in this repository. **Review only: do not write or change code.**

## Input

The scope depends on `$ARGUMENTS`:

- **No argument:** the uncommitted work. Get the changes with `git status` and `git diff HEAD` (staged and unstaged). Include untracked files from `git status`.
- **`branch`:** everything the current branch adds to `main`, as it would appear in a pull request. Get the changes with `git diff main...HEAD` and the intent with `git log main..HEAD`. Also include uncommitted changes from `git status` and `git diff HEAD`, and say in the summary that they are not yet committed.

Review **every** changed file, however small. For each, also read the surrounding code, related types and callers (use Grep).

## Checklist

Assess each item for every changed file; skip an item only if clearly not applicable.

1. **Correctness:** logic for normal and edge inputs; units and coordinate spaces (scene units, UV space, canvas pixels); return values, `undefined` and index access; silent state corruption.
2. **Design rules:** changed behaviour matches `docs/plans/Requirements.md`; nothing invented.
3. **Layering:** `ui → scene → core`, `ui → data → core`. Core has no React, Three.js, Firebase or DOM imports. No rules in components or the scene.
4. **Immutability:** core functions never mutate their arguments; React state is replaced, not mutated.
5. **Resources:** Three.js geometries, materials, textures and canvases created outside JSX are disposed; event listeners and subscriptions (Firebase, pointer) are removed on unmount.
6. **Performance:** no React state updates per frame; `invalidate()` instead of continuous rendering; no allocations in `useFrame`; texture sizes suit phones.
7. **Async and errors:** no unhandled promises; no empty or swallowed `catch`; network and auth failures shown to the user in Dutch.
8. **Security and privacy:** Firestore/Storage rules still allow only the owner's account; no secrets committed; no analytics or third-party scripts; asset licences recorded.
9. **Tests:** new logic covered in `tests/`; changed behaviour has updated tests; bug fixes have a regression test that failed before the fix.
10. **Documentation:** README, `CLAUDE.md`, `docs/plans/` and `docs/tracking/Defects.md` still match the code.
11. **UI:** user-facing text is Dutch and suits a 12-year-old; works with touch and mouse at phone and laptop size; controls have accessible names.
12. **Readability:** clear names consistent with the codebase; no magic values; no dead code or unused exports.

## Output

1. **Summary:** 3-5 bullets on overall quality and risk, critical issues, test status, documentation status.
2. **Findings table**, sorted Critical → High → Medium → Low:

   | Severity | Category | File / Location | Description | Risk / Impact | Recommendation |
   |---|---|---|---|---|---|

   Category is one of the checklist names above. Location is the relative path plus function/component.
3. **What looks good:** 3-5 concrete points, no generic praise.
4. **Must fix before merge:** numbered checklist of all Critical and High findings.

## Constraints

- Report only problems you can infer from the visible code and context; do not invent issues.
- Consolidate findings with the same root cause instead of repeating them per file.
- For a clean category, state: "No issues found in this category."
