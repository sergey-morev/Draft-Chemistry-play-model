import { describeCompound } from "../chemistry/description.js";
import { elementStateDescription } from "../chemistry/elements.js";
import { atomMass, desiredBondLength, isHydrogenLike, isotopeLabel } from "../chemistry/properties.js";
import { stabilityState } from "../render/effects.js";
import { bondHasSymbols, getAtom, getBond } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { catalystAdvice } from "./controls.js";
import { atomCount, atomReports, bondCount, chargeValue, compoundInfo, energyBar, energyValue, formulaInput, formulaLine, issueList, massValue, selectionInfo, stabilityBar, stabilityLabel, stabilityValue, stageWrap } from "./dom.js";
import { bondName, bondNameShort, clamp, distance, escapeHtml, formatNumber, signed, stabilityColor, stabilityText } from "../utils/format.js";

export function renderAnalysis(analysis) {
  formulaLine.textContent = displayFormula(analysis) || "empty model";
  if (formulaInput && document.activeElement !== formulaInput) {
    formulaInput.value = analysis.formula || "";
  }
  stabilityValue.textContent = `${analysis.score}%`;
  stabilityBar.style.width = `${analysis.score}%`;
  stabilityBar.style.background = stabilityColor(analysis.score);
  energyValue.textContent = formatNumber(analysis.strainEnergy);
  energyBar.style.width = `${clamp(analysis.strainEnergy * 5, 0, 100)}%`;
  stabilityLabel.textContent = inspectorStabilityText(analysis.score);
  stabilityLabel.style.color = stabilityColor(analysis.score);
  stabilityLabel.style.background = `${stabilityColor(analysis.score)}16`;
  massValue.textContent = `${formatNumber(analysis.mass)} g/mol`;
  chargeValue.textContent = signed(analysis.totalCharge, true);
  atomCount.textContent = String(labState.atoms.length);
  bondCount.textContent = String(labState.bonds.length);
  if (stageWrap) stageWrap.dataset.state = stabilityState(analysis.score);

  renderSelection(analysis);
  renderCompoundInfo(analysis);
  renderAtomReports(analysis);
  renderIssues(analysis);
  const validation = document.getElementById("validationSummary");
  if (validation) validation.innerHTML = renderForceFieldCheck(analysis) + renderRdkitCheck(labState.compoundMeta?.rdkit);
}

export function displayFormula(analysis = labState.lastAnalysis) {
  if (labState.compoundMeta?.displayFormula) return labState.compoundMeta.displayFormula;
  if (labState.compoundMeta?.commonName && labState.compoundMeta.sourceFormula) return labState.compoundMeta.sourceFormula;
  return analysis?.formula || "";
}

export function renderSelection(analysis) {
  if (labState.selectedBondId) {
    const bond = getBond(labState.selectedBondId);
    const a = getAtom(bond?.a);
    const b = getAtom(bond?.b);
    selectionInfo.innerHTML = bond && a && b
      ? `<strong>${a.symbol}${a.id}-${b.symbol}${b.id}</strong><br>type: ${inspectorBondName(bond.order)}; length ${formatNumber(distance(a, b) / 100)} model Å`
      : "No bond selected.";
    return;
  }

  if (labState.selectedAtomIds.length === 1) {
    const atom = getAtom(labState.selectedAtomIds[0]);
    const report = analysis.atomMap.get(atom?.id);
    const isotope = atom && report ? isotopeLabel(atom, report.element) : "";
    const shift = atom?.isotopeShift || 0;
    const shiftText = shift > 0 ? `+${shift}` : String(shift);
    selectionInfo.innerHTML = atom && report
      ? `<strong>${atom.symbol}${atom.id} · ${report.element.name} · ${isotope}</strong><br>V valence: ${report.allowedValences.join("/")}; bond usage ${formatNumber(report.usage)}; charge ${signed(atom.charge, true)}<br>A isotope: ${isotope}; shift ${shiftText}; enrichment ${Math.round((atom.enrichment || 0) * 100)}%; mass ${formatNumber(atomMass(atom, report.element))}<br>${escapeHtml(elementStateDescription(report.element))}`
      : "No atom selected.";
    return;
  }

  if (labState.selectedAtomIds.length > 1) {
    selectionInfo.innerHTML = `<strong>Selected atoms: ${labState.selectedAtomIds.length}</strong><br>${labState.selectedAtomIds.map((id) => {
      const atom = getAtom(id);
      return atom ? `${atom.symbol}${atom.id}` : "";
    }).filter(Boolean).join(", ")}`;
    return;
  }

  selectionInfo.textContent = "No object selected.";
}

