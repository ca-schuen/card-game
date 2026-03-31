---
agent: Organizer
description: "Start full local multi-agent feature flow: create issue, plan, implement with specialist agents, enforce tests/CI, and prepare PR"
tools: [read, search, edit, execute, todo, agent]
---
Start a complete feature delivery workflow for this repository.

Feature request:
${input:feature_request:Describe the feature in 1-3 paragraphs}

Constraints:
${input:constraints:Any constraints, dependencies, or deadlines}

Requirements:
1. Use Organizer workflow from `.github/agents/organizer.agent.md`.
2. Create a GitHub issue first.
3. Delegate planning, implementation, testing, and CI to specialist agents.
4. Require passing local checks and CI checks before PR creation.
5. Open a PR ready for human approval.
