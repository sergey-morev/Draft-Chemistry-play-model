# Chemistry Play Model

**Private draft. Research and teaching prototype; not approved for student use.**

An editable 2D molecular sandbox: atoms, bonds, rings, formula/name input, a limited SMILES parser, coordination sketches, illustrative reactions, isotope controls, undo/redo, and an inspector.

The owner has requested a transition to an English-language university teaching tool, with a chemistry instructor as a prospective reviewer. This is an owner-reported collaboration, not institutional endorsement or completed scientific review. The instructor's identity, scope, references, and formal role are not yet recorded.

## Start

Requires Node.js 22 or newer. No runtime npm dependencies or build step.

```sh
npm test
npm run test:transfer
npm run preview
```

Open the localhost URL printed by the server, normally http://127.0.0.1:4180/. The server stays local to its host; file:// is not supported. On Windows, the included .bat launcher uses Node on PATH.

Browser checks are optional: install an exact reviewed Playwright version in the test environment, install its Chromium, then run `npm run test:browser`. Locally observed Playwright: 1.62.1. Use PLAYWRIGHT_MODULE and CHEMISTRY_BROWSER_EXECUTABLE only when your test environment needs alternate paths; no laptop path is embedded.

## Status and evidence

The current interface and inherited dictionaries are predominantly **Russian**. English translation and scientific cleanup are pending. English documentation must not be mistaken for an English application.

The scene uses a graph layout, not molecular dynamics. The displayed percentage is a heuristic, not thermodynamic stability; the strain value is not a measured energy. Formula alone does not identify an isomer. Some structures, masses, isotopes, reactions, proteins, and metal complexes are approximations or placeholders.

See [known limitations](docs/KNOWN_LIMITATIONS.md), [scientific review](docs/SCIENTIFIC_REVIEW.md), [architecture](docs/ARCHITECTURE.md), and [licensing](docs/PROVENANCE_AND_LICENSES.md). A passing software test is not scientific acceptance.

## Source map

- `src/chemistry/`: parsing, builders, reactions, properties, analysis.
- `src/physics/`: DOM-free spring layout.
- `src/simulation/`: graph, history, fragments, update orchestration.
- `src/render/`: SVG, camera, effects, frames.
- `src/ui/`: controls, inspector, reference dialog, workspace.
- `src/services/`: local databases and optional PubChem/RDKit.
- `src/data/`, `data/`: inherited dictionaries and element parameters.
- `src/audio/`, `audio/`, `vendor/`: sound and local third-party icons.
- `tests/`, `src/dev/`, `tools/`: verification and local preview.

The payload intentionally excludes laptop logs, old ZIPs, duplicate PM files, screenshots, and one-time migration scripts. Those remain in the private Drive recovery library.

## Recovery and authority

Owner: Sergey Morev. Owner decides scope, collaborators, visibility, licensing, and release. Contributor/model suggestions remain PROPOSED.

Code truth belongs to the verified Git commit in this repository. The **sole mutable PM current state** is [CURRENT_STATE_LIVE on Drive](https://drive.google.com/file/d/12zAdjep7DVFZ9xf5g9uAdeXwd5TklRjY/view). Start with [the Project Anchor](https://drive.google.com/file/d/19wiMajvhvYhNrE8UQeGHpoPfZjjc0M6P/view), then LIVE, and activate other records using [the Router](https://drive.google.com/file/d/1ualr8W-ylQFr6UT1A8t_ruZd4aaa_K3t/view).

If Drive is unavailable, read [the frozen handoff](docs/HANDOFF_SNAPSHOT.md) and report its age. Do not treat it as live authority. Do not authorize student deployment, scientific acceptance, sharing, or public release from a stale snapshot.

The operating rules are adapted from [Allocortex](https://github.com/sergey-morev/allocortex), inspected at commit 5ad6e6388cc3faafce9f02bd80f57cd3789dc205. No dependency on another private project's governance is required.

## Cloud handoff

[Cloud setup and recovery](docs/CLOUD_RUNBOOK.md) explains the remaining environment step. Source availability on GitHub/Drive does not prove an environment has been published or a cloud task has run.

Do not change this repository to public. First complete the release gates and obtain fresh owner authorization.
