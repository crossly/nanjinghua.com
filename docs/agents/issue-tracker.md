# Issue Tracker: GitHub

Issues and specifications for this repository live in GitHub Issues. Use the `gh` CLI from this repository for issue operations.

## Conventions

- Create an issue with `gh issue create` and apply its final triage label when it is ready.
- Read an issue with `gh issue view <number> --comments`.
- List issues with `gh issue list`, scoped by state and label as needed.
- Comment with `gh issue comment <number>`.
- Update labels with `gh issue edit <number> --add-label` or `--remove-label`.
- Close an issue with `gh issue close <number>` after recording the outcome in a comment when useful.

## Pull Requests

External pull requests are not a request surface for triage. Do not treat them as incoming work unless the project owner explicitly changes this convention.

## Publishing

When a skill says to publish a specification or task to the issue tracker, create a GitHub issue in this repository.
