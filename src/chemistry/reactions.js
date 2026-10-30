import { playElementSound } from "../audio/sound.js";
import { analyzeMolecule } from "./analysis.js";
import { formatCoefficient } from "./formula.js";
import { bondOrderValue, isHydrogenLike, neighborsOf } from "./properties.js";
import { isotopeSymbols } from "../data/elements.js";
import { centerMolecule, freeCenterPoint } from "../render/camera.js";
import { findSixCarbonRing } from "../simulation/fragments.js";
import { componentAtoms, connects, findBondByOrder, getAtom, getElement, isDonorAtom, isMetalAtom, molecularComponents, moveComponentToward, pickComponentsForCombination } from "../simulation/graph.js";
import { addAtom, addAtomAttached, createOrUpdateBond, weakenOrRemoveBond } from "../simulation/molecule.js";
import { state as labState } from "../state.js";
import { catalystAdvice, catalystLabel } from "../ui/controls.js";
import { buildStabilizationSuggestions } from "../ui/inspector.js";
import { reactionResult } from "../ui/journal.js";
import { stabilityText } from "../utils/format.js";

export function hydrogenateDoubleBond() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Hydrogenation not performed", "No C=C double bond was found.", {
    advice: ["Select a bond between two C atoms, set it to double, then try H2 + C=C again."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  addAtomAttached("H", atomA.id, angle + Math.PI * 0.72, 74);
  addAtomAttached("H", atomB.id, angle - Math.PI * 0.28, 74);
  labState.selectedAtomIds = [bond.a, bond.b];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Alkene hydrogenation", "The C=C bond became C-C, with H added to each C atom in this illustrative transformation.", {
    equation: "C=C + H2 -> C-C",
    uses: "Hydrogenation is used to saturate vegetable oils and convert alkenes to alkanes; this rule-based example omits real reaction conditions.",
    advice: ["If the model flags an overloaded atom, remove an extra H or lower an adjacent bond order.", "For a catalytic example, consider a Ni, Pd or Pt surface; the model does not simulate it."]
  });
}

export function brominateDoubleBond() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Bromination not performed", "No C=C double bond was found.", {
    advice: ["Build an alkene fragment with two C atoms joined by a double bond."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  addAtomAttached("Br", atomA.id, angle + Math.PI * 0.65, 92);
  addAtomAttached("Br", atomB.id, angle - Math.PI * 0.35, 92);
  labState.selectedAtomIds = [bond.a, bond.b];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Alkene bromination", "The C=C bond became C-C, with Br added to each C atom in this illustrative transformation.", {
    equation: "C=C + Br2 -> Br-C-C-Br",
    uses: "In a qualitative test for unsaturation, bromine water can lose its color; this model does not simulate that observation.",
    advice: ["If the heuristic score falls, check the valence shown for each C atom.", "Br is relatively heavy and polarizable; review the resulting C-Br bonds rather than inferring reactivity from this model."]
  });
}

export function hydrateAlkene() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Hydration not performed", "No C=C double bond was found.", {
    advice: ["Add a C=C bond, then apply H2O + C=C to create an alcohol fragment in the model."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  const o = addAtomAttached("O", atomA.id, angle + Math.PI * 0.65, 86);
  addAtomAttached("H", o.id, angle + Math.PI * 0.95, 62);
  addAtomAttached("H", atomB.id, angle - Math.PI * 0.35, 72);
  labState.selectedAtomIds = [atomA.id, atomB.id, o.id];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Alkene hydration", "OH and H were added across the C=C bond, producing an alcohol fragment in this illustrative transformation.", {
    equation: "C=C + H2O -> C-C(OH)",
    uses: "This rule-based example represents the formation of alcohols from alkenes, such as ethanol or isopropanol, without modeling industrial conditions.",
    advice: ["An OH group can increase polarity and hydrogen-bonding capacity.", "To compare a less polar fragment in the model, remove O-H or replace OH with H."]
  });
}

