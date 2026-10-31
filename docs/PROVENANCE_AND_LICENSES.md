# Source, assets, and redistribution review

Status: **partial release audit; rights not fully cleared**. This note distinguishes observed repository evidence, owner/source assertions, and remaining verification. It does not choose a new license, grant rights in third-party content, or establish chemical accuracy.

## Observed components and attribution

- **Application code, HTML and CSS:** project-developed prototype. The owner decides whether and on what terms to publish and license this code. No project-wide LICENSE has been selected.
- **Lucide icons:** the vendored JavaScript file header identifies `lucide v1.8.0 - ISC`; `vendor/LUCIDE-LICENSE.txt` includes Lucide's ISC notice and Feather-derived icons' MIT notice. The text is consistent with the official [Lucide license](https://github.com/lucide-icons/lucide/blob/main/LICENSE). Keep **both the vendored artifact and its notices** together in a distributed package. The exact compiled bundle's upstream integrity/origin has not been independently reproduced from a versioned release; that verification remains open.
- **WAV effects:** `audio/README.md` says the seven WAV files were procedurally generated for this project, with CC0 intent, and not copied from OpenGameArt/Kenney. This is a project-file assertion, **not independently established author/provenance evidence**. A public release should obtain an owner/creator attestation or exclude sound with a tested no-audio configuration.
- **Local data and scientific copy:** `src/data/elements.js`, `src/data/catalogs.js`, `data/element-overrides.json`, `data/reactions.json`, `data/substances.ru.json`, `data/substances.common.ru.json` and its offline JS equivalent hold curated or inherited records. `data/sources.json` calls some short explanations original and labels the common dictionary a "CC0-1.0 style educational dataset for this project"; **"CC0 style" is not a confirmed legal license or chain of title**. Record-level authorship/source/version review is not complete. Factual numbers and formulas also have independent scientific accuracy issues.
- **Candidate external sources:** Bowserinator's periodic table, Global-Chem, ChEBI, OpenGameArt and Kenney are listed as *candidates* in `data/sources.json`. Their presence as links is **not proof of incorporation**. The IAEA/NCI/FDA links are marked reference-only, not redistributable paper/article content. Any newly copied records require their own attributable source/licensing checks.
- **Optional external calls:** PubChem sends a user-provided query to a third party; RDKit may load code from an external CDN on explicit request. These are opt-in features and do not establish scientific validation. Review availability, privacy notices, versions and third-party terms before a wider release.

## Exposure and history

A public GitHub repository exposes current files, **previous Git commits**, commit metadata, issues/PRs and available workflow logs. Removing a link in a new commit does not erase it from previous commits. An earlier README contained links to the owner's private Google Drive Project Anchor, LIVE and Router; the current README omits them, but historical copies remain reachable if this *existing* repository is changed to Public. A restricted Drive permission check on 2026-10-31 returned owner-only access for those three files; no token or secret is implied by the link itself. This is a point-in-time check, not a security guarantee.

A bounded text inspection of current repository files and PR discussion found no obvious passwords, access-token literals, patient/student data or private instructor papers. This was **not** an exhaustive independent secrets audit of every Git object, build log, or historical artifact. Prior project status and governance documents are not confidential merely by being technical, but would also become public as part of the repository.

## Publication decision still required

1. Owner accepts public disclosure of the **existing repository and its full history**, or chooses a fresh curated public repository to avoid exposing historical engineering context. No history rewriting, force-pushing or license selection occurs as part of this audit.
2. Obtain sufficient rights/creator confirmation for the actually distributed sound files and substance/element/reaction records, or prepare and regression-test a curated package that excludes/replaces uncertain material. Verify exact Lucide artifact provenance; preserve ISC/MIT notices.
3. Disclose the **partial English** status and illustrative/non-validated chemistry limitations. Do not describe university affiliation, accepted coursework or clinical/laboratory reliability.
4. Only after the chosen exposure and material-rights decision, enable GitHub Pages and test the public URL. Static client JS and data are visible to all visitors; a hidden/unlisted link is not access control.

**Current disposition: SOURCE_CLEANUP_IN_PROGRESS / PUBLICATION_NOT_YET_AUTHORIZED_BY_A_COMPLETED_RIGHTS_GATE.** A successful local `/demo/` test and CI PASS are software evidence, not licensing evidence.
