import { analyzeMolecule } from "../chemistry/analysis.js";
import { describeCompound } from "../chemistry/description.js";
import { elementStateDescription, elementStudyTips } from "../chemistry/elements.js";
import { findKnownSubstance } from "../chemistry/formula.js";
import { isotopeLabel } from "../chemistry/properties.js";
import { guideTopics } from "../data/catalogs.js";
import { bondHasSymbols, getAtom, getElement } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { referenceBody, referenceDialog, referenceModal, referenceTitle } from "./dom.js";
import { displayFormula, renderExternalCheck, renderForceFieldCheck, renderRdkitCheck } from "./inspector.js";
import { clamp, escapeHtml, formatNumber, signed } from "../utils/format.js";

export function openReferenceModal() {
  const analysis = labState.lastAnalysis || analyzeMolecule();
  referenceTitle.textContent = referenceText(labState.compoundMeta?.commonName || displayFormula(analysis) || "Substance properties");
  referenceBody.innerHTML = buildReferenceGuide(analysis);
  referenceModal.hidden = false;
}

export function closeReferenceModal() {
  referenceModal.hidden = true;
}

export function startReferenceResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const rect = referenceDialog.getBoundingClientRect();
  referenceDialog.style.position = "absolute";
  referenceDialog.style.left = `${rect.left}px`;
  referenceDialog.style.top = `${rect.top}px`;
  labState.referenceResizeState = {
    edge: event.currentTarget.dataset.resize,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
    startLeft: rect.left,
    startTop: rect.top
  };
  referenceDialog.setPointerCapture?.(event.pointerId);
}

export function resizeReferenceDialog(event) {
  if (!labState.referenceResizeState) return;
  const dx = event.clientX - labState.referenceResizeState.startX;
  const dy = event.clientY - labState.referenceResizeState.startY;
  const edge = labState.referenceResizeState.edge;
  const minW = Math.min(420, window.innerWidth - 24);
  const minH = Math.min(340, window.innerHeight - 24);
  const maxW = Math.max(minW, window.innerWidth - 32);
  const maxH = Math.max(minH, window.innerHeight - 32);
  let width = labState.referenceResizeState.startWidth;
  let height = labState.referenceResizeState.startHeight;
  if (edge.includes("e")) width += dx;
  if (edge.includes("w")) width -= dx;
  if (edge.includes("s")) height += dy;
  if (edge.includes("n")) height -= dy;
  width = clamp(width, minW, maxW);
  height = clamp(height, minH, maxH);
  let left = labState.referenceResizeState.startLeft;
  let top = labState.referenceResizeState.startTop;
  if (edge.includes("w")) left += labState.referenceResizeState.startWidth - width;
  if (edge.includes("n")) top += labState.referenceResizeState.startHeight - height;
  left = clamp(left, 12, window.innerWidth - minW - 12);
  top = clamp(top, 12, window.innerHeight - minH - 12);
  referenceDialog.style.left = `${left}px`;
  referenceDialog.style.top = `${top}px`;
  referenceDialog.style.width = `${Math.min(width, window.innerWidth - left - 12)}px`;
  referenceDialog.style.height = `${Math.min(height, window.innerHeight - top - 12)}px`;
  referenceDialog.dataset.resizedAt = String(Date.now());
}

export function stopReferenceResize() {
  labState.referenceResizeState = null;
}

function referenceText(value) {
  const text = String(value ?? "");
  return /[А-Яа-яЁё]/.test(text) ? `Legacy Russian description — translation in progress: ${text}` : text;
}