export function chlorinateBenzene() {
  const ring = findSixCarbonRing();
  if (!ring) return reactionResult(false, "Chlorination not performed", "No benzene ring was found.", {
    advice: ["Add the Benzene preset or build a six-membered C ring."]
  });
  const analysis = analyzeMolecule();
  const targetId = ring.find((id) => (analysis.atomMap.get(id)?.implicitH || 0) > 0) || ring[0];
  const target = getAtom(targetId);
  const center = ring.reduce((acc, id) => {
    const atom = getAtom(id);
    acc.x += atom.x / ring.length;
    acc.y += atom.y / ring.length;
    return acc;
  }, { x: 0, y: 0 });
  const angle = Math.atan2(target.y - center.y, target.x - center.x);
  const cl = addAtomAttached("Cl", targetId, angle, 98);
  labState.selectedAtomIds = [targetId, cl.id];
  labState.selectedBondId = null;
  return reactionResult(true, "Electrophilic chlorination of benzene", "One H on the benzene ring was replaced with Cl in this illustrative transformation.", {
    equation: "C6H6 + Cl2 -> C6H5Cl + HCl",
    uses: "Chlorobenzene derivatives can serve as intermediates in the synthesis of dyes, pesticides, polymers and medicinal compounds.",
    advice: ["A Cl substituent generally deactivates the ring toward further electrophilic substitution.", "Try a second substituent and compare the displayed heuristic score and polarity."]
  });
}

export function combustionPreview() {
  const analysis = analyzeMolecule();
  const counts = analysis.counts;
  const c = counts.C || 0;
  const h = (counts.H || 0) + (counts.D || 0) + (counts.T || 0);
  const o = counts.O || 0;
  if (!c && !h) return reactionResult(false, "Combustion preview unavailable", "The preview needs a fragment containing C or H.", {
    advice: ["Add methane, ethanol, benzene or another C/H-containing fragment."]
  });
  const water = h / 2;
  const oxygen = c + h / 4 - o / 2;
  const left = analysis.formula;
  const waterProduct = ((counts.D || 0) + (counts.T || 0)) > 0 ? "(H/D/T)2O" : "H2O";
  const equation = `${left} + ${formatCoefficient(oxygen)}O2 -> ${formatCoefficient(c)}CO2 + ${formatCoefficient(water)}${waterProduct}`;
  return reactionResult(true, "Complete-combustion equation preview", "The molecule was not changed; a rule-based complete-oxidation equation is shown.", {
    equation,
    uses: "Combustion equations can help discuss composition and oxidation products; this preview does not predict heat release or reaction feasibility.",
    advice: ["More C in the input formula produces more CO2 in this equation.", "More O in the input formula reduces the calculated O2 coefficient."]
  });
}

export function combineMoleculeFragments() {
  const components = molecularComponents(false).filter((component) => component.atomIds.length > 0);
  if (components.length < 2) {
    return reactionResult(false, "Two molecules required", "The workspace contains only one separate fragment.", {
      advice: ["Add a second fragment, such as NaCl and H2O, then press Connect."]
    });
  }
  const [first, second] = pickComponentsForCombination(components);
  moveComponentToward(first, second);

  const special = combineSaltAndWater(first, second) || combineSaltAndWater(second, first);
  if (special) return special;

  const generic = createGenericIntermolecularLink(first, second);
  if (!generic) {
    return reactionResult(false, "No matching pair", "The model found no suitable polar, ionic or donor-acceptor centers.", {
      advice: ["Select atoms from two fragments or add O, N, a halogen or a metal to explore an intermolecular interaction."]
    });
  }
  return generic;
}

export function nuclearConceptDemo() {
  const uraniumAtoms = labState.atoms.filter((atom) => atom.symbol === "U");
  if (!uraniumAtoms.length) {
    return reactionResult(false, "Illustrative nuclear demo not started", "Add a U atom or an illustrative uranium model, then press Illustrative nuclear demo.", {
      advice: ["This visualization does not model the parameters of a real nuclear chain reaction."]
    });
  }
  labState.selectedAtomIds = uraniumAtoms.slice(0, 3).map((atom) => atom.id);
  playElementSound(getElement("U"), "nuclear");
  return reactionResult(true, "Illustrative nuclear-chain concept", "An abstract visualization shows neutron pulses and ionization near U. It is neither a calculation nor an instruction.", {
    equation: "U + n -> excited nucleus -> fragments + n + energy (illustrative scheme)",
    uses: "Conceptual topics include nuclear fission, neutron multiplication, absorption, and the roles of a moderator or absorber.",
    advice: [
      "The model does not represent masses, geometry, enrichment, reflectors or operating conditions of a real chain reaction.",
      "B, Cd or H2O may be discussed as conceptual examples of neutron absorption or moderation; this is not an operating guide.",
      "Use U here to discuss radioactivity, isotopes and materials at a conceptual level only."
    ]
  });
}

