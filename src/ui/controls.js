import { toggleAudio } from "../audio/sound.js";
import { analyzeMolecule } from "../chemistry/analysis.js";
import { expandCurrentMolecule } from "../chemistry/builders.js";
import { addRadioisotopePreset, chelateSelectedMetal } from "../chemistry/coordination.js";
import { combineMoleculeFragments, nuclearConceptDemo, reactAllPossible } from "../chemistry/reactions.js";
import { catalysts, isotopeProcesses, radioisotopePresets, reactions } from "../data/catalogs.js";
import { centerMolecule } from "../render/camera.js";
import { triggerNuclearVisual, triggerReactionEffect } from "../render/effects.js";
import { makeSvg, render } from "../render/renderer.js";
import { lookupExternalCompound, scheduleExternalLookupHint, swapFormulaMetal } from "../services/pubchem.js";
import { addFragment, collapseFunctionalGroups, runDeliveryDemo, toggleBenzeneBonds } from "../simulation/fragments.js";
import { getBond } from "../simulation/graph.js";
import { redoHistory, undoHistory } from "../simulation/history.js";
import { adjustCharge, adjustEnrichment, adjustIsotopeShift, adjustValenceOverride, deleteSelection, resetSelectedAtomTuning } from "../simulation/molecule.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { audioToggleButton, buildSmilesButton, catalystButtons, chelateMetalButton, closeReferenceButton, collapseGroupsButton, combineMoleculesButton, compoundInfo, contextMenu, deliveryDemoButton, elementSearch, expandMoleculeButton, formulaForm, formulaInput, formulaPreset, gridLines, isotopeButtons, lookupExternalButton, nuclearDemoButton, openReferenceButton, reactAllButton, reactionButtons, redoAction, referenceDialog, referenceModal, smilesInput, svg, swapMetalButton, undoAction } from "./dom.js";
import { renderPeriodicTable } from "./elements.js";
import { applyFormulaInput, applySmilesInput } from "./input.js";
import { hideContextMenu, onPointerMove, onPointerUp, onStageContextMenu, onStagePointerDown } from "./interactions.js";
import { logReaction, reactionResult } from "./journal.js";
import { closeReferenceModal, openReferenceModal, resizeReferenceDialog, startReferenceResize, stopReferenceResize } from "./reference.js";

