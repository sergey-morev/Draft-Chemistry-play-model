import { mergeExternalSubstanceRecords } from "./services/database.js";
import { physicsStep } from "./render/frame.js";
import { initWorkspace } from "./ui/workspace.js";
import { loadLocalDatabases } from "./services/database.js";
import { addBenzene } from "./simulation/fragments.js";
import { analyzeAndRender } from "./simulation/update.js";
import { bindControls, drawGrid } from "./ui/controls.js";
import { renderPeriodicTable, renderSelectedElement } from "./ui/elements.js";

export function init() {
  drawGrid();
  renderPeriodicTable();
  renderSelectedElement();
  bindControls();
  initWorkspace();
  addBenzene(500, 350);
  analyzeAndRender();
  loadLocalDatabases();
  requestAnimationFrame(physicsStep);
}

mergeExternalSubstanceRecords();
init();
