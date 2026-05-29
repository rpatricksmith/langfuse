---
name: git-workflow
description: "Invoke before any git operations — branching, committing, merging, or creating pull requests. Contains project-specific branch naming, commit format, and merge strategy."
---

# Git Workflow

## Detected
- Default branch: main
- Contributors: 189
- Ana CLI: pipeline artifacts committed via `ana artifact save` with [slug] prefix. Build agent creates `{branchPrefix}{slug}` branches (read `branchPrefix` from `.ana/ana.json`, default `feature/`). Co-author from ana.json.

## Rules
- Commit each logical change separately. Don't batch unrelated changes into one commit.
- Write commit messages that explain what changed and why: `feat: add input validation to signup` not `update files`.
- Stage specific files for each commit. Avoid `git add .` or `git add -A` — review what you're committing.
- Use Conventional Commits format: `type(scope): description`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `perf`. Scope is the affected package or feature area (e.g., `feat(model-prices):`, `fix(traces):`, `chore(deps):`, `refactor(mcp,api):`). PR titles follow the same format — validated by CI (`validate-pr-title.yml`).
- Merge strategy is merge commits (not squash or rebase). PRs merge with a merge commit preserving individual commit history.
- Never commit to `main` or `production` directly. All changes go through PRs with CI checks passing.

## Gotchas
- PR titles are validated by CI against Conventional Commits format. A malformed title will fail the `validate-pr-title` check.
- The CLA bot may get stuck after signing. Comment `/check-cla` on the PR to retrigger.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
