# Issue tracker: GitHub

Issues and specs for this repository live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards. Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: Use GitHub's native issue dependencies. Add an edge with `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>`. Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- **Close**: Post the explanation with `gh issue comment <number> --body "..."`, then `gh issue close <number>`.

Infer the repository from `git remote -v`; `gh` does this automatically when run inside a clone. Before the first issue creation in a session, verify the target with `gh repo view --json nameWithOwner` and do not file issues in another repository.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if this repository starts treating external PRs as feature requests.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it with `gh issue view <number> --json number,title,body,labels,comments`.

## Wayfinding operations

Used by `/wayfinder`. The map is a single issue with child issues as tickets. Use GitHub sub-issues where available; otherwise add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Represent blocking with native issue dependencies where available, or a `Blocked by` line as a fallback.
