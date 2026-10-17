---
name: livex-watch
description: Run one tick of the livex-dev agent, which watches the Trello LIVEX board — develops cards moved to IN PROGRESS and talks to the user through card comments. Use with /loop (e.g. "/loop 5m /livex-watch") to keep watching, or run once to check the board now.
argument-hint: "(no arguments)"
allowed-tools: Agent, Bash
---

# LIVEX Watch — livex-watch

Launches one tick of the `livex-dev` agent (`.claude/agents/livex-dev.md`).

1. If `.git/livex-dev.lock` exists and is younger than 90 minutes, print `livex-watch: previous tick still running — skipped.` and stop.
2. Spawn the agent: `Agent` with `subagent_type: "livex-dev"`, `description: "LIVEX board tick"`, prompt: `Run one tick.`
3. When it reports back, print its one-line summary only (e.g. `livex-dev: LV#25 → DONE`). Don't repeat card contents in the terminal — the conversation with the user happens in Trello comments.

To stop watching, cancel the loop.