export function renderCompoundInfo(analysis) {
  if (!compoundInfo) return;
  const info = describeCompound(analysis);
  const tags = [
    `formula ${displayFormula(analysis) || analysis.formula || "none"}`,
    `${inspectorStabilityText(analysis.score)} ${analysis.score}%`,
    `mass ${formatNumber(analysis.mass)}`
  ];
  if (labState.compoundMeta?.external?.cid) tags.push(`PubChem CID ${labState.compoundMeta.external.cid}`);
  if (labState.compoundMeta?.rdkit?.formula) tags.push(`RDKit ${labState.compoundMeta.rdkit.formula}`);
  compoundInfo.innerHTML = `
    <div class="compound-title">
      <strong>${escapeHtml(info.title)}</strong>
      <span>${escapeHtml(info.kind)}</span>
    </div>
    <p>${escapeHtml(shortenText(info.summary, 118))}</p>
    <div class="compound-tags">
      ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
    <div class="compound-actions">
      <button type="button" class="reference-wide" data-open-reference>Reference</button>
      <button type="button" class="reference-wide scheme" data-expand-molecule>Expand diagram</button>
    </div>
  `;
}

export function renderRdkitCheck(check) {
  const status = check?.status || labState.rdkitStatus;
  const statusText = labState.rdkitModule ? "готов" : status;
  const rows = [`data: ${inspectorStatusText(labState.dataLoadStatus)}`];
  if (check?.formula) rows.push(`formula ${check.formula}`);
  if (check?.exactMass != null) rows.push(`mass ${formatNumber(Number(check.exactMass))}`);
  if (check?.canonical) rows.push(`SMILES ${check.canonical}`);
  const notes = check?.notes?.length ? check.notes : ["Enter a SMILES string or a recognized name to check the reference structure."];
  return `
    <div class="check-panel rdkit-check ${statusText === "готов" ? "ready" : "pending"}">
      <div class="check-head"><strong>RDKit reference check</strong><span>${escapeHtml(inspectorStatusText(statusText))}</span></div>
      ${!labState.rdkitModule && labState.rdkitStatus !== "загрузка" ? '<button class="chip" data-enable-rdkit title="Load RDKit.js from an external CDN; reference structure checks run on this computer">Enable RDKit</button>' : ""}
      ${rows.length ? `<div class="compound-tags">${rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</div>` : ""}
      <ul>${notes.slice(0, 3).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </div>
  `;
}

export function renderExternalCheck(external = labState.compoundMeta?.external) {
  const rows = [`status: ${inspectorStatusText(labState.externalLookupStatus)}`];
  if (external?.cid) rows.push(`PubChem CID ${external.cid}`);
  if (external?.molecularWeight) rows.push(`mass ${external.molecularWeight}`);
  if (external?.inchiKey) rows.push(`InChIKey ${external.inchiKey}`);
  const notes = external
    ? ["The formula and SMILES come from an external database; the sandbox still generates its illustrative geometry.", "Online search results are not saved to the local JSON database without a separate decision."]
    : ["Use the PubChem search control in the top bar to look up a name or SMILES in the external PubChem database.", "ChEBI is a proposed future source for biological classes and ontologies."];
  return `
    <div class="check-panel external-check ${external ? "ready" : "pending"}">
      <div class="check-head"><strong>PubChem / ChEBI</strong><span>${external ? "found" : "local"}</span></div>
      <div class="compound-tags">${rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</div>
      <ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      ${external?.url ? `<a class="external-link" href="${escapeHtml(external.url)}" target="_blank" rel="noreferrer">Open PubChem</a>` : ""}
    </div>
  `;
}

export function renderForceFieldCheck(analysis) {
  const clashes = labState.bonds.filter((bond) => {
    const a = getAtom(bond.a);
    const b = getAtom(bond.b);
    return a && b && distance(a, b) < desiredBondLength(bond) * 0.62;
  }).length;
  const state = analysis.strainEnergy < 5 && clashes === 0 ? "ready" : "pending";
  const notes = [
    `Heuristic layout strain: ${formatNumber(analysis.strainEnergy)}; short-distance clashes: ${clashes}.`,
    "This is a geometric estimate for the diagram, not a physical energy or a UFF/MMFF94 calculation.",
    labState.rdkitModule ? "RDKit is loaded: reference SMILES and formula checks are available; 3D conformer generation is deferred to a future, more demanding mode." : "A physical force-field calculation would require RDKit/WASM or a local chemistry backend."
  ];
  return `
    <div class="check-panel forcefield-check ${state}">
      <div class="check-head"><strong>Heuristic geometry check</strong><span>${state === "ready" ? "consistent within model" : "layout strain detected"}</span></div>
      <ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </div>
  `;
}

export function shortenText(text, limit = 120) {
  const source = String(text || "");
  return source.length > limit ? `${source.slice(0, limit - 1)}...` : source;
}

export function renderAtomReports(analysis) {
  atomReports.innerHTML = "";
  const reports = [...analysis.atomMap.values()].slice(0, 14);
  if (!reports.length) {
    atomReports.innerHTML = `<div class="issue-row"><strong>Empty</strong><span>Atom bonds will appear after elements are added.</span></div>`;
    return;
  }
  reports.forEach((report) => {
    const row = document.createElement("div");
    row.className = `report-row ${report.state}`;
    const bondsText = labState.bonds
      .filter((bond) => bond.a === report.atom.id || bond.b === report.atom.id)
      .map((bond) => {
        const other = getAtom(bond.a === report.atom.id ? bond.b : bond.a);
        return `${bondNameShort(bond.order)} ${other?.symbol}${other?.id}`;
      })
      .join(", ") || "none";
    row.innerHTML = `
      <strong>${report.atom.symbol}${report.atom.id}: ${report.detail}</strong>
      <span>bonds: ${bondsText}; valences ${report.allowedValences.join("/")}; χ=${formatNumber(report.element.electronegativity)}</span>
    `;
    atomReports.appendChild(row);
  });
}

export function renderIssues(analysis) {
  issueList.innerHTML = "";
  const issues = analysis.issues.slice(0, 8);
  const suggestions = buildStabilizationSuggestions(analysis);
  if (!issues.length && !suggestions.length) {
    issueList.innerHTML = `<div class="issue-row"><strong>No warnings</strong><span>The model detects no valence overload.</span></div>`;
    return;
  }
  [...issues, ...suggestions].slice(0, 10).forEach((issue) => {
    const row = document.createElement("div");
    row.className = `issue-row ${issue.kind}`;
    row.innerHTML = `<strong>${issue.title}</strong><span>${issue.text}</span>`;
    issueList.appendChild(row);
  });
}

export function buildStabilizationSuggestions(analysis) {
  const suggestions = [];
  const reports = [...analysis.atomMap.values()];
  const over = reports.find((report) => report.usage > Math.max(...report.allowedValences) + 0.05);
  const under = reports.find((report) => report.state === "warn" && !isHydrogenLike(report.atom.symbol));
  const charged = reports.find((report) => report.atom.charge !== 0);
  const doubleBond = labState.bonds.find((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"));

  if (over) {
    suggestions.push({
      kind: "bad",
      title: `Adjust model valence for ${over.atom.symbol}${over.atom.id}`,
      text: "Reduce the order of one bond or delete it to reach an allowed model valence and increase the heuristic stability score."
    });
  }
  if (under) {
    suggestions.push({
      kind: "warn",
      title: `Fill valence for ${under.atom.symbol}${under.atom.id}`,
      text: "Add H or a suitable atom to form a saturated fragment with no unfilled valence in this model."
    });
  }
  if (charged) {
    suggestions.push({
      kind: "warn",
      title: `Neutralize charge on ${charged.atom.symbol}${charged.atom.id}`,
      text: "Use +/− to move the charge toward 0; the model treats this as a less strained electronic state."
    });
  }
  if (analysis.strainEnergy > 10) {
    suggestions.push({
      kind: "warn",
      title: "Reduce layout strain",
      text: "Start layout relaxation with ▶ or move atoms apart to bring bonds closer to their model target lengths."
    });
  }
  if (doubleBond) {
    suggestions.push({
      kind: "ok",
      title: "Illustrative C=C reaction",
      text: `${catalystAdvice()} The demonstration can produce an alkane, alcohol or dihalide depending on the selected catalyst.`
    });
  }
  if (analysis.aromaticRings > 0) {
    suggestions.push({
      kind: "ok",
      title: "Aromatic ring",
      text: "In this demonstration, FeCl3 directs chlorination to produce a chlorinated arene while retaining the ring."
    });
  }
  if (analysis.score >= 86 && labState.atoms.length) {
    suggestions.push({
      kind: "ok",
      title: "High heuristic stability score",
      text: "Explore functionalization in the sandbox by adding OH, a halogen, an isotope label or a catalyst."
    });
  }

  return suggestions;
}

// Presentation adapters only: preserve shared helper behavior and persisted state values.
function inspectorBondName(order) {
  const names = {
    "водородная/ион-дипольная": "hydrogen / ion–dipole",
    "сольватационная": "solvation", "ионная": "ionic",
    "координационная": "coordination", "ароматическая": "aromatic",
    "одинарная": "single", "двойная": "double", "тройная": "triple"
  };
  const name = bondName(order);
  return names[name] ?? name;
}

function inspectorStabilityText(score) {
  const labels = {
    "стабильна": "high heuristic stability",
    "условно стабильна": "conditional heuristic stability",
    "напряжена": "strained in model",
    "нестабильна": "low heuristic stability"
  };
  const label = stabilityText(score);
  return labels[label] ?? label;
}

function inspectorStatusText(status) {
  const labels = {
    "готов": "ready", "не загружен": "not loaded",
    "загрузка": "loading", "недоступен": "unavailable",
    "встроенная база": "built-in database", "локальная база": "local database"
  };
  return labels[status] ?? status;
}