export function combineSaltAndWater(saltComponent, waterComponent) {
  const na = componentAtoms(saltComponent).find((atom) => atom.symbol === "Na");
  const cl = componentAtoms(saltComponent).find((atom) => atom.symbol === "Cl");
  const waterO = componentAtoms(waterComponent).find((atom) => atom.symbol === "O" && neighborsOf(atom.id).some((id) => isHydrogenLike(getAtom(id)?.symbol)));
  const waterH = waterO ? neighborsOf(waterO.id).map(getAtom).find((atom) => atom && isHydrogenLike(atom.symbol)) : null;
  if (!na || !cl || !waterO || !waterH) return null;

  na.charge = 1;
  cl.charge = -1;
  const saltBond = labState.bonds.find((bond) => connects(bond, na.id, cl.id));
  if (saltBond) saltBond.order = "ionic";
  createOrUpdateBond(na.id, waterO.id, "solvation");
  createOrUpdateBond(cl.id, waterH.id, "hbond");
  labState.selectedAtomIds = [na.id, cl.id, waterO.id, waterH.id];
  labState.selectedBondId = null;

  return reactionResult(true, "NaCl dissolution and hydration", "This sketch does not make NaCl a covalent molecule; water separates and hydrates Na+ and Cl− ions.", {
    equation: "NaCl(s) + H2O(l) -> Na+(aq) + Cl-(aq); ΔH(soln) ≈ +3.9 kJ/mol",
    uses: "This illustrative dissolution sketch relates ionic lattice energy to hydration by polar water molecules; it does not calculate their balance.",
    advice: [
      "Process type: dissolution and dissociation, not an ordinary substitution reaction.",
      "Energy: the listed ΔH(soln) for NaCl is about +3.9 kJ/mol; this model does not calculate it.",
      "Example conditions: liquid water, about 20-25 °C and 1 atm, with an unsaturated solution and stirring.",
      "Parameters to discuss: water's high dielectric permittivity and Na+···O and Cl−···H ion-dipole interactions.",
      "The example suggests slight temperature sensitivity for weakly endothermic dissolution; this sketch does not predict solubility.",
      "Dotted links depict solvation, not new covalent bonds."
    ]
  });
}

export function createGenericIntermolecularLink(first, second) {
  const atomsA = componentAtoms(first);
  const atomsB = componentAtoms(second);
  const metalA = atomsA.find(isMetalAtom);
  const donorB = atomsB.find(isDonorAtom);
  const donorA = atomsA.find(isDonorAtom);
  const metalB = atomsB.find(isMetalAtom);
  const positiveA = atomsA.find((atom) => atom.charge > 0);
  const negativeB = atomsB.find((atom) => atom.charge < 0);
  const positiveB = atomsB.find((atom) => atom.charge > 0);
  const negativeA = atomsA.find((atom) => atom.charge < 0);
  const hDonorA = atomsA.find((atom) => isHydrogenLike(atom.symbol));
  const acceptorB = atomsB.find(isDonorAtom);
  const hDonorB = atomsB.find((atom) => isHydrogenLike(atom.symbol));
  const acceptorA = atomsA.find(isDonorAtom);

  if (metalA && donorB) return linkComponents(metalA, donorB, "coordination", "Coordination interaction", "M + :L -> M<-L; ΔG depends on ligand and pH", "a modeled metal-ligand donor-acceptor link");
  if (metalB && donorA) return linkComponents(metalB, donorA, "coordination", "Coordination interaction", "M + :L -> M<-L; ΔG depends on ligand and pH", "a modeled metal-ligand donor-acceptor link");
  if (positiveA && negativeB) return linkComponents(positiveA, negativeB, "ionic", "Ionic association", "A+ + B- -> A+···B-; interaction energy is often negative (conditions matter)", "an electrostatic ion pair in the model");
  if (positiveB && negativeA) return linkComponents(positiveB, negativeA, "ionic", "Ionic association", "A+ + B- -> A+···B-; interaction energy is often negative (conditions matter)", "an electrostatic ion pair in the model");
  if (hDonorA && acceptorB) return linkComponents(hDonorA, acceptorB, "hbond", "Hydrogen-bond interaction", "X-H + :Y -> X-H···Y; ~5-30 kJ/mol (illustrative range)", "a modeled intermolecular hydrogen bond");
  if (hDonorB && acceptorA) return linkComponents(hDonorB, acceptorA, "hbond", "Hydrogen-bond interaction", "X-H + :Y -> X-H···Y; ~5-30 kJ/mol (illustrative range)", "a modeled intermolecular hydrogen bond");
  return null;
}

