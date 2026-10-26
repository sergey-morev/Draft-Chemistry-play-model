import { analyzeAndRender } from "./update.js";
import { state as labState } from "../state.js";
import { syncCatalystButtons } from "../ui/controls.js";
import { redoAction, undoAction } from "../ui/dom.js";
import { logReaction } from "../ui/journal.js";

export function snapshotMolecule() {
  return {
    atoms: labState.atoms.map((atom) => ({
      ...atom,
      groupCounts: atom.groupCounts ? { ...atom.groupCounts } : undefined
    })),
    bonds: labState.bonds.map((bond) => ({ ...bond })),
    nextAtomId: labState.nextAtomId,
    nextBondId: labState.nextBondId,
    activeCatalyst: labState.activeCatalyst,
    compoundMeta: labState.compoundMeta ? { ...labState.compoundMeta } : null
  };
}

export function moleculeSignature(state = snapshotMolecule()) {
  return JSON.stringify(state);
}

export function recordHistory() {
  if (labState.historyPaused) return;
  const state = snapshotMolecule();
  const signature = moleculeSignature(state);
  if (labState.historyStack[labState.historyIndex]?.signature === signature) {
    updateHistoryButtons();
    return;
  }
  labState.historyStack = labState.historyStack.slice(0, labState.historyIndex + 1);
  labState.historyStack.push({ state, signature });
  if (labState.historyStack.length > 80) labState.historyStack.shift();
  labState.historyIndex = labState.historyStack.length - 1;
  updateHistoryButtons();
}

export function restoreHistory(index) {
  const entry = labState.historyStack[index];
  if (!entry) return;
  labState.historyPaused = true;
  labState.atoms = entry.state.atoms.map((atom) => ({ ...atom }));
  labState.bonds = entry.state.bonds.map((bond) => ({ ...bond }));
  labState.nextAtomId = entry.state.nextAtomId;
  labState.nextBondId = entry.state.nextBondId;
  labState.activeCatalyst = entry.state.activeCatalyst || "none";
  labState.compoundMeta = entry.state.compoundMeta ? { ...entry.state.compoundMeta } : null;
  labState.selectedAtomIds = [];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  labState.dragState = null;
  labState.historyIndex = index;
  syncCatalystButtons();
  analyzeAndRender(false);
  labState.historyPaused = false;
  updateHistoryButtons();
}

export function undoHistory() {
  if (labState.historyIndex <= 0) return;
  restoreHistory(labState.historyIndex - 1);
  logReaction("Отменено последнее изменение молекулы.");
}

export function redoHistory() {
  if (labState.historyIndex >= labState.historyStack.length - 1) return;
  restoreHistory(labState.historyIndex + 1);
  logReaction("Возвращено следующее изменение молекулы.");
}

export function updateHistoryButtons() {
  if (undoAction) undoAction.disabled = labState.historyIndex <= 0;
  if (redoAction) redoAction.disabled = labState.historyIndex >= labState.historyStack.length - 1;
}
