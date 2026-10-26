# Cloud setup and handoff

## Status boundary

The GitHub repository and the Drive recovery library remove the laptop as the sole source of files. A cloud environment still needs to be created, tested, and published in the owner's account. This packet does not certify that step has occurred.

## Operator steps

In Codex choose Work in > Cloud, create/select an environment using sergey-morev/Draft-Chemistry-play-model, review its preparation, then publish it privately. Start a new task only after the environment is reported published. Do not broaden collaborators or repository visibility.

Primary platform reference, opened 2026-10-25: https://learn.chatgpt.com/docs/environments/cloud-environments. Product access and capabilities must be checked in the actual account, not inferred from this document.

## Project-specific preparation

- Node.js 22 or newer; no runtime package dependencies, credentials, API keys, GPU, DLLs or local user profile required.
- Run npm test and npm run test:transfer.
- For preview run npm run preview and check the printed localhost URL. Do not assume a preview is publicly hosted.
- For browser smoke, use a supported headless test browser and installed Playwright. Browser/computer-use capabilities differ by cloud product; if unavailable, record NOT_RUN and do not claim screenshot validation.
- Default agent network should remain restrictive. Core tests are offline. RDKit CDN and PubChem are optional and not required to bootstrap.
- The Drive connector is not assumed to exist in a new environment. If unavailable, use the frozen snapshot honestly and request current PM state before state-sensitive actions.

## Cold-start acceptance

A fresh contour must identify mission, owner, actual commit, current phase, next gate, unknowns, scientific limits, evidence paths, and sole LIVE authority without this original chat. Run tests from a clean checkout; record runtime/OS, exact commands, outputs, failures and artifact hashes.

## First task prompt

Use docs/FIRST_CLOUD_TASK.md. It is a bounded recovery/verification task, not an instruction to declare the project complete.
