# Intake cleanup disposition

The original working directory is not deleted or rewritten. A complete inventory and recovery ZIP are retained outside the Git payload.

Included in the private draft: src/, data/, audio/, vendor/, minimal HTML/CSS entry, portable preview/tests, English docs, governance pointer, basic CI definition.

Excluded from Git: portfolio copies, old snapshots/ZIPs, screenshots, logs, one-time migration scripts, the old packaging script with machine-specific package paths, private scientific materials and workstation settings.

The source and dictionaries remain prototype data. Keeping them preserves behavior; it does not approve every feature for teaching. Runtime semantic cleanup, English translation, dataset review and student-mode reduction are separate gated work packages.

English docs replace duplicated historical technical summaries in the draft repository. The original Russian documentation remains preserved on private Drive. Drive LIVE remains the only mutable PM current-state object; HANDOFF_SNAPSHOT is explicitly frozen.

Portability changes in the staging copy: browser dependency/executable paths are environment-configurable; test output is ignored test-results/; Windows launcher uses Node on PATH; preview serves runtime resources only and supports an ephemeral port for tests.

No student dataset, credentials, private correspondence, instructor articles, collaborator invitations, or public hosting are included. No third-party license has been silently changed.
