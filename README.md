# Chemistry Play Model

An experimental, editable **2D molecular-construction sandbox** for exploring atoms, bonds, molecular sketches and illustrative interactions in a browser. This is a **capabilities preview**, not a scientifically validated chemistry simulator or a university teaching product.

## What you can try

- Enter a name or formula, inspect a schematic molecular graph, and edit atoms and bonds.
- Explore element properties, illustrative reaction controls, isotope labels, the inspector, undo/redo and the in-app reference.
- Four documented examples: `H2O`, `CO2`, `glucose` and `ethanol` (see [instructor preview](docs/INSTRUCTOR_PREVIEW.md)).
- The main controls and reference path are in English. Some inherited Russian catalog descriptions remain and are explicitly marked as untranslated.

**Important scientific limits:** the displayed stability percentage is a rule-based heuristic, not experimental or thermodynamic stability. Layout strain is not physical energy. A formula alone cannot determine a unique molecular structure or stereochemistry. Reaction, coordination, isotope and biomolecular examples are sketches, not validated predictions. Do not use the tool for laboratory, medical or other safety-critical decisions or as an approved student curriculum.

## Try it locally

Requires Node.js 22 or later; no runtime npm dependencies or bundler.

1. Clone this repository and switch to the branch containing the latest sandbox implementation.
2. Run `npm run preview`.
3. Open the local URL printed by the server (normally `http://127.0.0.1:4180/`).

The preview is served only on the machine that starts it. A remote site URL exists **only after** GitHub Pages is separately enabled and confirmed; local test URLs and GitHub Actions success do not create a public site.

Software checks: `npm test`, `npm run test:transfer`, and `npm run test:browser` when a compatible browser test environment is available. Passing these checks verifies selected implementation behavior, **not** chemical accuracy. A direct `file://` launch is not the supported entry path.

## Source structure

- `src/chemistry/`: input interpretation, builders, properties and illustrative reactions.
- `src/simulation/`: molecular graph, mutations, history and update orchestration.
- `src/physics/`, `src/render/`, `src/ui/`: educational layout, rendering and user interface.
- `src/services/`: local dictionaries and optional PubChem/RDKit integrations.
- `src/data/` and `data/`: built-in and inherited substance/element data.
- `audio/`, `vendor/`: local sound effects and icons.

PubChem lookup transmits the requested query to an external service; RDKit may load an external library on demand. These are optional, not required for the four local walkthroughs.

## Review and rights

The project is intended for exploratory feedback on **capabilities, usability and educational possibilities**. A chemistry instructor may advise on examples and scientific limitations; no academic institution has endorsed the tool. A user-visible example is not evidence of educational effectiveness.

See [known limitations](docs/KNOWN_LIMITATIONS.md), [scientific review](docs/SCIENTIFIC_REVIEW.md), and [source and rights status](docs/PROVENANCE_AND_LICENSES.md). Some data provenance remains open. The included Lucide license notices must accompany any redistribution of those icons. Sound assets are described as procedurally generated in `audio/README.md`; that assertion is not independently verified here.

Public availability of source code does **not** by itself grant permission to reuse it. No general open-source code or dataset license has been selected for this repository; third-party notices apply to their respective materials.

## Project governance

The owner controls publication, licensing and external commitments. Historical recovery documentation reflects earlier private engineering stages, not current scientific validation or release approval. Technical source of truth is the Git commit and its associated software checks.
