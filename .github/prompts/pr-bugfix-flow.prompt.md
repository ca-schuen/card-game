---
agent: Organizer
description: "Handle post-PR bugs or quality concerns: triage feedback, implement fixes, rerun quality gates, and update PR"
tools: [read, search, edit, execute, todo, agent]
---
Run a correction workflow for a checked-out PR branch when issues are found after `/new-feature-flow`.

Context:
${input:context:What did you find? Include bug details, expected behavior, and why the current result is not acceptable.}

Optional PR metadata:
${input:pr_context:PR number/link, branch, related issue, screenshots, logs, and repro steps if available.}

Requirements:
1. Use Organizer workflow from `.github/agents/organizer.agent.md`, correction mode.
2. Triage and restate concerns as explicit acceptance criteria deltas.
3. Reproduce the issue locally before changing code when possible.
4. Delegate implementation and tests to specialist agents as needed.
5. Keep all fixes on the currently checked-out branch unless instructed otherwise.
6. Run local checks (`npm run lint`, `npm run test`) before handoff.
7. Ask `Ops CI Engineer` to verify CI/check status and summarize readiness.
8. Provide a concise "what changed" and "what remains" report for PR follow-up.
