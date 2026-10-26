# Observed architecture

Status: implementation inventory, not a scientific specification.

The 2026-10-04 monolith was split into 41 JavaScript files under src (including baseline). This transfer preserves application source bytes; packaging/test portability changes are listed separately.

## Runtime

index.html loads the inherited dictionary, vendored Lucide, and src/main.js as ES modules. main wires controls, workspace, initial benzene, data loading, and the frame loop. src/state.js owns mutable state, usually imported as labState.

| Area | Responsibility | Important boundary |
| --- | --- | --- |
| physics/spring-layout.js | Springs, pair repulsion, damped layout | No DOM, state import, chemistry, or renderer |
| simulation/step.js | Adapts chemistry parameters to layout | Educational geometry only |
| simulation/{graph,molecule,history,fragments,update}.js | Graph mutations, snapshots, orchestration | Deep history/import contracts need more tests |
| chemistry/{formula,smiles,builders,coordination,reactions,properties,analysis,description,elements}.js | Composition, structure sketches and heuristics | Not a validated chemistry engine |
| render/* | SVG generation, camera, effects, loop | Reads state and invokes presentation |
| ui/* | Controls, inspector, reference and layout | Must not become scientific authority |
| services/* | JSON, PubChem and RDKit adapters | Optional online work, not automatic validation |
| data/* and src/data/* | Dictionaries and defaults | Scientific provenance incomplete |

## Data flow and coupling

A control mutates labState through builders or graph helpers, calls analyzeAndRender, then logs a reaction/effect. The update computes analysis, renders SVG and inspector, and records history.

Physics separation is real and tested. Full layered separation is NOT complete: chemistry modules import UI/renderer helpers, catalogs hold executable callbacks, and imports contain cycles. A pure domain-command/result layer, separate analysis, and UI adapters are proposed next steps, not completed work.

## Persistence and network

Workspace dimensions use localStorage. Model export/import uses local JSON; SVG export is local. The preview server is host-local and read-only. It is not cloud hosting.

PubChem receives an explicit lookup query. RDKit is loaded on demand from an unversioned CDN. The current checker is based on the recorded SMILES, not a replacement for authoritative full edited-graph validation.

## Tests

src/dev/baseline.js checks the layout and import/encoding basics. tests/transfer.test.js checks packaging/serving boundaries. tools/browser-smoke.cjs exercises the inherited UI offline. Browser/system availability and chemistry acceptance are separate statuses.

See KNOWN_LIMITATIONS.md for concrete misleading scientific behaviors and PROVENANCE_AND_LICENSES.md before redistribution.