export function bindControls() {
  formulaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFormulaInput(formulaInput.value);
  });
  buildSmilesButton.addEventListener("click", () => applySmilesInput(smilesInput.value));
  lookupExternalButton.addEventListener("click", () => lookupExternalCompound(formulaInput.value || smilesInput.value, { build: true }));
  smilesInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applySmilesInput(smilesInput.value);
  });
  formulaInput.addEventListener("input", scheduleExternalLookupHint);
  formulaPreset.addEventListener("change", () => {
    if (!formulaPreset.value) return;
    formulaInput.value = formulaPreset.value;
    applyFormulaInput(formulaPreset.value);
    formulaPreset.value = "";
  });
  swapMetalButton.addEventListener("click", swapFormulaMetal);

  document.getElementById("modeButtons").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    setMode(button.dataset.mode);
  });

  document.getElementById("bondButtons").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order]");
    if (!button) return;
    labState.selectedBondOrder = button.dataset.order === "aromatic" ? "aromatic" : Number(button.dataset.order);
    document.querySelectorAll("#bondButtons button").forEach((item) => item.classList.toggle("is-active", item === button));
    if (labState.selectedBondId) {
      const bond = getBond(labState.selectedBondId);
      if (bond) {
        bond.order = labState.selectedBondOrder;
        analyzeAndRender();
      }
    }
  });

  document.getElementById("runPhysics").addEventListener("click", () => {
    labState.physicsRunning = !labState.physicsRunning;
    document.getElementById("runPhysics").classList.toggle("is-active", labState.physicsRunning);
    document.getElementById("runPhysics").innerHTML = `<i data-lucide="${labState.physicsRunning ? "pause" : "play"}"></i>`;
    window.lucide?.createIcons();
  });

  document.getElementById("centerView").addEventListener("click", () => {
    centerMolecule();
    analyzeAndRender();
  });
  undoAction.addEventListener("click", undoHistory);
  redoAction.addEventListener("click", redoHistory);
  reactAllButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = reactAllPossible();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  combineMoleculesButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = combineMoleculeFragments();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  expandMoleculeButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = expandCurrentMolecule();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  chelateMetalButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = chelateSelectedMetal(null);
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  collapseGroupsButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = collapseFunctionalGroups();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  deliveryDemoButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = runDeliveryDemo();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });
  nuclearDemoButton.addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = nuclearConceptDemo();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
    triggerNuclearVisual();
  });
  audioToggleButton.addEventListener("click", toggleAudio);
  openReferenceButton.addEventListener("click", openReferenceModal);
  compoundInfo.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-reference]")) openReferenceModal();
    if (event.target.closest("[data-expand-molecule]")) {
      const before = analyzeMolecule();
      const result = expandCurrentMolecule();
      analyzeAndRender();
      logReaction(result, before, labState.lastAnalysis);
      triggerReactionEffect(labState.lastAnalysis, result);
    }
  });
  closeReferenceButton.addEventListener("click", closeReferenceModal);
  referenceModal.addEventListener("click", (event) => {
    if (event.target === referenceModal && Date.now() - Number(referenceDialog.dataset.resizedAt || 0) > 300) closeReferenceModal();
  });
  referenceDialog.querySelectorAll("[data-resize]").forEach((handle) => {
    handle.addEventListener("pointerdown", startReferenceResize);
  });
  document.addEventListener("pointermove", resizeReferenceDialog);
  document.addEventListener("pointerup", stopReferenceResize);

  document.getElementById("clearAll").addEventListener("click", () => {
    labState.atoms = [];
    labState.bonds = [];
    labState.selectedAtomIds = [];
    labState.selectedBondId = null;
    labState.pendingAtomId = null;
    logReaction("Поле очищено.");
    analyzeAndRender();
  });

  document.getElementById("deleteSelection").addEventListener("click", deleteSelection);
  document.getElementById("chargeMinus").addEventListener("click", () => adjustCharge(-1));
  document.getElementById("chargePlus").addEventListener("click", () => adjustCharge(1));
  document.getElementById("valenceMinus").addEventListener("click", () => adjustValenceOverride(-1));
  document.getElementById("valencePlus").addEventListener("click", () => adjustValenceOverride(1));
  document.getElementById("isotopeMinus").addEventListener("click", () => adjustIsotopeShift(-1));
  document.getElementById("isotopePlus").addEventListener("click", () => adjustIsotopeShift(1));
  document.getElementById("enrichMinus").addEventListener("click", () => adjustEnrichment(-0.25));
  document.getElementById("enrichPlus").addEventListener("click", () => adjustEnrichment(0.25));
  document.getElementById("resetAtomTuning").addEventListener("click", resetSelectedAtomTuning);
  document.getElementById("toggleBenzene").addEventListener("click", () => {
    const before = analyzeMolecule();
    const result = toggleBenzeneBonds();
    analyzeAndRender();
    logReaction(result, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, result);
  });

  document.querySelectorAll("[data-fragment]").forEach((button) => {
    button.addEventListener("click", () => addFragment(button.dataset.fragment));
  });

  reactions.forEach((reaction) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = reaction.label;
    button.addEventListener("click", () => {
      const before = analyzeMolecule();
      const result = reaction.run(before);
      analyzeAndRender();
      logReaction(result, before, labState.lastAnalysis);
      triggerReactionEffect(labState.lastAnalysis, result);
    });
    reactionButtons.appendChild(button);
  });

  catalysts.forEach((catalyst) => {
    const button = document.createElement("button");
    button.className = "chip catalyst-chip";
    button.dataset.catalyst = catalyst.id;
    button.textContent = catalyst.label;
    button.title = catalyst.hint;
    button.addEventListener("click", () => {
      labState.activeCatalyst = catalyst.id;
      syncCatalystButtons();
      analyzeAndRender();
      const analysis = analyzeMolecule();
      logReaction(reactionResult(true, "Катализатор выбран", catalyst.hint, {
        equation: catalyst.label,
        uses: "Катализатор меняет предпочтительную реакцию кнопки «▶ Всё», но сам не расходуется.",
        advice: [catalystAdvice(catalyst.id)]
      }), analysis, analysis);
    });
    catalystButtons.appendChild(button);
  });
  syncCatalystButtons();

  isotopeProcesses.forEach((process) => {
    const button = document.createElement("button");
    button.className = "chip isotope-chip";
    button.textContent = process.label;
    button.addEventListener("click", () => {
      const before = analyzeMolecule();
      const result = process.run(before);
      analyzeAndRender();
      logReaction(result, before, labState.lastAnalysis);
      triggerReactionEffect(labState.lastAnalysis, result);
    });
    isotopeButtons.appendChild(button);
  });

  radioisotopePresets.forEach((preset) => {
    const button = document.createElement("button");
    button.className = "chip radioisotope-chip";
    button.textContent = preset.label;
    button.title = `${preset.kind}; хелатор: ${preset.bestChelator}`;
    button.addEventListener("click", () => {
      const before = analyzeMolecule();
      const result = addRadioisotopePreset(preset.id);
      analyzeAndRender();
      logReaction(result, before, labState.lastAnalysis);
      triggerReactionEffect(labState.lastAnalysis, result);
    });
    isotopeButtons.appendChild(button);
  });

  elementSearch.addEventListener("input", renderPeriodicTable);

  svg.addEventListener("pointerdown", onStagePointerDown);
  svg.addEventListener("contextmenu", onStageContextMenu);
  document.addEventListener("pointerdown", (event) => {
    if (!contextMenu || contextMenu.hidden || contextMenu.contains(event.target)) return;
    hideContextMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.target.closest("input, textarea, select, [contenteditable=true]")) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redoHistory();
      else undoHistory();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redoHistory();
      return;
    }
    if (event.key === "Escape") hideContextMenu();
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