export function buildReferenceGuide(analysis) {
  const preview = previewExampleGuide(analysis);
  if (preview) return preview;
  const info = describeCompound(analysis);
  const substance = labState.compoundMeta?.commonName ? labState.compoundMeta : findKnownSubstance(displayFormula(analysis));
  const selectedAtom = labState.selectedAtomIds.length === 1 ? getAtom(labState.selectedAtomIds[0]) : null;
  const selectedElement = selectedAtom ? getElement(selectedAtom.symbol) : null;
  const reactions = relevantReactionCards(analysis);
  const properties = compoundPropertyList(analysis, substance);
  const quests = experimentQuestList(analysis, substance);
  const topics = guideTopicCards(analysis);
  const rdkitBlock = renderRdkitCheck(labState.compoundMeta?.rdkit);
  const externalBlock = renderExternalCheck(labState.compoundMeta?.external);
  const forceFieldBlock = renderForceFieldCheck(analysis);
  const roleBlock = renderRoleMap();
  const atomBlock = selectedElement ? `
    <section>
      <h3>Selected element</h3>
      <p><strong>${escapeHtml(selectedElement.name)} (${escapeHtml(selectedElement.symbol)})</strong>: ${escapeHtml(elementStateDescription(selectedElement))}</p>
      <ul>${elementStudyTips(selectedElement).map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>
    </section>
  ` : "";
  return `
    <section>
      <h3>What this model shows</h3>
      <p>${escapeHtml(referenceText(info.summary))}</p>
      <div class="reference-tags">
        <span>${escapeHtml(referenceText(info.kind))}</span>
        <span>formula ${escapeHtml(displayFormula(analysis) || analysis.formula || "none")}</span>
        <span>model mass ${escapeHtml(formatNumber(analysis.mass))} g/mol</span>
        <span>formal charge ${escapeHtml(signed(analysis.totalCharge, true))}</span>
      </div>
    </section>
    <section>
      <h3>Model observations</h3>
      <ul>${properties.map((item) => `<li>${escapeHtml(referenceText(item))}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Model checks and RDKit</h3>
      <div class="reference-split">
        <article>
          <strong>Model estimate</strong>
          <p>The ${analysis.score}% score is a rule-based heuristic, not measured chemical stability. Model mass: ${escapeHtml(formatNumber(analysis.mass))} g/mol. Rings marked aromatic by the model: ${analysis.aromaticRings}. The 2D layout and strain are schematic estimates, not validated physical energy.</p>
        </article>
        ${rdkitBlock}
      </div>
    </section>
    <section>
      <h3>External data and geometry check</h3>
      <div class="reference-split">
        ${externalBlock}
        ${forceFieldBlock}
      </div>
    </section>
    ${roleBlock}
    <section>
      <h3>Practical interest</h3>
      <ul>${compoundUseList(analysis, substance).map((item) => `<li>${escapeHtml(referenceText(item))}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Exercise prompts</h3>
      <ul>${quests.map((item) => `<li>${escapeHtml(referenceText(item))}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Chemistry topics</h3>
      <div class="reference-cards">${topics.map(renderGuideTopicCard).join("")}</div>
    </section>
    <section>
      <h3>Reaction ideas</h3>
      <div class="reference-cards">${reactions.map(renderReferenceReactionCard).join("")}</div>
    </section>
    ${atomBlock}
    <section class="safety-note">
      <h3>Scope and safety</h3>
      <p>Exploratory prototype: not scientifically validated or approved for student use. It does not predict reactions or replace safety data sheets, laboratory protocols, calculation software, clinical guidance or expert advice.</p>
    </section>
  `;
}

function previewExampleGuide(analysis) {
  const formula = displayFormula(analysis);
  const name = labState.compoundMeta?.commonName;
  const counts = analysis.counts;
  const water = name === "water" && formula === "H2O" && counts.H === 2 && counts.O === 1 && Object.keys(counts).length === 2;
  const carbonDioxide = name === "carbon dioxide" && formula === "CO2" && counts.C === 1 && counts.O === 2 && Object.keys(counts).length === 2;
  if (!water && !carbonDioxide) return "";
  const observation = water
    ? "The canvas draws one explicit oxygen atom; two hydrogens are implicit in this supported SMILES model. The H2O formula includes all three atoms."
    : "The canvas draws one carbon and two oxygen atoms with two modeled C=O double bonds. The local catalog maps CO2 to O=C=O; a formula alone does not identify a unique structure in general.";
  const exercise = water
    ? "Select oxygen in the periodic table, enter H2O, then compare the explicit canvas atoms with the formula and inspector."
    : "Enter CO2, then inspect the three explicit atoms, two modeled bonds and the formula shown in the inspector.";
  return `
    <section>
      <h3>What this model shows</h3>
      <p>${escapeHtml(observation)}</p>
      <div class="reference-tags">
        <span>formula ${escapeHtml(formula)}</span>
        <span>model mass ${escapeHtml(formatNumber(analysis.mass))} g/mol</span>
        <span>formal charge ${escapeHtml(signed(analysis.totalCharge, true))}</span>
      </div>
    </section>
    <section>
      <h3>Teaching prompt</h3>
      <p>${escapeHtml(exercise)}</p>
    </section>
    <section class="safety-note">
      <h3>Scope and safety</h3>
      <p>Exploratory teaching prototype. It is not scientifically validated and not approved for student use. It does not predict reactions or provide laboratory or clinical guidance. Other reaction, isotope, coordination and biomolecular features remain outside this preview and require review.</p>
    </section>
    <section>
      <h3>Model checks</h3>
      <p>The ${analysis.score}% score is a rule-based heuristic, not measured chemical stability. The 2D layout and displayed strain are schematic estimates, not validated physical energy.</p>
      <div class="reference-split">
        ${renderForceFieldCheck(analysis)}
        ${renderRdkitCheck(labState.compoundMeta?.rdkit)}
      </div>
    </section>
  `;
}

export function renderReferenceReactionCard(reaction) {
  return `
    <article>
      <strong>${escapeHtml(referenceText(reaction.name))}</strong>
      <span>${escapeHtml(referenceText(reaction.equation || ""))}</span>
      <p>${escapeHtml(referenceText([reaction.energy, reaction.temperature, reaction.medium].filter(Boolean).join("; ")))}</p>
    </article>
  `;
}

export function renderRoleMap() {
  const roles = moleculeRoleSummary();
  if (!roles.length) return "";
  return `
    <section>
      <h3>Roles in the sketch</h3>
      <div class="reference-cards role-cards">
        ${roles.map((role) => `
          <article>
            <strong>${escapeHtml(role.title)}</strong>
            <span>${escapeHtml(role.count)}</span>
            <p>${escapeHtml(role.text)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function moleculeRoleSummary() {
  const roles = [];
  const targetAtoms = labState.atoms.filter((atom) => atom.role === "target");
  const linkerAtoms = labState.atoms.filter((atom) => atom.role === "linker");
  const chelatorAtoms = labState.atoms.filter((atom) => atom.chelatorId);
  const payloadAtoms = labState.atoms.filter((atom) => atom.radioisotope || atom.chelatedBy);
  if (targetAtoms.length) roles.push({ title: "Target", count: `${targetAtoms.length} nodes`, text: "A labeled target block in the sketch; biological binding is not established." });
  if (linkerAtoms.length) roles.push({ title: "Linker", count: `${linkerAtoms.length} nodes`, text: "A modeled link between target and chelator blocks." });
  if (chelatorAtoms.length) roles.push({ title: "Chelator", count: `${chelatorAtoms.length} atoms`, text: "A modeled donor region; real metal binding is not established." });
  if (payloadAtoms.length) roles.push({ title: "Payload", count: payloadAtoms.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", "), text: "An illustrative isotope or metal label, without doses or protocols." });
  return roles;
}

export function guideTopicCards(analysis) {
  return guideTopics.filter((topic) => topic.match(analysis)).slice(0, 4);
}

const referenceTopicText = {
  radiopharma: ["Radioligand and chelator", "The sketch labels conceptual radionuclide, chelator and target roles. Binding and medical effects are not established.", "Compare the modeled DOTA and 18F-FDG sketches; this is not clinical guidance."],
  electrolytes: ["Solutions and electrolytes", "The drawing can illustrate ions and solvation; it is not a solution simulation.", "Build NaCl and H2O and inspect the illustrative ion and solvation display."],
  aromaticity: ["Aromaticity", "The model marks some rings aromatic; this is not independent validation or a measurement of stability.", "Change modeled ring bonds and compare the heuristic score."],
  "functional-groups": ["Functional groups", "Inspect the displayed atoms and bonds in carbon-containing structures; the model does not predict reactivity.", "Compare the illustrative H2, Br2 and H2O rules for a modeled C=C bond."],
  metals: ["Metals and coordination", "Metal labels and coordination links are schematic and do not establish complex formation.", "Compare modeled Fe and Cu labels and charges; biological equivalence is not implied."],
  isotopes: ["Isotopes and labels", "Isotope controls change model mass and labels; decay and enrichment are not validated.", "Compare modeled H2O and D2O, then inspect the A± mass display."],
  stability: ["Heuristic score", "The percentage is a rule-based score, not measured chemical or thermodynamic stability; layout strain is not physical energy.", "Edit a modeled bond or charge and compare the heuristic score."]
};

export function renderGuideTopicCard(topic) {
  const [title, text, challenge] = referenceTopicText[topic.id] || [topic.title, topic.text, topic.challenge];
  return `
    <article>
      <strong>${escapeHtml(referenceText(title))}</strong>
      <p>${escapeHtml(referenceText(text))}</p>
      <span>${escapeHtml(referenceText(challenge))}</span>
    </article>
  `;
}

export function compoundPropertyList(analysis, substance) {
  const items = [];
  if (substance?.className) items.push(`Catalog class: ${substance.className}.`);
  if (labState.atoms.some((atom) => atom.chelatorId)) items.push("The sketch contains a chelator region; modeled coordination does not establish real complex formation.");
  if (labState.atoms.some((atom) => atom.radioisotope)) items.push("A radionuclide label is shown in the model; it does not establish medical parameters.");
  if (analysis.aromaticRings > 0) items.push("The model marks a ring as aromatic; this is not an independent validation of the structure.");
  if (analysis.totalCharge !== 0) items.push("The model has a net charge; solvent and counterions are not fully represented.");
  if (analysis.strainEnergy > 8) items.push("The layout strain estimate is elevated; try relaxing the drawing. It is not physical energy.");
  if (analysis.score >= 86) items.push("The heuristic score is high; it does not measure chemical stability.");
  else if (analysis.score >= 50) items.push("The heuristic score is intermediate; inspect modeled valences, charges and bond lengths.");
  else items.push("The heuristic score is low; inspect modeled valences, charges and bonds. It does not establish instability.");
  if (!items.length) items.push("Add atoms or enter a formula or supported SMILES to inspect the model.");
  return items;
}

export function compoundUseList(analysis, substance) {
  const uses = substance?.uses?.length ? [...substance.uses] : [];
  const counts = analysis.counts;
  if ((counts.C || 0) > 0) uses.push("Compare carbon-containing fragments and functional groups in the drawing; reactivity is not predicted.");
  if ((counts.Na || 0) && (counts.Cl || 0)) uses.push("Explore the illustrative ion and solvation sketch; it is not a solution simulation.");
  if ((counts.Fe || 0) || (counts.Cu || 0)) uses.push("Compare modeled transition-metal labels; biological equivalence is not implied.");
  if ((counts.U || 0)) uses.push("Isotope and nuclear displays are conceptual illustrations only.");
  if (labState.atoms.some((atom) => atom.chelatorId || atom.radioisotope)) uses.push("The radioligand sketch labels conceptual roles; it is not a medical model.");
  return [...new Set(uses)].slice(0, 6);
}

export function experimentQuestList(analysis, substance) {
  const counts = analysis.counts;
  const quests = [];
  if ((counts.Na || 0) && (counts.Cl || 0)) {
    quests.push("Add H2O and use Combine to inspect the illustrative ion and solvation display.");
    quests.push("Change a modeled Na or Cl charge and compare the heuristic score.");
  }
  if (analysis.aromaticRings > 0) {
    quests.push("Explore the illustrative benzene chlorination rule; it is not a reaction prediction.");
    quests.push("Change modeled aromatic bonds and compare the heuristic score.");
  }
  if (labState.bonds.some((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"))) {
    quests.push("Compare the illustrative H2, Br2 and H2O rules for a modeled C=C bond.");
  }
  if ((counts.Fe || 0) || (counts.Cu || 0)) {
    quests.push("Use Fe↔Cu to compare modeled labels and mass; this does not establish equivalent complexes.");
  }
  if (["glucose", "sucrose", "starch", "cellulose"].includes(substance?.structure)) {
    quests.push("Use Expand diagram to inspect the model’s ring or repeat-unit sketch.");
    quests.push("Replace H with D or change an O charge and compare model mass and heuristic score.");
  }
  if (labState.atoms.some((atom) => atom.chelatorId)) {
    quests.push("Add Lu-177 or Y-90 to inspect the illustrative metal placement and dotted coordination links.");
    quests.push("Compare the displayed DOTA, DTPA and Macropa sketches; real complex formation is not established.");
  }
  if (labState.atoms.some((atom) => atom.radioisotope)) {
    quests.push("Inspect the labeled radionuclide, chelator, linker and target roles; this is a conceptual sketch.");
  }
  if ((counts.U || 0)) {
    quests.push("The U demo is a conceptual visualization, not a nuclear calculation.");
  }
  if (substance?.commonName) {
    quests.push(`Try ${substance.commonName} as a name, formula or supported SMILES and compare the resulting model.`);
  }
  quests.push("Edit bonds, H atoms or charges and compare the heuristic score; it is not measured stability.");
  return [...new Set(quests)].slice(0, 7);
}

export function relevantReactionCards(analysis) {
  const counts = analysis.counts;
  const cards = [];
  const hasDoubleCC = labState.bonds.some((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"));
  const hasBenzene = analysis.aromaticRings > 0;
  if ((counts.Na || 0) && (counts.Cl || 0)) cards.push(findReactionRecord("nacl_hydration"));
  if (hasDoubleCC) cards.push(findReactionRecord("alkene_hydrogenation"), findReactionRecord("alkene_bromination"));
  if (hasBenzene) cards.push(findReactionRecord("benzene_chlorination"));
  if ((counts.C || 0) >= 6 && (counts.O || 0) >= 5 && (counts.H || 0) >= 10) cards.push({
    name: "Carbohydrate chemistry (illustrative)",
    equation: "sugar ring ⇄ open form; disaccharide + H2O ⇄ monosaccharides",
    energy: "Illustrative only; conditions require review",
    temperature: "conditions not predicted",
    medium: "reference sketch, not a protocol"
  });
  if (labState.atoms.some((atom) => atom.chelatorId || atom.radioisotope)) cards.push({
    name: "Radioligand sketch",
    equation: "target—linker—chelator⊂radiometal",
    energy: "illustrative roles; complex formation not established",
    temperature: "no practical parameters",
    medium: "conceptual model"
  });
  if ((counts.U || 0)) cards.push({
    name: "U demo: neutron concept",
    equation: "U + n -> excited nucleus -> energy + neutrons",
    energy: "qualitative visualization only",
    temperature: "no practical parameters",
    medium: "illustrative sketch"
  });
  return cards.filter(Boolean).slice(0, 5);
}

export function findReactionRecord(id) {
  return labState.reactionDatabase.find((item) => item.id === id) || {
    nacl_hydration: { name: "NaCl dissolution", equation: "NaCl + H2O -> Na+(aq) + Cl-(aq)", energy: "ΔH dissolution ≈ +3.9 kJ/mol (unreviewed)", temperature: "20-25 °C", medium: "water" },
    alkene_hydrogenation: { name: "Alkene hydrogenation", equation: "C=C + H2 -> C-C", energy: "typically exothermic; not predicted", temperature: "depends on catalyst", medium: "Ni/Pd/Pt" },
    alkene_bromination: { name: "Alkene bromination", equation: "C=C + Br2 -> Br-C-C-Br", energy: "illustrative addition", temperature: "20-25 °C", medium: "illustrative mode" },
    benzene_chlorination: { name: "Benzene chlorination", equation: "C6H6 + Cl2 -> C6H5Cl + HCl", energy: "activation required", temperature: "moderate", medium: "FeCl3/AlCl3" }
  }[id];
}
