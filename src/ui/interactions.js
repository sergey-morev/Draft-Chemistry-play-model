import { triggerElementFeedback } from "../render/effects.js";
import { render, svgPoint } from "../render/renderer.js";
import { getAtom, getBond } from "../simulation/graph.js";
import { addAtom, adjustEnrichment, adjustIsotopeShift, adjustValenceOverride, createOrUpdateBond, mergeAtoms, removeAtom, removeBond, resetSelectedAtomTuning, strengthenBond, weakenOrRemoveBond } from "../simulation/molecule.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { setMode, syncBondButtons } from "./controls.js";
import { contextMenu, svg } from "./dom.js";
import { clamp } from "../utils/format.js";

export function onStagePointerDown(event) {
  if (event.button !== 0) return;
  const target = event.target.closest("[data-atom-id], [data-bond-id]");
  if (target) return;
  const point = svgPoint(event);
  labState.selectedAtomIds = [];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  if (labState.mode === "atom") {
    const atom = addAtom(labState.selectedElement, point.x, point.y);
    triggerElementFeedback(atom, "add");
  }
  analyzeAndRender();
}

export function onAtomPointerDown(event, atomId) {
  event.stopPropagation();
  const atom = getAtom(atomId);
  if (!atom) return;

  if (labState.mode === "erase") {
    removeAtom(atomId);
    analyzeAndRender();
    return;
  }

  if (labState.mode === "bond") {
    labState.selectedBondId = null;
    if (labState.pendingAtomId && labState.pendingAtomId !== atomId) {
      createOrUpdateBond(labState.pendingAtomId, atomId, labState.selectedBondOrder, true);
      labState.selectedAtomIds = [labState.pendingAtomId, atomId];
      labState.pendingAtomId = atomId;
    } else {
      labState.pendingAtomId = atomId;
      labState.selectedAtomIds = [atomId];
    }
    analyzeAndRender();
    return;
  }

  if (labState.mode === "merge") {
    labState.selectedBondId = null;
    if (labState.pendingAtomId && labState.pendingAtomId !== atomId) {
      mergeAtoms(labState.pendingAtomId, atomId);
      labState.pendingAtomId = null;
      analyzeAndRender();
    } else {
      labState.pendingAtomId = atomId;
      labState.selectedAtomIds = [atomId];
      render();
    }
    return;
  }

  labState.selectedAtomIds = [atomId];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  labState.dragState = {
    id: atomId,
    start: svgPoint(event),
    offsetX: atom.x - svgPoint(event).x,
    offsetY: atom.y - svgPoint(event).y,
    moved: false
  };
  svg.setPointerCapture?.(event.pointerId);
  analyzeAndRender();
}

export function onBondPointerDown(event, bondId) {
  event.stopPropagation();
  if (labState.mode === "erase") {
    removeBond(bondId);
  } else {
    labState.selectedBondId = bondId;
    labState.selectedAtomIds = [];
    labState.pendingAtomId = null;
    const bond = getBond(bondId);
    if (bond) labState.selectedBondOrder = bond.order;
    syncBondButtons();
  }
  analyzeAndRender();
}

export function onStageContextMenu(event) {
  event.preventDefault();
  const target = event.target.closest("[data-atom-id], [data-bond-id]");
  if (!target) {
    const point = svgPoint(event);
    showContextMenu(event.clientX, event.clientY, [
      [`+ ${labState.selectedElement}`, () => { const atom = addAtom(labState.selectedElement, point.x, point.y); triggerElementFeedback(atom, "add"); analyzeAndRender(); }],
      ["Выбор", () => { setMode("select"); }],
      ["Связь", () => { setMode("bond"); }],
      ["Очистить выбор", () => { labState.selectedAtomIds = []; labState.selectedBondId = null; labState.pendingAtomId = null; analyzeAndRender(); }]
    ]);
  }
}

export function showAtomContextMenu(event, atomId) {
  event.preventDefault();
  event.stopPropagation();
  labState.selectedAtomIds = [atomId];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  showContextMenu(event.clientX, event.clientY, [
    ["Удалить", () => { removeAtom(atomId); analyzeAndRender(); }],
    ["D", () => { getAtom(atomId).symbol = "D"; analyzeAndRender(); }],
    ["T", () => { getAtom(atomId).symbol = "T"; analyzeAndRender(); }],
    ["A+", () => { adjustIsotopeShift(1); }],
    ["A-", () => { adjustIsotopeShift(-1); }],
    ["%+", () => { adjustEnrichment(0.25); }],
    ["%-", () => { adjustEnrichment(-0.25); }],
    ["V+", () => { adjustValenceOverride(1); }],
    ["V-", () => { adjustValenceOverride(-1); }],
    ["Сброс", () => { resetSelectedAtomTuning(); }]
  ]);
  analyzeAndRender();
}

export function showBondContextMenu(event, bondId) {
  event.preventDefault();
  event.stopPropagation();
  labState.selectedBondId = bondId;
  labState.selectedAtomIds = [];
  labState.pendingAtomId = null;
  showContextMenu(event.clientX, event.clientY, [
    ["1", () => { setBondOrder(bondId, 1); }],
    ["2", () => { setBondOrder(bondId, 2); }],
    ["3", () => { setBondOrder(bondId, 3); }],
    ["⏣", () => { setBondOrder(bondId, "aromatic"); }],
    ["Связь +", () => { strengthenBond(bondId); analyzeAndRender(); }],
    ["Связь −", () => { weakenOrRemoveBond(bondId); analyzeAndRender(); }],
    ["Удалить", () => { removeBond(bondId); analyzeAndRender(); }]
  ]);
  analyzeAndRender();
}

export function showContextMenu(x, y, items) {
  if (!contextMenu) return;
  contextMenu.innerHTML = "";
  items.forEach(([label, action]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", () => {
      hideContextMenu();
      action();
    });
    contextMenu.appendChild(button);
  });
  contextMenu.hidden = false;
  const rect = contextMenu.getBoundingClientRect();
  contextMenu.style.left = `${clamp(x, 8, window.innerWidth - rect.width - 8)}px`;
  contextMenu.style.top = `${clamp(y, 8, window.innerHeight - rect.height - 8)}px`;
}

export function hideContextMenu() {
  if (!contextMenu) return;
  contextMenu.hidden = true;
}

export function setBondOrder(bondId, order) {
  const bond = getBond(bondId);
  if (!bond) return;
  bond.order = order;
  labState.selectedBondId = bond.id;
  syncBondButtons();
  analyzeAndRender();
}

export function onPointerMove(event) {
  if (!labState.dragState) return;
  const atom = getAtom(labState.dragState.id);
  if (!atom) return;
  const point = svgPoint(event);
  atom.x = clamp(point.x + labState.dragState.offsetX, 26, 974);
  atom.y = clamp(point.y + labState.dragState.offsetY, 26, 694);
  atom.vx = 0;
  atom.vy = 0;
  labState.dragState.moved = true;
  render();
}

export function onPointerUp() {
  if (!labState.dragState) return;
  labState.dragState = null;
  analyzeAndRender();
}
