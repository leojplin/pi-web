---
name: changeset-changelog
description: Use this skill whenever the user asks about changelogs, Changesets, release notes, conventional commits, commit messages for release notes, or making user-visible project changes that should appear in a future npm/GitHub release. Trigger when preparing commits or PRs that include features, fixes, docs users rely on, package behavior changes, CLI changes, install changes, or release process changes. This skill keeps CHANGELOG.md generated at release time instead of manually edited during development.
---

# Changeset changelog workflow

This project uses Changesets so release notes are collected as small per-change markdown files during development and converted into `CHANGELOG.md` during release prep. This avoids multiple branches editing the same `CHANGELOG.md` section.

## Core rules

- For user-visible changes, add a `.changeset/*.md` fragment.
- Do not manually edit `CHANGELOG.md` during normal feature/fix work. Let `changeset version` generate or update it during release prep.
- Use Conventional Commit style for commit messages when committing, but do not rely on commit messages as the only changelog source.
- Write release notes for users, not as raw implementation logs.

## When a changeset is needed

Create a changeset for changes that affect users, operators, package consumers, or release/install behavior, including:

- New features or UI behavior
- Bug fixes users can observe
- CLI, package exports, install, service, or configuration changes
- Documentation users rely on for setup or usage
- Dependency/runtime requirement changes
- Release-process changes that future maintainers need to see

A changeset is usually not needed for purely internal refactors, tests, lint-only changes, build cleanup, or agent-only project skills unless the user wants them recorded. When in doubt, ask briefly or create a patch changeset with a clear note.

## How to create a changeset

Prefer the CLI when interaction is practical:

```bash
npm run changeset
```

For non-interactive agent work, create a file manually under `.changeset/` with a unique kebab-case name:

```md
---
"@jmfederico/pi-web": patch
---

Fix session command handling so browser/API restarts do not interrupt active Pi sessions.
```

Use the package name from `package.json`; for this repo it is `@jmfederico/pi-web`.

## Choosing patch/minor/major

- `patch`: bug fixes, docs corrections, polish, release-process improvements, small compatible behavior changes.
- `minor`: new user-facing capabilities that are backward compatible.
- `major`: breaking changes to CLI, install expectations, package API, config, data formats, or supported runtime behavior.

This repo uses versions like `1.202605.3`. Changesets still uses semver bump types. Routine releases are normally patch-level increments unless the user asks otherwise.

## Writing good changeset text

Keep entries concise and user-facing:

- Start with an imperative or past-tense summary of the user impact.
- Mention the affected area when useful: sessions, web UI, CLI, install, extensions, release workflow.
- Avoid internal-only details like file names unless they help users.
- Avoid vague notes like “misc fixes” or “update code”.

Good examples:

```md
Preserve active Pi sessions when the web/API development service restarts.
```

```md
Add a project-local release workflow skill that publishes npm packages through GitHub Actions instead of local publishing.
```

Poor examples:

```md
Changed sessionCommandService.ts.
```

```md
Fix stuff.
```

## Conventional Commit guidance

When asked to commit, use Conventional Commit style:

- `feat: add persistent session reconnect handling`
- `fix: preserve queued commands across API restarts`
- `docs: document systemd user services`
- `chore(release): v1.202605.4`

Keep commits and changesets aligned, but remember their audiences differ:

- Commit message: developer history.
- Changeset text: future release notes for users.

## Release prep handoff

During release prep, use the `npm-release-via-github-actions` skill. It should run:

```bash
npm run release:version
```

That consumes `.changeset/*.md`, updates `package.json` / lockfile versions, and generates or updates `CHANGELOG.md`. Publishing still happens only through GitHub Actions after a GitHub Release is published.
