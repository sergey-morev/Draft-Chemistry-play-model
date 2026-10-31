import { actinides, alkali, alkaline, atomicNumbers, halogens, lanthanides, metalloids, nobles, postMetals, transitionSymbols } from "../data/elements.js";
import { getElement } from "../simulation/graph.js";

export function inferCategory(symbol) {
  if (lanthanides.has(symbol)) return "lanthanide";
  if (actinides.has(symbol)) return "actinide";
  if (transitionSymbols.has(symbol)) return "transition";
  if (alkali.has(symbol)) return "alkali";
  if (alkaline.has(symbol)) return "alkaline";
  if (halogens.has(symbol)) return "halogen";
  if (nobles.has(symbol)) return "noble";
  if (metalloids.has(symbol)) return "metalloid";
  if (postMetals.has(symbol)) return "post";
  return "nonmetal";
}

export function inferValences(symbol, group, category) {
  if (category === "noble") return [0];
  if (category === "alkali") return [1];
  if (category === "alkaline") return [2];
  if (category === "halogen") return [1, 3, 5, 7];
  if (category === "transition") return [2, 3];
  if (category === "lanthanide" || category === "actinide") return [3];
  if (group === 13) return [3];
  if (group === 14) return [4];
  if (group === 15) return [3, 5];
  if (group === 16) return [2, 4, 6];
  return [1];
}

export function inferElectronegativity(group, category) {
  if (category === "noble") return null;
  if (category === "alkali") return 0.9;
  if (category === "alkaline") return 1.2;
  if (category === "halogen") return 3.0;
  if (category === "transition") return 1.8;
  if (group >= 13) return 1.6 + (group - 13) * 0.22;
  return 1.6;
}

export function inferRadius(group, period, category) {
  const base = category === "transition" ? 132 : category === "halogen" ? 110 : category === "noble" ? 100 : 118;
  return Math.max(45, base + period * 7 - group * 2);
}

export function elementBrief(element) {
  if (element.brief) return element.brief;
  if (element.symbol === "D") return "Hydrogen isotope: greater mass; model valence 1.";
  if (element.symbol === "T") return "Radioactive hydrogen isotope; shown here as an illustrative label.";
  if (element.symbol === "U") return "Actinide: U-238 by default; A− can display U-235 in this model.";
  if (element.symbol === "C") return "Forms the backbone and rings of many organic structures.";
  if (element.symbol === "O") return "Appears in water, alcohols and oxides, and can affect bond polarity.";
  if (element.symbol === "N") return "Appears in amines and other nitrogen-containing structures; charge can vary.";
  if (element.symbol === "S") return "Can appear in examples analogous to oxygen; it is larger and more polarizable.";
  if (element.category === "halogen") return "Halogen: often forms one bond; used as a substituent in examples.";
  if (element.category === "noble") return "Noble gas: bonding generally triggers a valence warning in this model.";
  if (element.category === "transition") return "Transition metal: can have multiple oxidation states.";
  if (element.category === "alkali") return "Alkali metal: readily forms a positive ion in many compounds.";
  if (element.category === "alkaline") return "Alkaline-earth metal: commonly has oxidation state +2.";
  return "The model lets you adjust valence and the displayed isotope mass.";
}

export function elementProfile(element) {
  if (isRadioactiveElement(element.symbol)) return { kind: "radioactive", label: "radioactivity (illustrative)", color: "#7d3cff" };
  const phase = elementPhase(element.symbol);
  if (phase === "gas") return { kind: "gas", label: "gas", color: "#2e9bff" };
  if (phase === "liquid") return { kind: "liquid", label: "liquid", color: "#12a6a6" };
  if (isMetalElement(element)) return { kind: "metal", label: "metal", color: "#d18d00" };
  return { kind: "solid", label: "nonmetal/solid", color: "#6f7782" };
}

export function elementPhase(symbol) {
  if (["H", "N", "O", "F", "Cl", "He", "Ne", "Ar", "Kr", "Xe", "Rn"].includes(symbol)) return "gas";
  if (["Br", "Hg"].includes(symbol)) return "liquid";
  return "solid";
}

export function isMetalElement(element) {
  return ["alkali", "alkaline", "transition", "post", "lanthanide", "actinide"].includes(element.category);
}

export function isRadioactiveElement(symbol) {
  const z = atomicNumbers.get(symbol) || getElement(symbol).z || 0;
  return z >= 84 || ["Tc", "Pm", "U", "Th", "Pa", "Ra", "Rn"].includes(symbol);
}

export function elementStateDescription(element) {
  const profile = elementProfile(element);
  const phaseText = elementPhase(element.symbol) === "gas" ? "gas at ambient conditions" : elementPhase(element.symbol) === "liquid" ? "liquid at ambient conditions" : "generally a solid at ambient conditions";
  const metalText = isMetalElement(element) ? "metallic character: topics include conductivity, cations and possible coordination bonds" : "nonmetallic/covalent character: valence and electronegativity are relevant";
  const radio = isRadioactiveElement(element.symbol) ? " Radioactivity is represented only by a visual ionization effect, without practical nuclear parameters." : "";
  return `${phaseText}; ${metalText}; model effect: ${profile.label}.${radio}`;
}

export function elementStudyUse(element) {
  if (isRadioactiveElement(element.symbol)) return "Study topics: isotopes, radioactivity and illustrative ionization effects; no practical nuclear parameters are provided.";
  if (isMetalElement(element)) return "Study topics: metallic bonding, ions, oxides, salts, coordination complexes and catalysis.";
  if (elementPhase(element.symbol) === "gas") return "Study topics: gases, pressure, solubility, oxidation and reduction.";
  if (elementPhase(element.symbol) === "liquid") return "Study topics: volatility, polarizability, solutions and liquid-phase interactions.";
  return "Study topics: covalent bonds, valence, functional groups and molecular geometry.";
}

export function elementStudyTips(element) {
  if (element.symbol === "U") return [
    "Open the U demo for an illustrative view of neutrons and ionization.",
    "Do not use this model as an instruction: enrichment and real chain-reaction conditions are intentionally omitted.",
    "Compare U-238 and U-235 with A± as an isotope concept, not a practical calculation."
  ];
  if (isRadioactiveElement(element.symbol)) return ["Treat the ionization effect as a concept illustration.", "Do not apply model parameters to real substances."];
  if (isMetalElement(element)) return ["Try combining this element with O, Cl or S.", "Explore +1/+2/+3 charges and coordination bonds in the model.", "Compare a modeled oxide and salt of this metal."];
  if (elementPhase(element.symbol) === "gas") return ["Try building H2O, CO2 or HCl.", "Consider pressure and volatility as physical properties."];
  if (elementPhase(element.symbol) === "liquid") return ["Explore interactions with double bonds or metals.", "Consider polarizability and weak interactions."];
  return ["Build a molecule and inspect its valence warnings.", "Add O, N, S or a halogen to explore functional groups."];
}