export function setMode(nextMode) {
  labState.mode = nextMode;
  labState.pendingAtomId = null;
  document.querySelectorAll("#modeButtons button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === labState.mode);
  });
  render();
}

export function drawGrid() {
  const fragment = document.createDocumentFragment();
  for (let x = 0; x <= 1000; x += 40) {
    const line = makeSvg("line", { x1: x, y1: 0, x2: x, y2: 720 });
    fragment.appendChild(line);
  }
  for (let y = 0; y <= 720; y += 40) {
    const line = makeSvg("line", { x1: 0, y1: y, x2: 1000, y2: y });
    fragment.appendChild(line);
  }
  gridLines.appendChild(fragment);
}

export function syncBondButtons() {
  document.querySelectorAll("#bondButtons button").forEach((button) => {
    const value = button.dataset.order === "aromatic" ? "aromatic" : Number(button.dataset.order);
    button.classList.toggle("is-active", value === labState.selectedBondOrder);
  });
}

export function syncCatalystButtons() {
  document.querySelectorAll("[data-catalyst]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.catalyst === labState.activeCatalyst);
  });
}

export function catalystLabel(id = labState.activeCatalyst) {
  return catalysts.find((catalyst) => catalyst.id === id)?.label || "нет";
}

export function catalystAdvice(id = labState.activeCatalyst) {
  if (id === "ni" || id === "pd" || id === "pt") return "Подходит для C=C: кнопка «▶ Всё» добавит H и сделает связи насыщеннее.";
  if (id === "acid") return "Подходит для алкенов: «▶ Всё» добавит H/OH и даст спиртовые фрагменты.";
  if (id === "fecl3") return "Подходит для бензола: «▶ Всё» добавит Cl к ароматическому кольцу.";
  if (id === "brhv") return "Подходит для C=C: «▶ Всё» раскроет двойные связи и добавит Br.";
  return "Без катализатора «▶ Всё» сначала попробует стабилизировать молекулу и выбрать мягкую реакцию.";
}