export function linkComponents(a, b, order, title, equation, interactionText) {
  createOrUpdateBond(a.id, b.id, order);
  labState.selectedAtomIds = [a.id, b.id];
  labState.selectedBondId = null;
  const params = interactionParameters(order);
  return reactionResult(true, title, `Modeled interaction ${a.symbol}${a.id}···${b.symbol}${b.id}: ${interactionText}.`, {
    equation,
    uses: "This is a model of a weak or coordination interaction between two fragments; it does not establish a new covalent molecule or a stable complex.",
    advice: [
      `Illustrative energy range: ${params.energy}.`,
      `Example temperature: ${params.temperature}.`,
      `Example medium: ${params.medium}.`,
      `Parameters to discuss: ${params.parameters}.`
    ]
  });
}

export function interactionParameters(order) {
  if (order === "hbond") return {
    energy: "about 5-30 kJ/mol; illustrative, not calculated here",
    temperature: "often more evident at room temperature or below",
    medium: "a polar medium or a pure substance with O/N/F-H groups",
    parameters: "an H donor, a lone-pair acceptor and a suggested distance of 1.5-2.5 Å"
  };
  if (order === "coordination") return {
    energy: "about 40-200 kJ/mol as an illustrative range; depends on metal and ligand",
    temperature: "often 20-80 °C in solution in this example",
    medium: "water, alcohol or buffer; pH and competing ligands matter",
    parameters: "metal acceptor site, O/N/S donor and suitable geometry"
  };
  if (order === "ionic") return {
    energy: "Coulomb attraction can be tens of kJ/mol in water; not calculated here",
    temperature: "often 20-25 °C in this example; depends on solubility",
    medium: "a polar solvent with high dielectric permittivity",
    parameters: "ion charge, ionic strength, concentration and solvation"
  };
  return {
    energy: "about 1-20 kJ/mol as an illustrative range",
    temperature: "about 20-25 °C",
    medium: "a suitable solvent",
    parameters: "polarity, concentration and distance between centers"
  };
}

export function reactAllPossible() {
  const operations = [];
  const catalyst = labState.activeCatalyst;
  let guard = 0;

  if (["ni", "pd", "pt"].includes(catalyst)) {
    while (findBondByOrder(2, "C", "C") && guard++ < 24) {
      const result = hydrogenateDoubleBond();
      if (!result.success) break;
      operations.push("C=C + H2 -> C-C");
    }
  } else if (catalyst === "acid") {
    while (findBondByOrder(2, "C", "C") && guard++ < 18) {
      const result = hydrateAlkene();
      if (!result.success) break;
      operations.push("C=C + H2O -> C-C(OH)");
    }
  } else if (catalyst === "brhv") {
    while (findBondByOrder(2, "C", "C") && guard++ < 18) {
      const result = brominateDoubleBond();
      if (!result.success) break;
      operations.push("C=C + Br2 -> Br-C-C-Br");
    }
  } else if (catalyst === "fecl3") {
    const result = chlorinateBenzene();
    if (result.success) operations.push("C6H6 + Cl2 -> C6H5Cl + HCl");
  } else {
    for (let i = 0; i < 10; i++) {
      const action = autoStabilizeStep();
      if (!action) break;
      operations.push(action);
    }
    if (!operations.length && findBondByOrder(2, "C", "C")) {
      const result = brominateDoubleBond();
      if (result.success) operations.push("C=C + Br2 -> Br-C-C-Br");
    }
  }

  if (!operations.length) {
    for (let i = 0; i < 8; i++) {
      const action = autoStabilizeStep();
      if (!action) break;
      operations.push(action);
    }
  }

  const after = analyzeMolecule();
  if (!operations.length) {
    return reactionResult(false, "Sandbox: no matching transformation", "No rule matches the current molecule and selected catalyst.", {
      equation: `Catalyst: ${catalystLabel()}`,
      uses: "Choose a catalyst for the fragment: Ni/Pd/Pt for C=C, H+ for hydration, or FeCl3 for benzene in this rule-based demo.",
      advice: [catalystAdvice(), ...buildStabilizationSuggestions(after).map((item) => item.text).slice(0, 2)]
    });
  }

  return reactionResult(true, "Sandbox: rule-based transformations", `${operations.length} operation(s) applied. Catalyst: ${catalystLabel()}.`, {
    equation: operations.slice(0, 4).join("; ") + (operations.length > 4 ? "; ..." : ""),
    uses: "This teaching demo finds matching fragments and applies simple rules at the sites it identifies; it does not predict a real reaction outcome.",
    advice: [`After transformation: heuristic score ${stabilityText(after.score)} ${after.score}%.`, ...buildStabilizationSuggestions(after).map((item) => item.text).slice(0, 3)]
  });
}

