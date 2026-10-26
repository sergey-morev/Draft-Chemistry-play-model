import { state as labState } from "../state.js";
import { relaxStep } from "../physics/spring-layout.js";
import { desiredBondLength, bondOrderValue } from "../chemistry/properties.js";

export function applyPhysics() {
  relaxStep(labState.atoms, labState.bonds, { targetLength: desiredBondLength, bondWeight: bondOrderValue });
}
