import { analyzeMolecule } from "../chemistry/analysis.js";
import { render } from "../render/renderer.js";
import { recordHistory } from "./history.js";
import { state as labState } from "../state.js";
import { renderAnalysis } from "../ui/inspector.js";

export function analyzeAndRender(record = true) {
  if (labState.compoundMeta) {
    const fingerprint = JSON.stringify({
      atoms: labState.atoms.map(({ id, symbol, charge, count, groupCounts, isotopeShift, targetMassNumber }) => [id, symbol, charge, count, groupCounts, isotopeShift, targetMassNumber]),
      bonds: labState.bonds.map(({ a, b, order }) => [a, b, order])
    });
    if (labState.compoundMeta.structureFingerprint && labState.compoundMeta.structureFingerprint !== fingerprint) labState.compoundMeta = null;
    else labState.compoundMeta.structureFingerprint = fingerprint;
  }
  labState.lastAnalysis = analyzeMolecule();
  render();
  renderAnalysis(labState.lastAnalysis);
  if (record) recordHistory();
}