export function autoStabilizeStep() {
  const analysis = analyzeMolecule();
  const reports = [...analysis.atomMap.values()];
  const over = reports.find((report) => report.usage > Math.max(...report.allowedValences) + 0.05);
  if (over) {
    const connected = labState.bonds
      .filter((bond) => bond.a === over.atom.id || bond.b === over.atom.id)
      .sort((a, b) => bondOrderValue(b.order) - bondOrderValue(a.order))[0];
    if (connected) {
      const a = getAtom(connected.a);
      const b = getAtom(connected.b);
      weakenOrRemoveBond(connected.id);
      return `${a?.symbol || "?"}-${b?.symbol || "?"}: bond order lowered to address an overloaded atom`;
    }
  }

  const charged = labState.atoms.find((atom) => atom.charge !== 0);
  if (charged) {
    charged.charge += charged.charge > 0 ? -1 : 1;
    return `${charged.symbol}${charged.id}: formal charge moved toward 0`;
  }

  const under = reports.find((report) => report.state === "warn" && report.implicitH === 0 && !isHydrogenLike(report.atom.symbol));
  if (under) {
    addAtomAttached("H", under.atom.id, nextAttachmentAngle(under.atom.id), 72);
    return `${under.atom.symbol}${under.atom.id}: H added at an available valence`;
  }

  if (analysis.strainEnergy > 12) {
    centerMolecule(false);
    labState.atoms.forEach((atom) => {
      atom.vx = 0;
      atom.vy = 0;
    });
    return "graph layout centered to reduce the displayed strain estimate";
  }

  return null;
}

export function addHeavyWaterProcess() {
  const point = freeCenterPoint();
  const o = addAtom("O", point.x, point.y);
  const d1 = addAtom("D", point.x - 68, point.y + 36);
  const d2 = addAtom("D", point.x + 68, point.y + 36);
  createOrUpdateBond(o.id, d1.id, 1);
  createOrUpdateBond(o.id, d2.id, 1);
  labState.selectedAtomIds = [o.id, d1.id, d2.id];
  labState.selectedBondId = null;
  return reactionResult(true, "Heavy water added", "A D2O model was created: water with deuterium in place of ordinary H.", {
    equation: "2D + O -> D2O",
    uses: "D2O is used as an isotope-labeled substance and a spectroscopy solvent; here it illustrates isotope substitution.",
    advice: ["D has similar chemistry to H but nearly twice its atomic mass.", "Compare the displayed mass and formula of H2O and D2O in the Compound panel."]
  });
}

