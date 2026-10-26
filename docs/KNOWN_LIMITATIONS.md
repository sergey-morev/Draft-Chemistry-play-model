# Known limitations and risks

Status: observed implementation risks / REVIEW_REQUIRED. Not an exhaustive independent audit.

| ID | Priority | Observed source or behavior | Consequence / next acceptance gate |
| --- | --- | --- | --- |
| SCI-01 | P0 before students | src/chemistry/analysis.js and utils/format.js score valence/charge/strain | A percentage labeled stable is not Gibbs energy, kinetic persistence or experimental stability. Rename/qualify; instructor accepts terminology. |
| SCI-02 | P0 | src/data/elements.js uses an atomic-number-based mass fallback and inferred parameters | Values can be invented rather than measured. Replace with attributed, reviewed data; no numeric precision without provenance. |
| SCI-03 | P0 | chemistry/builders.js and formula.js infer structure/name from composition | C6H12O6 does not uniquely mean glucose. Require graph/stereochemistry or an explicitly named reference. |
| SCI-04 | P0 | chemistry/smiles.js is a limited hand-written parser | Stereochemistry, aromaticity, charged/bracket atoms and isotopes require robust validation. Test supported grammar and reject unsupported cases explicitly. |
| SCI-05 | P0 | chemistry/coordination.js and simulation/graph.js allow generic metal-in-cavity sketches | Not evidence a real complex exists or is stable; coordination number, charge and oxidation state must be distinguished. |
| SCI-06 | P0 | chemistry/reactions.js applies selected transformations | Not a reaction predictor. Reagents, solvent, phase, equilibrium, stoichiometry and conditions need source-backed teaching cases. |
| SCI-07 | P0 | isotope controls shift A and interpolate mass | An individual nucleus is not an enrichment mixture. Nuclear stability/decay is not inferred correctly by shifting mass number. |
| SCI-08 | P0 | protein/polysaccharide/hemoglobin/radioligand builders use sketches or proxies | Formula/composition is not a validated biomolecular structure. Fe-to-Cu substitution does not establish a biological analogue. |
| SCI-09 | P0 | nuclearConceptDemo and radiopharma/delivery effects | Illustrative animation only; not reactor physics, dosimetry, cellular targeting or treatment prediction. Keep out of default student mode until scoped. |
| SCI-10 | P0 | services/rdkit.js checks metadata SMILES | A green check must distinguish parse success, reference-SMILES validation, and verification of the currently edited graph. |
| ENG-01 | P1 | chemistry/UI imports are cyclic | Extract domain commands/results; preserve regression behavior before scientific changes. |
| ENG-02 | P1 | no English locale layer; dictionaries predominantly Russian | Build English UI/reference data with reviewed terminology; no blind mass replacement. |
| ENG-03 | P1 | unpinned RDKit CDN; optional API | Pin/vend JS+WASM with hashes/license, timeouts and explicit network consent; retain offline mode. |
| ENG-04 | P1 | duplicated common dictionary JSON/JS and extensive legacy CSS | Define one generation source and simplify styles only with regression evidence. |
| ENG-05 | P1 | browser tests cover only selected scenarios | Add parser fixtures, atom/charge/bond conservation, undo isolation, rejected import robustness, accessibility and performance tests. |
| LEGAL-01 | P0 before public | legacy source metadata includes unverified CC0/CC0-style claims | Those labels are not a new rights audit. Review each copied/generated asset and dataset before choosing licenses. |
| GOV-01 | P0 before students | instructor agreement is owner-reported; identity/articles not received | Record the scope and written acceptance; do not claim university approval. |

P0 here means a barrier to teaching/public claims, not necessarily a software exploit. The private prototype is preserved so each change can be reviewed independently.
