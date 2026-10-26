import { state as labState } from "../state.js";
import { applyPhysics } from "../simulation/step.js";
import { analyzeAndRender } from "../simulation/update.js";

export function physicsStep() {
  if (labState.physicsRunning && labState.atoms.length && !labState.dragState) {
    applyPhysics();
    analyzeAndRender(false);
  }
  requestAnimationFrame(physicsStep);
}