export function enrichHydrogenIsotope(targetSymbol, ratio) {
  const target = getElement(targetSymbol);
  const selectedPool = labState.selectedAtomIds.map(getAtom).filter((atom) => atom && isHydrogenLike(atom.symbol));
  const explicitPool = labState.atoms.filter((atom) => atom.symbol === "H");
  const pool = selectedPool.length ? selectedPool : explicitPool;

  if (!pool.length) {
    const created = materializeImplicitIsotope(targetSymbol);
    if (!created) {
      return reactionResult(false, `${target.name}: isotope substitution not performed`, "No explicit H or available implicit H was found for substitution.", {
        advice: ["Add methane, water or ethanol, or select a C, N or O atom with an implicit H."]
      });
    }
    labState.selectedAtomIds = [created.id];
    labState.selectedBondId = null;
    return reactionResult(true, `${target.name}: isotope substitution`, `An implicit H was represented explicitly as ${targetSymbol}.`, isotopeDetails(targetSymbol, true));
  }

  const changeCount = Math.max(1, Math.ceil(pool.length * ratio));
  pool.slice(0, changeCount).forEach((atom) => {
    atom.symbol = targetSymbol;
    atom.vx = 0;
    atom.vy = 0;
  });
  labState.selectedAtomIds = pool.slice(0, changeCount).map((atom) => atom.id);
  labState.selectedBondId = null;
  return reactionResult(true, `${target.name}: isotope substitution`, `${changeCount} hydrogen atom(s) replaced with ${targetSymbol} in the model.`, isotopeDetails(targetSymbol, false));
}

export function resetHydrogenIsotopes() {
  const selectedPool = labState.selectedAtomIds.map(getAtom).filter((atom) => atom && isotopeSymbols.has(atom.symbol));
  const pool = selectedPool.length ? selectedPool : labState.atoms.filter((atom) => isotopeSymbols.has(atom.symbol));
  if (!pool.length) {
    return reactionResult(false, "Reset to H not performed", "The molecule contains no D or T.", {
      advice: ["First add D2O, substitute D for H, or add a T label."]
    });
  }
  pool.forEach((atom) => {
    atom.symbol = "H";
    atom.vx = 0;
    atom.vy = 0;
  });
  labState.selectedAtomIds = pool.map((atom) => atom.id);
  labState.selectedBondId = null;
  return reactionResult(true, "Isotopes reset to H", `${pool.length} D/T atom(s) replaced with ordinary H in the model.`, {
    equation: "D/T -> H",
    uses: "In the model, this lets you compare ordinary and isotope-labeled versions of a molecule.",
    advice: ["A lower displayed mass reflects the isotope substitution in this model.", "You can apply D↑ or T* again to selected atoms only."]
  });
}

export function isotopeDetails(targetSymbol, materialized) {
  if (targetSymbol === "D") {
    return {
      equation: materialized ? "R-H -> R-D" : "R-H + D -> R-D + H",
      uses: "Deuterium labeling is used in studies of reaction mechanisms and spectral changes; this tool only substitutes an isotope in the model.",
      advice: ["D has the same modeled valence as H but increases the displayed molecular mass.", "To label more positions, select several H atoms and press D↑ again."]
    };
  }
  return {
    equation: materialized ? "R-H -> R-T" : "R-H + T -> R-T + H",
    uses: "Tritium labeling illustrates tracer concepts; real T is radioactive and requires strict controls.",
    advice: ["T has the same modeled valence as H but increases the displayed mass.", "Use T* to label a selected position and H↺ to reset it."]
  };
}

export function materializeImplicitIsotope(symbol) {
  const analysis = analyzeMolecule();
  const selectedSet = new Set(labState.selectedAtomIds);
  const reports = [...analysis.atomMap.values()];
  const report = reports.find((item) => selectedSet.has(item.atom.id) && item.implicitH > 0)
    || reports.find((item) => item.implicitH > 0);
  if (!report) return null;
  return addAtomAttached(symbol, report.atom.id, nextAttachmentAngle(report.atom.id), symbol === "T" ? 78 : 76);
}

export function nextAttachmentAngle(atomId) {
  const atom = getAtom(atomId);
  const neighbors = neighborsOf(atomId).map(getAtom).filter(Boolean);
  if (!atom || !neighbors.length) return -Math.PI / 2;
  const angles = neighbors.map((neighbor) => Math.atan2(neighbor.y - atom.y, neighbor.x - atom.x)).sort((a, b) => a - b);
  let bestAngle = angles[0] + Math.PI;
  let bestGap = 0;
  for (let i = 0; i < angles.length; i++) {
    const current = angles[i];
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? Math.PI * 2 : 0);
    const gap = next - current;
    if (gap > bestGap) {
      bestGap = gap;
      bestAngle = current + gap / 2;
    }
  }
  return bestAngle;
}
